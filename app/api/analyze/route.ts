// POST /api/analyze  { text: string, force?: boolean }
// Si ya apliqué a una empresa que sale en el texto, avisa antes de analizar (salvo force).
// Analiza la oferta pegada, la guarda y devuelve el resultado.
import { eq, sql } from "drizzle-orm";
import { db } from "@/app/src/db";
import { applications, resumes, settings, skills, offers, offerRequirements } from "@/app/src/db/schema";
import { analyzeOffer, extractCompany } from "@/app/src/analyze";
import { findPrevious, findPreviousByCompany } from "@/app/src/previous";

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "Falta ANTHROPIC_API_KEY" }, { status: 500 });

  const { text, force } = (await req.json()) as { text?: string; force?: boolean };
  if (!text || text.trim().length < 200) {
    return Response.json({ error: "El texto es demasiado corto para ser una oferta" }, { status: 400 });
  }

  if (!force) {
    const rows = await db
      .select({
        company: applications.company,
        position: applications.position,
        status: applications.status,
        dateApplied: applications.dateApplied,
      })
      .from(applications);
    // Primero averiguo qué empresa anuncia la oferta y comparo solo ese nombre.
    // Si la detección falla, busco los nombres en todo el texto (puede dar falsos avisos).
    let duplicate;
    try {
      const company = await extractCompany(text, apiKey);
      duplicate = company ? findPreviousByCompany(company, rows) : findPrevious(text, rows);
    } catch {
      duplicate = findPrevious(text, rows);
    }
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
      company: analysis.offer.company || "(sin empresa)",
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
  for (const r of top.requirements) {
    let skillId: number | null = null;
    if (r.skill) {
      const found = await db.select().from(skills).where(sql`lower(${skills.name}) = ${r.skill.toLowerCase()}`);
      if (found.length > 0) skillId = found[0].id;
      else {
        const [created] = await db.insert(skills).values({ name: r.skill }).returning({ id: skills.id });
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

  return Response.json({ offerId: offer.id, ...analysis });
}