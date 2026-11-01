// Prueba: ¿un modelo por API compara bien una oferta con mis CV?
// Uso:  npx tsx scripts/try-api.ts data/jds/intellias.txt
// Necesita en .env.local:  ANTHROPIC_API_KEY=...
// Otro modelo:  MODEL=claude-sonnet-5-5 npx tsx scripts/try-api.ts data/jds/sii.txt

import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MODEL = process.env.MODEL ?? "claude-haiku-5-5";
const BASE_URL = process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com";
const RESUMES = ["backend", "fullstack", "ai"];

// La herramienta que el modelo está obligado a usar: su "formulario" de respuesta.
const tool = {
  name: "report_requirements",
  description: "Report the requirements of the job and whether the resume covers them.",
  input_schema: {
    type: "object",
    properties: {
      requirements: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: { type: "string" },
            kind: { type: "string", enum: ["required", "preferred"] },
            jd_quote: { type: "string" },
            match: { type: "string", enum: ["yes", "partial", "no"] },
            cv_quote: { type: "string" },
          },
          required: ["text", "kind", "jd_quote", "match", "cv_quote"],
        },
      },
    },
    required: ["requirements"],
  },
};

const SYSTEM = `You compare a job description with a candidate's resume.
List the concrete requirements of the job (skills, technologies, years of experience, languages, location rules).
For each requirement:
- text: the requirement in a few words.
- kind: "required" or "preferred" (nice to have, bonus, valued).
- jd_quote: copy the exact words from the job description that state it.
- match: "yes" if the resume clearly shows it, "partial" if only close or related, "no" if it is not in the resume.
- cv_quote: copy the exact words from the resume that show it. Empty string if match is "no".
Do not invent requirements that are not in the job description.
Do not say the candidate has a skill that is not written in the resume.
If the resume does not mention a technology, the answer is "no", even if the candidate probably knows it.`;

interface Requirement {
  text: string;
  kind: "required" | "preferred";
  jd_quote: string;
  match: "yes" | "partial" | "no";
  cv_quote: string;
}

async function ask(jd: string, cv: string): Promise<Requirement[]> {
  const res = await fetch(`${BASE_URL}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      // El CV va primero y la oferta después: el CV se repite en cada llamada.
      messages: [
        { role: "user", content: `RESUME:\n${cv}\n\nJOB DESCRIPTION:\n${jd}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`La API respondió ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const block = data.content?.find((b: { type: string }) => b.type === "tool_use");
  if (!block) throw new Error("El modelo no devolvió la herramienta:\n" + JSON.stringify(data));
  return block.input.requirements;
}

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

// Obligatorios pesan 2, deseables 1. yes = 1 punto, partial = 0.5, no = 0.
function score(reqs: Requirement[]): number | null {
  let got = 0;
  let total = 0;
  for (const r of reqs) {
    const weight = r.kind === "required" ? 2 : 1;
    const points = r.match === "yes" ? 1 : r.match === "partial" ? 0.5 : 0;
    got += weight * points;
    total += weight;
  }
  return total === 0 ? null : Math.round((got / total) * 100);
}

// Regla anti-invento, aplicada por código y no por el modelo:
// - si la cita de la oferta no existe, el requisito no cuenta (no podemos fiarnos de él);
// - si dice que lo cumples pero la cita de tu CV no existe, pasa a "no".
function verify(reqs: Requirement[], jd: string, cv: string) {
  const jdNorm = normalize(jd);
  const cvNorm = normalize(cv);
  const kept: Requirement[] = [];
  let droppedJd = 0;
  let downgradedCv = 0;

  for (const r of reqs) {
    if (!jdNorm.includes(normalize(r.jd_quote))) {
      droppedJd++;
      continue;
    }
    if (r.match !== "no" && !cvNorm.includes(normalize(r.cv_quote))) {
      downgradedCv++;
      kept.push({ ...r, match: "no" });
      continue;
    }
    kept.push(r);
  }
  return { kept, droppedJd, downgradedCv };
}

async function main() {
  const jdPath = process.argv[2];
  if (!jdPath) throw new Error("Falta la oferta: npx tsx scripts/try-api.ts data/jds/oferta.txt");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Falta ANTHROPIC_API_KEY en .env.local");
  const jd = fs.readFileSync(jdPath, "utf-8");

  console.log(`Modelo: ${MODEL}\nOferta: ${jdPath}\n`);

  const results = await Promise.all(
    RESUMES.map(async (name) => {
      const cv = fs.readFileSync(`data/resumes/${name}.txt`, "utf-8");
      const started = Date.now();
      const raw = await ask(jd, cv);
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      const { kept, droppedJd, downgradedCv } = verify(raw, jd, cv);
      return { name, kept, pct: score(kept), raw: score(raw), seconds, droppedJd, downgradedCv, total: raw.length };
    })
  );

  for (const r of results) {
    console.log(
      `${r.name.padEnd(10)} ${r.pct ?? "?"}%  (sin verificar eran ${r.raw ?? "?"}%; ${r.total} requisitos, ${r.seconds}s; ` +
        `descartados por cita de oferta falsa: ${r.droppedJd}; pasados a "no" por cita de CV falsa: ${r.downgradedCv})`
    );
  }

  const best = results.reduce((a, b) => ((b.pct ?? -1) > (a.pct ?? -1) ? b : a));
  console.log(`\nMejor CV para esta oferta: ${best.name}\n`);
  for (const r of best.kept) {
    console.log(`[${r.kind === "required" ? "oblig." : "desea."}] ${r.match.padEnd(7)} ${r.text}`);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});