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
  context: string; // trozo de la oferta donde apareció el nombre, para ver si el aviso es falso
}

const MIN_NAME_LENGTH = 4; // evita falsos avisos con nombres muy cortos

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

// Busca el nombre en el texto original (con sus mayúsculas) y devuelve un trozo alrededor.
function contextOf(jd: string, name: string): string {
  const words = name.split(" ").map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${words.join("[^\\p{L}\\p{N}]+")}(?![\\p{L}\\p{N}])`, "iu");
  const m = re.exec(jd);
  if (!m) return "";
  const from = Math.max(0, m.index - 40);
  const to = Math.min(jd.length, m.index + m[0].length + 40);
  return jd.slice(from, to).replace(/\s+/g, " ").trim();
}

function monthsAgo(now: Date, months: number): string {
  const d = new Date(now);
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

// Agrupa mis aplicaciones por nombre de empresa (una empresa guardada puede traer varios, separados por coma).
function groupByName(rows: AppRow[], accept: (name: string) => boolean): Map<string, AppRow[]> {
  const byName = new Map<string, AppRow[]>();
  for (const row of rows) {
    for (const part of row.company.split(",")) {
      const name = norm(part);
      if (name.length < MIN_NAME_LENGTH || !accept(name)) continue;
      byName.set(name, [...(byName.get(name) ?? []), row]);
    }
  }
  return byName;
}

function summarize(
  byName: Map<string, AppRow[]>,
  now: Date,
  contextFor: (name: string) => string
): PreviousMatch[] {
  const cut3 = monthsAgo(now, 3);
  const cut6 = monthsAgo(now, 6);
  const cut12 = monthsAgo(now, 12);
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
      context: contextFor(name),
    });
  }
  return out;
}

// Compara solo con la empresa que anuncia la oferta (la detecta el modelo).
// "Gilytics AG" coincide con "gilytics"; una palabra suelta del texto no cuenta.
export function findPreviousByCompany(company: string, rows: AppRow[], now: Date = new Date()): PreviousMatch[] {
  const c = ` ${norm(company)} `;
  if (c.trim().length === 0) return [];
  const byName = groupByName(rows, (name) => c.includes(` ${name} `) || ` ${name} `.includes(c));
  return summarize(byName, now, () => "");
}

// Respaldo si no se pudo detectar la empresa: busca los nombres en todo el texto.
export function findPrevious(jd: string, rows: AppRow[], now: Date = new Date()): PreviousMatch[] {
  const text = ` ${norm(jd)} `;
  const byName = groupByName(rows, (name) => text.includes(` ${name} `));
  return summarize(byName, now, (name) => contextOf(jd, name));
}