// Prueba: ¿un modelo local compara bien una oferta con mis CV?
// Uso:  npx tsx scripts/try-model.ts data/jds/intellias.txt
// Otro modelo:  MODEL=llama3.1:8b npx tsx scripts/try-model.ts data/jds/intellias.txt

import * as fs from "fs";

const MODEL = process.env.MODEL ?? "qwen3:8b";
const RESUMES = ["backend", "fullstack", "ai"];

// La forma exacta que le exigimos al modelo en la respuesta.
const schema = {
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
Do not say the candidate has a skill that is not written in the resume.`;

interface Requirement {
  text: string;
  kind: "required" | "preferred";
  jd_quote: string;
  match: "yes" | "partial" | "no";
  cv_quote: string;
}

async function ask(jd: string, cv: string): Promise<Requirement[]> {
  const res = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      think: false,
      format: schema,
      options: { temperature: 0, num_ctx: 8192 },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `JOB DESCRIPTION:\n${jd}\n\nRESUME:\n${cv}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama respondió ${res.status}: ${await res.text()}`);

  const data = await res.json();
  try {
    return JSON.parse(data.message.content).requirements;
  } catch {
    throw new Error("El modelo no devolvió JSON válido:\n" + data.message?.content);
  }
}

// Para comparar citas sin que importen mayúsculas ni saltos de línea.
const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

// Porcentaje: obligatorios pesan 2, deseables 1. yes = 1, partial = 0.5, no = 0.
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

async function main() {
  const jdPath = process.argv[2];
  if (!jdPath) throw new Error("Falta la oferta: npx tsx scripts/try-model.ts data/jds/oferta.txt");
  const jd = fs.readFileSync(jdPath, "utf-8");

  console.log(`Modelo: ${MODEL}\nOferta: ${jdPath}\n`);

  const results: { name: string; reqs: Requirement[]; pct: number | null }[] = [];

  for (const name of RESUMES) {
    const cv = fs.readFileSync(`data/resumes/${name}.txt`, "utf-8");
    const started = Date.now();
    const reqs = await ask(jd, cv);
    const seconds = Math.round((Date.now() - started) / 1000);

    // Comprobación anti-invento: la cita de la oferta debe existir de verdad.
    const jdNorm = normalize(jd);
    const cvNorm = normalize(cv);
    const badJd = reqs.filter((r) => !jdNorm.includes(normalize(r.jd_quote))).length;
    const badCv = reqs.filter(
      (r) => r.match !== "no" && !cvNorm.includes(normalize(r.cv_quote))
    ).length;

    const pct = score(reqs);
    results.push({ name, reqs, pct });
    console.log(
      `${name.padEnd(10)} ${pct ?? "?"}%  (${reqs.length} requisitos, ${seconds}s, citas de la oferta no encontradas: ${badJd}, citas del CV no encontradas: ${badCv})`
    );
  }

  const best = results.reduce((a, b) => ((b.pct ?? -1) > (a.pct ?? -1) ? b : a));
  console.log(`\nMejor CV para esta oferta: ${best.name}\n`);
  for (const r of best.reqs) {
    console.log(`[${r.kind === "required" ? "oblig." : "desea."}] ${r.match.padEnd(7)} ${r.text}`);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});