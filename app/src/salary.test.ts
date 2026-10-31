import { describe, it, expect } from "vitest";
import { parseSalary } from "./salary";

describe("parseSalary: texto del tracker (formato español)", () => {
  it("€80.000 → 80000 anual (el punto es de miles)", () => {
    const r = parseSalary("€80.000");
    expect(r.amount).toBe(80000);
    expect(r.period).toBe("year");
    expect(r.inferred).toBe(false);
  });

  it("€59.997 → 59997 anual", () => {
    expect(parseSalary("€59.997").amount).toBe(59997);
  });

  it("€6000 → mensual, inferido", () => {
    const r = parseSalary("€6000");
    expect(r.period).toBe("month");
    expect(r.inferred).toBe(true);
    expect(r.annualEur).toBe(72000);
  });

  it("€3500 → mensual", () => {
    expect(parseSalary("€3500").period).toBe("month");
  });

  it("€38 → por hora, anual = 38 × 1760", () => {
    const r = parseSalary("€38");
    expect(r.period).toBe("hour");
    expect(r.annualEur).toBe(66880);
  });

  it("€-3 → se marca para revisar, sin cálculo", () => {
    const r = parseSalary("€-3");
    expect(r.needsReview).toBe(true);
    expect(r.annualEur).toBeNull();
  });

  it("— → sin sueldo, sin revisión", () => {
    const r = parseSalary("—");
    expect(r.amount).toBeNull();
    expect(r.needsReview).toBe(false);
  });
});

describe("parseSalary: texto de ofertas (inglés)", () => {
  it("$100k – $140k → rango, usa el mínimo, anual", () => {
    const r = parseSalary("$100k – $140k");
    expect(r.amount).toBe(100000);
    expect(r.amountMax).toBe(140000);
    expect(r.currency).toBe("USD");
    expect(r.period).toBe("year");
  });

  it("€75K – €105K • Offers Equity", () => {
    const r = parseSalary("€75K – €105K • Offers Equity");
    expect(r.amount).toBe(75000);
    expect(r.currency).toBe("EUR");
  });

  it("la palabra del periodo gana a la magnitud: 4,000 per month", () => {
    const r = parseSalary("4,000 per month");
    expect(r.period).toBe("month");
    expect(r.inferred).toBe(false);
  });

  it("38/h → hora, no inferido", () => {
    const r = parseSalary("€38/h");
    expect(r.period).toBe("hour");
    expect(r.inferred).toBe(false);
  });

  it("-3 sin símbolo (así se guarda en la base de datos) → revisar", () => {
    const r = parseSalary("-3");
    expect(r.needsReview).toBe(true);
    expect(r.annualEur).toBeNull();
  });

  it("un rango con guion sigue funcionando: 100-140k", () => {
    const r = parseSalary("100-140k");
    expect(r.amount).toBe(100000);
    expect(r.needsReview).toBe(false);
  });
});