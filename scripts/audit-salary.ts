// Audit: lista los sueldos dudosos sin modificar nada
// Run with: npx tsx scripts/audit-salary.ts

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { applications } from "../app/src/db/schema";
import { parseSalary } from "../app/src/salary";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function audit() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  const rows = await db
    .select({
      id: applications.id,
      company: applications.company,
      salary: applications.salary,
    })
    .from(applications);

  console.log(`Read ${rows.length} applications\n`);

  const counts: Record<string, number> = {};

  for (const row of rows) {
    if (!row.salary) {
      counts["sin sueldo"] = (counts["sin sueldo"] ?? 0) + 1;
      continue;
    }

    const parsed = parseSalary(row.salary);
    const kind = parsed.needsReview
      ? "revisar"
      : parsed.inferred
        ? "inferido"
        : "seguro";
    counts[kind] = (counts[kind] ?? 0) + 1;

    if (kind !== "seguro") {
      console.log(
        `  [${kind}] #${row.id} ${row.company}: "${row.salary}" -> ${parsed.period ?? "?"}, ${parsed.annualEur ?? "?"} €/año`
      );
    }
  }

  console.log("\nResumen:", counts);
}

audit().catch(console.error);