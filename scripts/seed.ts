// Carga inicial: CVs, datos fijos y tecnologías con mi nivel.
// Se puede ejecutar varias veces sin duplicar nada.
// Uso: npx tsx scripts/seed.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { resumes, settings, skills } from "../app/src/db/schema";

const db = drizzle(neon(process.env.DATABASE_URL!));

// 1. CVs. Se leen de data/resumes/*.txt (esa carpeta va en .gitignore).
// Aviso: aquí no deben quedar teléfono ni email.
async function seedResumes() {
  for (const name of ["backend", "fullstack", "ai"]) {
    const content = readFileSync(`data/resumes/${name}.txt`, "utf8").trim();
    await db
      .insert(resumes)
      .values({ name, content })
      .onConflictDoUpdate({ target: resumes.name, set: { content, updatedAt: new Date() } });
    console.log(`CV ${name}: ${content.length} caracteres`);
  }
}

// 2. Datos fijos. Los usa el análisis para decidir los knock-out.
const SETTINGS: Record<string, string> = {
  residence: "Huelva, España",
  searching_mode: "remoto",
  relocation: "No quiero mudarme. Si hubiera que hacerlo, solo países del norte de Europa.",
  languages: "Español (nativo), inglés",
  work_permit: "UE (española). Fuera de la UE solo si la empresa patrocina visado.",
};

async function seedSettings() {
  for (const [key, value] of Object.entries(SETTINGS)) {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
  }
  console.log(`Settings: ${Object.keys(SETTINGS).length}`);
}

// 3. Tecnologías y nivel (strong, some, growing, gap).
// BORRADOR: las marcadas con (?) las he puesto yo y hay que revisarlas.
// Si ya existe una tecnología NO se toca su nivel (así lo que cambies
// a mano no se pisa al volver a ejecutar).
const SKILLS: [string, string][] = [
  ["Node.js", "strong"], ["TypeScript", "strong"], ["NestJS", "strong"],
  ["PostgreSQL", "strong"], ["PHP", "strong"], ["Laravel", "strong"],
  ["React", "some"], ["Vue.js", "some"], ["Terraform", "some"],
  ["Kubernetes", "some"], ["Stripe", "some"],
  ["Python", "growing"], ["FastAPI", "growing"], ["OAuth", "growing"],
  ["Go", "growing"],   // (?) estás con mini-eats
  ["Java", "gap"],     // (?)
  ["Rust", "gap"],     // (?)
  ["Docker", "strong"],      // (?)
  ["Linux", "strong"],       // (?)
  ["Kafka", "growing"],      // (?) orderbook-pipeline
  ["LangChain", "gap"],      // (?)
  ["RAG", "growing"],        // (?)
];

async function seedSkills() {
  await db
    .insert(skills)
    .values(SKILLS.map(([name, myLevel]) => ({ name, myLevel })))
    .onConflictDoNothing({ target: skills.name });
  console.log(`Skills: ${SKILLS.length}`);
}

async function main() {
  await seedResumes();
  await seedSettings();
  await seedSkills();
  console.log("Listo.");
}
main().catch((e) => { console.error(e); process.exit(1); });