// Compara una oferta pegada con mis CVs.
// El modelo SOLO extrae requisitos y dice si los cumplo, citando textos.
// El porcentaje, la comprobación de citas y la recomendación de CV
// las calcula el código, no el modelo.

export type Kind = "required" | "preferred";
export type Match = "yes" | "partial" | "no" | "na";

export interface Requirement {
  text: string;
  skill: string; // nombre estándar de UNA tecnología ("Kubernetes"), o "" si no es una tecnología
  kind: Kind;
  is_knockout: boolean; // residencia, idioma, presencial... (no habilidades)
  jd_quote: string;
  match: Match;
  cv_quote: string;
}

export interface OfferInfo {
  company: string;
  title: string;
  location: string;
  work_mode: "remote" | "hybrid" | "onsite" | "unknown";
}

export interface ResumeInput {
  id: number;
  name: string;
  content: string;
}

export interface ResumeResult {
  id: number;
  name: string;
  percent: number | null;
  requirements: Requirement[];
  dropped: string[]; // requisitos descartados: la cita de la oferta no existe
  downgraded: string[]; // pasados a "no": la cita del CV no existe
}

export interface Analysis {
  offer: OfferInfo;
  results: ResumeResult[];
  bestResumeId: number | null; // null si ningún CV destaca claramente
  knockoutFailed: boolean;
  knockouts: Requirement[]; // los knock-out que fallan
}

// PROPUESTA MÍA (no viene de ningún documento): un CV solo se recomienda
// si saca al menos 10 puntos al segundo. Si no, da igual cuál mandes.
export const CLEAR_DIFFERENCE = 10;

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-5-5";

const tool = {
  name: "report_analysis",
  description: "Report the job info and its requirements, and whether the resume covers them.",
  input_schema: {
    type: "object",
    properties: {
      offer: {
        type: "object",
        properties: {
          company: { type: "string" },
          title: { type: "string" },
          location: { type: "string" },
          work_mode: { type: "string", enum: ["remote", "hybrid", "onsite", "unknown"] },
        },
        required: ["company", "title", "location", "work_mode"],
      },
      requirements: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: { type: "string" },
            skill: { type: "string" },
            kind: { type: "string", enum: ["required", "preferred"] },
            is_knockout: { type: "boolean" },
            jd_quote: { type: "string" },
            match: { type: "string", enum: ["yes", "partial", "no", "na"] },
            cv_quote: { type: "string" },
          },
          required: ["text", "skill", "kind", "is_knockout", "jd_quote", "match", "cv_quote"],
        },
      },
    },
    required: ["offer", "requirements"],
  },
};

export function buildSystem(settings: Record<string, string>): string {
  const facts = Object.entries(settings)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
  return `You compare a job description with a candidate's resume.

Fixed facts about the candidate (they are NOT in the resume):
${facts}

First fill "offer": company, title, location and work_mode (remote, hybrid, onsite, unknown).

Then list the concrete requirements of the job. For each one:
- text: the requirement in a few words.
- skill: only if the job description NAMES one specific technology in jd_quote. Use its standard name (e.g. "Kubernetes", not "k8s"; "PostgreSQL", not "Postgres"). If the job lists several technologies, make one requirement per technology. Empty string for general concepts ("cloud-native", "distributed systems", "APIs") and for anything not named in jd_quote. Never pick a technology the job does not name.
- kind: "required" or "preferred" (nice to have, bonus, valued).
- is_knockout: true only for rules that disqualify regardless of skills: residence or country restrictions, work authorization, required spoken languages, on-site presence. False for technologies and years of experience.
- jd_quote: copy the exact words from the job description that state it.
- match:
  - For technologies and experience: "yes" if the resume clearly shows it, "partial" if only close or related, "no" if it is not in the resume. If the resume does not mention a technology, the answer is "no", even if the candidate probably knows it.
  - For knock-out rules: judge them against the fixed facts above ("yes" if the candidate meets it, "no" if not).
  - "na" if it cannot be judged (soft skills, vague phrases).
- cv_quote: copy the exact words from the resume that show it. Empty string if match is "no" or "na", or if the requirement is a knock-out.
Do not invent requirements that are not in the job description.
Do not say the candidate has a skill that is not written in the resume.`;
}

// Para comparar citas: solo letras y números, sin puntuación ni símbolos.
export const normalize = (s: string | undefined | null) =>
  (typeof s === "string" ? s : "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

// Una cita solo vale si existe de verdad en el texto. Vacía o ausente = no vale
// (un texto vacío está "contenido" en cualquier texto, así que habría que rechazarlo aparte).
const quoteIsIn = (quote: string | undefined | null, normalizedText: string) => {
  const q = normalize(quote);
  return q.length > 0 && normalizedText.includes(q);
};

// Obligatorios pesan 2, deseables 1. yes = 1, partial = 0.5, no = 0.
// Los "na" y los knock-out no entran en el porcentaje: los knock-out
// no puntúan, deciden (ver knockoutFailed).
export function score(reqs: Requirement[]): number | null {
  let got = 0;
  let total = 0;
  for (const r of reqs) {
    if (r.is_knockout || r.match === "na") continue;
    const weight = r.kind === "required" ? 2 : 1;
    const points = r.match === "yes" ? 1 : r.match === "partial" ? 0.5 : 0;
    got += weight * points;
    total += weight;
  }
  return total === 0 ? null : Math.round((got / total) * 100);
}

// Regla anti-invento, aplicada por código:
// - cita de la oferta inexistente -> el requisito se descarta;
// - dice yes/partial pero la cita del CV no existe -> pasa a "no".
// Los knock-out se juzgan con mis datos fijos, no con el CV: no llevan cita de CV.
export function verify(reqs: Requirement[], jd: string, cv: string) {
  const jdNorm = normalize(jd);
  const cvNorm = normalize(cv);
  const kept: Requirement[] = [];
  const dropped: string[] = [];
  const downgraded: string[] = [];

  for (const r of reqs) {
    if (!quoteIsIn(r.jd_quote, jdNorm)) {
      dropped.push(`${r.text} -> "${r.jd_quote}"`);
      continue;
    }
    const needsCvQuote = !r.is_knockout && (r.match === "yes" || r.match === "partial");
    if (needsCvQuote && !quoteIsIn(r.cv_quote, cvNorm)) {
      downgraded.push(`${r.text} -> "${r.cv_quote}"`);
      kept.push({ ...r, match: "no" });
      continue;
    }
    kept.push(r);
  }
  return { kept, dropped, downgraded };
}

// Elige el CV solo si destaca claramente.
export function pickBest(results: { id: number; percent: number | null }[]): number | null {
  const ranked = results
    .filter((r) => r.percent !== null)
    .sort((a, b) => (b.percent as number) - (a.percent as number));
  if (ranked.length === 0) return null;
  if (ranked.length === 1) return ranked[0].id;
  const gap = (ranked[0].percent as number) - (ranked[1].percent as number);
  return gap >= CLEAR_DIFFERENCE ? ranked[0].id : null;
}

async function askModel(jd: string, cv: string, system: string, apiKey: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content: `RESUME:\n${cv}\n\nJOB DESCRIPTION:\n${jd}` }],
    }),
  });
  if (!res.ok) throw new Error(`La API respondió ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const block = data.content?.find((b: { type: string }) => b.type === "tool_use");
  if (!block) throw new Error("El modelo no devolvió la herramienta");
  const input = block.input as { offer?: OfferInfo; requirements?: Requirement[] };
  return {
    offer: input.offer as OfferInfo,
    // Descarta lo que no sea un objeto; las citas ausentes las trata verify().
    requirements: (Array.isArray(input.requirements) ? input.requirements : []).filter(
      (x) => x && typeof x === "object"
    ),
  };
}

export async function analyzeOffer(
  jd: string,
  resumes: ResumeInput[],
  settings: Record<string, string>,
  apiKey: string
): Promise<Analysis> {
  const system = buildSystem(settings);
  const raw = await Promise.all(resumes.map((r) => askModel(jd, r.content, system, apiKey)));

  const results: ResumeResult[] = raw.map((out, i) => {
    const { kept, dropped, downgraded } = verify(out.requirements, jd, resumes[i].content);
    return {
      id: resumes[i].id,
      name: resumes[i].name,
      percent: score(kept),
      requirements: kept,
      dropped,
      downgraded,
    };
  });

  // Los knock-out no dependen del CV; los leo del primero.
  const knockouts = (results[0]?.requirements ?? []).filter(
    (r) => r.is_knockout && r.match === "no"
  );

  return {
    offer: raw[0].offer ?? { company: "", title: "", location: "", work_mode: "unknown" },
    results,
    bestResumeId: pickBest(results),
    knockoutFailed: knockouts.length > 0,
    knockouts,
  };
}

// Llamada pequeña: solo dice qué empresa anuncia la oferta.
export async function extractCompany(jd: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 100,
      system: "Return the name of the company that is hiring, as written in the job post. If it is a recruiting agency, return the agency name. Empty string if you cannot tell.",
      tools: [{
        name: "report_company",
        description: "Report the hiring company name.",
        input_schema: { type: "object", properties: { company: { type: "string" } }, required: ["company"] },
      }],
      tool_choice: { type: "tool", name: "report_company" },
      messages: [{ role: "user", content: jd.slice(0, 6000) }],
    }),
  });
  if (!res.ok) throw new Error(`La API respondió ${res.status}`);
  const data = await res.json();
  const block = data.content?.find((b: { type: string }) => b.type === "tool_use");
  return (block?.input?.company as string) ?? "";
}

// ---------------------------------------------------------------
// ¿Conviene aplicar?  PROPUESTA MÍA (no viene de ningún documento):
// los umbrales son un punto de partida para ajustar con tus resultados reales.
// ---------------------------------------------------------------
export const YES_FROM = 70; // % a partir del cual conviene
export const DOUBT_FROM = 50; // entre este y YES_FROM, dudoso; por debajo, no

export interface Verdict {
  level: "yes" | "doubt" | "no";
  reasons: string[];
}

export function decide(input: {
  percent: number | null;
  knockouts: { text: string }[]; // reglas que no cumples (residencia, idioma, presencial...)
  gaps: string[]; // tecnologías obligatorias que no tienes y que tú marcaste como "gap"
}): Verdict {
  const reasons: string[] = [];

  // 1. Un knock-out decide por sí solo, tenga el % que tenga.
  if (input.knockouts.length > 0) {
    for (const k of input.knockouts) reasons.push(`No cumples: ${k.text}`);
    if (input.percent !== null) reasons.push(`Ajuste de habilidades: ${input.percent}%`);
    return { level: "no", reasons };
  }

  // 2. Sin requisitos evaluables no hay base para decidir.
  if (input.percent === null) {
    return { level: "doubt", reasons: ["No he podido evaluar requisitos: decide tú."] };
  }

  reasons.push(`Ajuste de habilidades: ${input.percent}%`);
  let level: Verdict["level"] =
    input.percent >= YES_FROM ? "yes" : input.percent >= DOUBT_FROM ? "doubt" : "no";

  // 3. Un hueco en algo obligatorio impide el "sí" aunque el % sea alto.
  if (input.gaps.length > 0) {
    reasons.push(`Te falta algo obligatorio que tienes como hueco: ${input.gaps.join(", ")}`);
    if (level === "yes") level = "doubt";
  }
  return { level, reasons };
}