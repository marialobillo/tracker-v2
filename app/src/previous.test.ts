import { describe, it, expect } from "vitest";
import { findPrevious, findPreviousByCompany, type AppRow } from "./previous";

const now = new Date("2026-11-01");
const row = (o: Partial<AppRow>): AppRow => ({
  company: "payfit", position: "Backend", status: "Applied", dateApplied: "2026-10-30", ...o,
});
const jd = "At PayFit we build payroll software. Join PayFit today and help our customers.";

describe("findPrevious", () => {
  it("encuentra la empresa aunque cambie mayúsculas", () => {
    expect(findPrevious(jd, [row({})], now)).toHaveLength(1);
  });
  it("cuenta por tramos de 3, 6 y 12 meses", () => {
    const rows = [
      row({ dateApplied: "2026-10-30" }), // 3, 6, 12
      row({ dateApplied: "2026-07-01" }), // 6, 12
      row({ dateApplied: "2026-02-01" }), // 12
      row({ dateApplied: "2025-01-01" }), // solo total
    ];
    const [m] = findPrevious(jd, rows, now);
    expect([m.last3, m.last6, m.last12, m.total]).toEqual([1, 2, 3, 4]);
    expect(m.lastDate).toBe("2026-10-30");
  });
  it("no avisa por nombres que son trozo de otra palabra", () => {
    expect(findPrevious("We love payfitness.", [row({})], now)).toHaveLength(0);
  });
  it("ignora nombres demasiado cortos", () => {
    expect(findPrevious("We use AWS and IBM tools", [row({ company: "ibm" })], now)).toHaveLength(0);
  });
  it("separa empresas guardadas con coma", () => {
    const rows = [row({ company: "leanteams , curie platform" })];
    expect(findPrevious("About Curie Platform: we build tools.", rows, now)).toHaveLength(1);
  });
  it("una fecha rara no rompe nada y cuenta en el total", () => {
    const [m] = findPrevious(jd, [row({ dateApplied: "hace poco" })], now);
    expect([m.last12, m.total, m.lastDate]).toEqual([0, 1, null]);
  });
  it("sin coincidencias devuelve lista vacía", () => {
    expect(findPrevious("Nothing here", [row({})], now)).toEqual([]);
  });

  it("devuelve el trozo de texto donde encontró el nombre", () => {
    const [m] = findPrevious(jd, [row({})], now);
    expect(m.context.toLowerCase()).toContain("payfit");
  });
  it("caso real: una empresa llamada NiCe salta por 'Nice to have' (aviso falso conocido)", () => {
    const out = findPrevious("Requirements\nNice to have\nDocker", [row({ company: "NiCe" })], now);
    expect(out).toHaveLength(1);
    expect(out[0].context).toContain("Nice to have");
  });
});

describe("findPreviousByCompany", () => {
  it("caso real: Gilytics no salta por NiCe ni develop", () => {
    const rows = [row({ company: "NiCe" }), row({ company: "develop" })];
    expect(findPreviousByCompany("Gilytics AG", rows, now)).toEqual([]);
  });
  it("'Gilytics AG' coincide con 'gilytics' guardado", () => {
    const [m] = findPreviousByCompany("Gilytics AG", [row({ company: "gilytics" })], now);
    expect(m.total).toBe(1);
  });
  it("empresa vacía no devuelve nada", () => {
    expect(findPreviousByCompany("", [row({})], now)).toEqual([]);
  });
});