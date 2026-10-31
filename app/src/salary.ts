export type Period = "hour" | "month" | "year";

export interface ParsedSalary {
  amount: number | null;
  amountMax: number | null;
  currency: "EUR" | "USD" | "GBP" | null;
  period: Period | null;
  inferred: boolean;
  annualEur: number | null;
  needsReview: boolean;
}

// Tabla editable: cuántos euros vale 1 unidad de cada moneda.
export const TO_EUR = { EUR: 1, USD: 0.92, GBP: 1.17 } as const;
export const HOURS_PER_YEAR = 1760;

const EMPTY: ParsedSalary = {
  amount: null, amountMax: null, currency: null,
  period: null, inferred: false, annualEur: null, needsReview: false,
};

// "80.000" y "4,000" -> miles. "1.5" -> decimal. "6000" -> 6000.
function toNumber(raw: string): number {
  if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) return Number(raw.replace(/[.,]/g, ""));
  return Number(raw.replace(",", "."));
}

function detectPeriod(text: string): Period | null {
  const t = text.toLowerCase();
  if (/per\s*hour|\/\s*h\b|\/\s*hr\b|hourly|por hora/.test(t)) return "hour";
  if (/per\s*month|\/\s*mo\b|\/\s*month|monthly|al mes|mensual/.test(t)) return "month";
  if (/per\s*year|\/\s*yr\b|\/\s*year|annual|yearly|al año|anual/.test(t)) return "year";
  return null;
}

export function parseSalary(text: string): ParsedSalary {
  const clean = text.trim();
  if (clean === "" || clean === "—" || clean === "-") return { ...EMPTY };

    const currency =
    clean.includes("$") || /\bUSD\b/i.test(clean) ? "USD"
    : clean.includes("£") || /\bGBP\b/i.test(clean) ? "GBP"
    : "EUR";

  // Valor negativo al principio, con o sin símbolo ("-3", "€-3"): basura, se revisa a mano.
  // Solo al principio, para no romper rangos como "100-140k".
  if (/^[€$£]?\s*-\s*\d/.test(clean)) {
    return { ...EMPTY, currency, needsReview: true };
  }

  const matches = [...clean.matchAll(/(\d[\d.,]*)\s*(k)?/gi)];
  if (matches.length === 0) return { ...EMPTY, needsReview: true };

  const values = matches.slice(0, 2).map((m) => {
    const n = toNumber(m[1]);
    return m[2] ? n * 1000 : n;
  });
  // "100-140k": si solo el segundo lleva k, el primero también.
  if (values.length === 2 && matches[1][2] && !matches[0][2] && values[0] < 1000) {
    values[0] *= 1000;
  }

  const amount = values[0];
  const amountMax = values[1] ?? null;
  const hasK = matches.some((m) => m[2]);

  let period = detectPeriod(clean);
  let inferred = false;
  let needsReview = false;

  if (!period) {
    if (hasK) period = "year";
    else {
      if (amount <= 0) needsReview = true;
      else if (amount < 100) { period = "hour"; inferred = true; }
      else if (amount < 1000) needsReview = true;
      else if (amount <= 20000) { period = "month"; inferred = true; }
      else period = "year"; // más de 20.000: solo puede ser anual, no es una suposición
    }
  }

  if (!period || needsReview) {
    return { amount, amountMax, currency, period: null, inferred, annualEur: null, needsReview: true };
  }

  const factor = period === "hour" ? HOURS_PER_YEAR : period === "month" ? 12 : 1;
  const annualEur = Math.round(amount * factor * TO_EUR[currency]);

  return { amount, amountMax, currency, period, inferred, annualEur, needsReview };
}

// Las seis columnas de sueldo que se guardan en la tabla applications.
// Si no hay sueldo, todo queda vacío (y salaryInferred en false).
export function salaryToColumns(text: string | null | undefined) {
  const clean = text == null ? "" : String(text).trim();

  if (clean === "") {
    return {
      salaryAmount: null,
      salaryAmountMax: null,
      salaryCurrency: null,
      salaryPeriod: null,
      salaryInferred: false,
      salaryAnnualEur: null,
    };
  }

  const p = parseSalary(clean);
  return {
    salaryAmount: p.amount,
    salaryAmountMax: p.amountMax,
    salaryCurrency: p.currency,
    salaryPeriod: p.period,
    salaryInferred: p.inferred,
    salaryAnnualEur: p.annualEur,
  };
}