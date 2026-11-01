// Antes de analizar: ¿ya he aplicado a alguna empresa que aparece en esta oferta?
// Solo mira el texto y mis aplicaciones. No llama a ningún modelo.

export interface AppRow {
  company: string;
  position: string;
  status: string | null;
  dateApplied: string | null; // "YYYY-MM-DD"
}

export interface PreviousMatch {
  company: string; // tal como lo tengo guardado
  last3: number; // aplicaciones en los últimos 3 meses
  last6: number;
  last12: number;
  total: number; // todas, también las de hace más de un año o sin fecha
  lastDate: string | null;
  lastStatus: string | null;
  lastPosition: string | null;
}

const MIN_NAME_LENGTH = 4; // evita falsos avisos con nombres muy cortos

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

function monthsAgo(now: Date, months: number): string {
  const d = new Date(now);
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

export function findPrevious(jd: string, rows: AppRow[], now: Date = new Date()): PreviousMatch[] {
  const text = ` ${norm(jd)} `;
  const cut3 = monthsAgo(now, 3);
  const cut6 = monthsAgo(now, 6);
  const cut12 = monthsAgo(now, 12);

  // Una empresa guardada puede traer varios nombres separados por coma.
  const byName = new Map<string, AppRow[]>();
  for (const row of rows) {
    for (const part of row.company.split(",")) {
      const name = norm(part);
      if (name.length < MIN_NAME_LENGTH) continue;
      if (!text.includes(` ${name} `)) continue; // palabra completa, no trozo de otra
      byName.set(name, [...(byName.get(name) ?? []), row]);
    }
  }

  const out: PreviousMatch[] = [];
  for (const [name, list] of byName) {
    const dated = list
      .filter((r) => r.dateApplied && /^\d{4}-\d{2}-\d{2}/.test(r.dateApplied))
      .sort((a, b) => (b.dateApplied as string).localeCompare(a.dateApplied as string));
    const date = (r: AppRow) => (r.dateApplied as string).slice(0, 10);
    const last = dated[0] ?? list[0];
    out.push({
      company: name,
      last3: dated.filter((r) => date(r) >= cut3).length,
      last6: dated.filter((r) => date(r) >= cut6).length,
      last12: dated.filter((r) => date(r) >= cut12).length,
      total: list.length,
      lastDate: dated[0] ? date(dated[0]) : null,
      lastStatus: last.status,
      lastPosition: last.position,
    });
  }
  return out;
}