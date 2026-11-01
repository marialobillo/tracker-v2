"use client";
// Una sola caja: pegas la oferta y pulsas Enter. Shift+Enter hace salto de línea.
import { useState } from "react";

type Req = { text: string; kind: string; is_knockout: boolean; match: string };
type Result = {
  offerId: number;
  offer: { company: string; title: string; location: string; work_mode: string };
  results: { id: number; name: string; percent: number | null; requirements: Req[]; dropped: string[]; downgraded: string[] }[];
  bestResumeId: number | null;
  knockoutFailed: boolean;
  knockouts: Req[];
};

type Previous = {
  company: string; last3: number; last6: number; last12: number; total: number;
  lastDate: string | null; lastStatus: string | null; lastPosition: string | null;
};

const ICON: Record<string, string> = { yes: "✅", partial: "🟡", no: "❌", na: "➖" };

export default function Pegar() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [previous, setPrevious] = useState<Previous[] | null>(null);

  async function send(force = false) {
    if (loading || !text.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setPrevious(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      if (data.duplicate) {
        setPrevious(data.duplicate);
        return; // el texto se queda en la caja por si decides analizar igualmente
      }
      setResult(data);
      setText("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const top = result?.results.reduce((a, b) => ((b.percent ?? -1) > (a.percent ?? -1) ? b : a));
  const best = result?.results.find((r) => r.id === result.bestResumeId);

  return (
    <main style={{ maxWidth: 760, margin: "2rem auto", padding: "1.5rem", background: "#ffffff", color: "#111111", borderRadius: 12 }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder="Pega aquí la oferta y pulsa Enter"
        rows={8}
        disabled={loading}
        style={{ width: "100%", padding: 12, fontSize: 15, background: "#ffffff", color: "#111111", border: "1px solid #888", borderRadius: 8 }}
      />
      {loading && <p>Analizando… (unos segundos)</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {previous && (
        <section style={{ border: "1px solid #c80", background: "#fff8e6", padding: 12, borderRadius: 8, marginTop: 12 }}>
          <strong>Ya has aplicado antes:</strong>
          {previous.map((p) => (
            <p key={p.company}>
              <b>{p.company}</b>: {p.last3} en 3 meses · {p.last6} en 6 · {p.last12} en 12 · {p.total} en total.
              {p.lastDate && ` Última: ${p.lastDate}`}
              {p.lastPosition && ` (${p.lastPosition}`}{p.lastStatus && `, ${p.lastStatus}`}{p.lastPosition && ")"}
            </p>
          ))}
          <button onClick={() => send(true)} disabled={loading}>Analizar igualmente</button>{" "}
          <button onClick={() => { setPrevious(null); setText(""); }}>Cancelar</button>
        </section>
      )}

      {result && top && (
        <section>
          <h2>{result.offer.company} — {result.offer.title}</h2>
          <p>{result.offer.location} · {result.offer.work_mode}</p>
          {result.knockoutFailed && (
            <p style={{ color: "crimson" }}>
              ⛔ No cumples: {result.knockouts.map((k) => k.text).join("; ")}
            </p>
          )}
          <p style={{ fontSize: 28, margin: "8px 0" }}>{top.percent ?? "?"}%</p>
          <p>
            {best
              ? `CV recomendado: ${best.name}`
              : "Ningún CV destaca claramente: manda el que prefieras."}
          </p>
          <p style={{ fontSize: 13 }}>
            {result.results.map((r) => `${r.name} ${r.percent ?? "?"}%`).join(" · ")}
          </p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {top.requirements.map((r, i) => (
              <li key={i}>
                {ICON[r.match]} {r.is_knockout ? "⛔ " : ""}
                <small>[{r.kind === "required" ? "oblig." : "desea."}]</small> {r.text}
              </li>
            ))}
          </ul>
          {top.dropped.length + top.downgraded.length > 0 && (
            <p style={{ fontSize: 12 }}>
              El código corrigió {top.dropped.length + top.downgraded.length} afirmaciones del modelo sin cita válida.
            </p>
          )}
        </section>
      )}
    </main>
  );
}