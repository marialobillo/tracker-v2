import { describe, it, expect } from "vitest";
import { score, verify, pickBest, type Requirement } from "./analyze";

const r = (o: Partial<Requirement>): Requirement => ({
  text: "x", skill: "", kind: "required", is_knockout: false,
  jd_quote: "node", match: "yes", cv_quote: "node", ...o,
});

describe("score", () => {
  it("obligatorios pesan 2, deseables 1", () => {
    // required yes (2/2) + preferred no (0/1) = 2/3
    expect(score([r({}), r({ kind: "preferred", match: "no" })])).toBe(67);
  });
  it("partial vale la mitad", () => {
    expect(score([r({ match: "partial" })])).toBe(50);
  });
  it("na y knock-out no puntúan", () => {
    expect(score([r({}), r({ match: "na" }), r({ is_knockout: true, match: "no" })])).toBe(100);
  });
  it("sin requisitos evaluables devuelve null", () => {
    expect(score([r({ match: "na" })])).toBeNull();
  });
});

describe("verify", () => {
  const jd = "We need Node.js and Go.";
  const cv = "Five years with Node.js.";
  it("descarta si la cita de la oferta no existe", () => {
    const out = verify([r({ jd_quote: "Rust required" })], jd, cv);
    expect(out.kept).toHaveLength(0);
    expect(out.dropped).toHaveLength(1);
  });
  it("pasa a no si la cita del CV no existe", () => {
    const out = verify([r({ jd_quote: "Go", cv_quote: "Go in production" })], jd, cv);
    expect(out.kept[0].match).toBe("no");
    expect(out.downgraded).toHaveLength(1);
  });
  it("ignora puntuación al comparar", () => {
    const out = verify([r({ jd_quote: "Node.js and Go", cv_quote: "node js" })], jd, cv);
    expect(out.kept[0].match).toBe("yes");
  });
  it("el knock-out no necesita cita de CV", () => {
    const out = verify([r({ is_knockout: true, jd_quote: "Node.js", cv_quote: "" })], jd, cv);
    expect(out.kept[0].match).toBe("yes");
  });
});

describe("pickBest", () => {
  it("recomienda si hay 10 puntos o más de diferencia", () => {
    expect(pickBest([{ id: 1, percent: 70 }, { id: 2, percent: 55 }])).toBe(1);
  });
  it("no recomienda si están cerca", () => {
    expect(pickBest([{ id: 1, percent: 60 }, { id: 2, percent: 55 }])).toBeNull();
  });
});