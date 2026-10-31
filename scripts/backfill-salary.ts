// Rellena las columnas nuevas de sueldo a partir del texto de "salary"
// Simulacro (no escribe nada):  npx tsx scripts/backfill-salary.ts
// Escribir de verdad:           npx tsx scripts/backfill-salary.ts --apply

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { applications } from "../app/src/db/schema";
import { parseSalary } from "../app/src/salary";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function backfill() {
  const apply = process.argv.includes("--apply");
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  const rows = await db
    .select({
      id: applications.id,
      company: applications.company,
      salary: applications.salary,
    })
    .from(applications);

  console.log(apply ? "MODO REAL: voy a escribir\n" : "SIMULACRO: no escribo nada\n");

  let touched = 0;

  for (const row of rows) {
    if (!row.salary || row.salary.trim() === "") continue;

    const parsed = parseSalary(row.salary);

    const values = {
      salaryAmount: parsed.amount,
      salaryAmountMax: parsed.amountMax,
      salaryCurrency: parsed.currency,
      salaryPeriod: parsed.period,
      salaryInferred: parsed.inferred,
      salaryAnnualEur: parsed.annualEur,
    };

    if (parsed.inferred || parsed.needsReview) {
      console.log(`  #${row.id} ${row.company}: "${row.salary}" ->`, values);
    }

    if (apply) {
      await db.update(applications).set(values).where(eq(applications.id, row.id));
    }
    touched++;
  }

  console.log(`\n${touched} filas con sueldo ${apply ? "actualizadas" : "que se actualizarían"}`);
}

backfill().catch(console.error);