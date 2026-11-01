// POST /api/analyze  { text: string, force?: boolean }
// Detecta la empresa (si no la encuentra, no guarda nada) y avisa si ya apliqué a ella (salvo force).
// Analiza la oferta pegada, la guarda y devuelve el resultado.
import { eq, sql } from "drizzle-orm";
import { db } from "@/app/src/db";
import { applications, resumes, settings, skills, offers, offerRequirements } from "@/app/src/db/schema";
import { analyzeOffer, extractCompany, decide } from "@/app/src/analyze";
import { findPreviousByCompany } from "@/app/src/previous";

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "Falta ANTHROPIC_API_KEY" }, { status: 500 });

  const { text, force } = (await req.json()) as { text?: string; force?: boolean };
  if (!text || text.trim().length < 200) {
    return Response.json({ error: "El texto es demasiado corto para ser una oferta" }, { status: 400 });
  }

  // 1. Sin empresa no se analiza ni se guarda nada.
  let company: string;
  try {
    company = (await extractCompany(text, apiKey)).trim();
  } catch (e) {
    return Response.json({ error: `No pude detectar la empresa: ${(e as Error).message}` }, { status: 502 });
  }
  if (!company) {
    return Response.json(
      { error: "No he detectado la empresa de esta oferta, así que no la guardo. Pega también la parte de arriba (donde sale el nombre de la empresa) y vuelve a intentarlo." },
      { status: 422 }
    );
  }

  // 2. ¿Ya he aplicado a esa empresa? Se avisa antes de analizar (salvo force).
  if (!force) {
    const rows = await db
      .select({
        company: applications.company,
        position: applications.position,
        status: applications.status,
        dateApplied: applications.dateApplied,
      })
      .from(applications);
    const duplicate = findPreviousByCompany(company, rows);
    if (duplicate.length > 0) return Response.json({ duplicate });
  }

  const cvs = await db.select().from(resumes);
  if (cvs.length === 0) return Response.json({ error: "No hay CVs en la base de datos" }, { status: 500 });
  const settingRows = await db.select().from(settings);
  const settingsMap = Object.fromEntries(settingRows.map((s) => [s.key, s.value]));

  let analysis;
  try {
    analysis = await analyzeOffer(text, cvs, settingsMap, apiKey);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }

  // El % de la oferta es el del mejor CV (el más alto), aunque no se recomiende ninguno.
  const top = analysis.results.reduce((a, b) => ((b.percent ?? -1) > (a.percent ?? -1) ? b : a));

  const [offer] = await db
    .insert(offers)
    .values({
      company, // la detectada arriba; nunca se guarda sin empresa
      title: analysis.offer.title || "(sin título)",
      location: analysis.offer.location || null,
      workMode: analysis.offer.work_mode === "unknown" ? null : analysis.offer.work_mode,
      fitPercent: top.percent,
      knockoutFailed: analysis.knockoutFailed,
      bestResumeId: analysis.bestResumeId,
      rawText: text,
    })
    .returning({ id: offers.id });

  // Los requisitos se guardan una vez (los del CV con mejor %); las tecnologías
  // nuevas se crean en skills sin nivel, para que las clasifiques luego.
  const rows = [];
  const gaps = new Set<string>();
  for (const r of top.requirements) {
    let skillId: number | null = null;
    if (typeof r.skill === "string" && r.skill.trim()) {
      const found = await db.select().from(skills).where(sql`lower(${skills.name}) = ${r.skill.trim().toLowerCase()}`);
      if (found.length > 0) {
        skillId = found[0].id;
        // Obligatoria, no la cumplo, y yo ya la tengo marcada como hueco.
        if (r.kind === "required" && r.match === "no" && !r.is_knockout && found[0].myLevel === "gap") {
          gaps.add(found[0].name);
        }
      } else {
        const [created] = await db.insert(skills).values({ name: r.skill.trim() }).returning({ id: skills.id });
        skillId = created.id;
      }
    }
    rows.push({
      offerId: offer.id,
      skillId,
      requirementText: r.text,
      kind: r.kind,
      isKnockout: r.is_knockout,
      match: r.match,
      jdQuote: r.jd_quote,
    });
  }
  if (rows.length > 0) await db.insert(offerRequirements).values(rows);

  const verdict = decide({ percent: top.percent, knockouts: analysis.knockouts, gaps: [...gaps] });

  return Response.json({ offerId: offer.id, verdict, ...analysis });
}