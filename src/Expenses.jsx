import { useState, useEffect, useCallback } from "react";

const C = { bg:"#060B18",s:"#0A1428",s2:"#0F1D38",b:"#1A2D52",tx:"#F0F0F4",tm:"#8A94A8",td:"#4A5568",acc:"#F8BA10",r:"#FF4D6A",g:"#36DE67",w:"#FFC107",p:"#4A90D9",bl:"#60A5FA",blBg:"#0A1633" };
const F = "'Poppins', sans-serif", D = "'Playfair Display', serif";
const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function extractSheetId(url) { const m = url?.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/); return m ? m[1] : (/^[a-zA-Z0-9_-]{30,}$/.test(url) ? url : null); }

export default function Expenses({ sheetId: propSheetId, onLink, onUnlink, readOnly = false, compact = false }) {
  const [sheetInput, setSheetInput] = useState("");
  const [sheetId, setSheetId] = useState(propSheetId || null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showLink, setShowLink] = useState(!propSheetId);

  const fetchData = useCallback(async (sid) => {
    if (!sid) return;
    setLoading(true); setError("");
    try {
      const r = await fetch(`/api/sheets?sheetId=${sid}&range=Gastos!A1:P50`);
      const d = await r.json();
      if (d.error) { setError(d.error); setLoading(false); return; }
      if (Array.isArray(d) && d.length > 1) {
        const parsed = d.slice(1).map(row => {
          const name = (row[0] || "").trim();
          const currency = (row[1] || "USD").trim().toUpperCase();
          const isSection = name.startsWith("──") || name.startsWith("--");
          const isTotal = name.toUpperCase().includes("TOTAL");
          const monthly = [];
          for (let i = 2; i < 14; i++) {
            const v = parseFloat(String(row[i] || "0").replace(/[$,]/g, "")) || 0;
            monthly.push(v);
          }
          const total = monthly.reduce((s, v) => s + v, 0);
          const filled = monthly.filter(v => v > 0).length;
          const avg = filled > 0 ? total / filled : 0;
          return { name, currency, monthly, total, avg, isSection, isTotal };
        }).filter(r => r.name);
        setRows(parsed);
      }
    } catch { setError("Error conectando con Sheets"); }
    setLoading(false);
  }, []);

  useEffect(() => { if (propSheetId) { setSheetId(propSheetId); setShowLink(false); } }, [propSheetId]);
  useEffect(() => { if (sheetId) fetchData(sheetId); }, [sheetId, fetchData]);

  const handleLink = async () => {
    const id = extractSheetId(sheetInput);
    if (!id) { setError("URL no válida"); return; }
    setSheetId(id); setShowLink(false);
    if (onLink) await onLink(id);
  };

  if (!sheetId || showLink) {
    if (readOnly) return null;
    return (
      <div style={{ background: C.bg, borderRadius: 10, border: `2px dashed ${C.b}`, padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>💸</div>
        <div style={{ fontFamily: D, fontSize: 13, fontWeight: 600, color: C.tx, marginBottom: 4 }}>Vincular hoja de gastos</div>
        <div style={{ fontSize: 11, color: C.td, marginBottom: 14, lineHeight: 1.5 }}>
          La hoja debe tener pestaña "Gastos" con formato: Categoría | Moneda | Ene | Feb | ... | Dic
        </div>
        <div style={{ display: "flex", gap: 8, maxWidth: 480, margin: "0 auto" }}>
          <input value={sheetInput} onChange={e => setSheetInput(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..."
            style={{ flex: 1, background: C.s, border: `1px solid ${C.b}`, borderRadius: 8, padding: "8px 10px", color: C.tx, fontSize: 12, fontFamily: F, outline: "none" }}
            onKeyDown={e => e.key === "Enter" && handleLink()} />
          <button onClick={handleLink} disabled={!sheetInput} style={{ background: C.acc, color: "#000", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 11, fontWeight: 700, fontFamily: F, cursor: "pointer", opacity: sheetInput ? 1 : 0.4 }}>Vincular</button>
        </div>
        {error && <div style={{ color: C.r, fontSize: 11, marginTop: 8 }}>{error}</div>}
      </div>
    );
  }

  // Calculations
  const dataRows = rows.filter(r => !r.isSection && !r.isTotal);
  const usdRows = dataRows.filter(r => r.currency === "USD");
  const cadRows = dataRows.filter(r => r.currency === "CAD");
  const monthlyTotals = MONTHS.map((_, mi) => dataRows.reduce((s, r) => s + r.monthly[mi], 0));
  const grandTotal = monthlyTotals.reduce((s, v) => s + v, 0);
  const usdTotal = usdRows.reduce((s, r) => s + r.total, 0);
  const cadTotal = cadRows.reduce((s, r) => s + r.total, 0);
  const maxMonth = Math.max(...monthlyTotals, 1);
  const currentMonth = new Date().getMonth();

  // Sections for display
  const sections = [];
  let currentSection = { title: "General", items: [] };
  rows.forEach(r => {
    if (r.isSection) {
      if (currentSection.items.length > 0) sections.push(currentSection);
      currentSection = { title: r.name.replace(/[─\-]/g, "").trim(), items: [] };
    } else if (!r.isTotal) {
      currentSection.items.push(r);
    }
  });
  if (currentSection.items.length > 0) sections.push(currentSection);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>💸</span>
          <span style={{ fontFamily: D, fontSize: 14, fontWeight: 700, color: C.tx }}>Gastos Wuaya</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => fetchData(sheetId)} style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 6, padding: "4px 10px", color: C.tm, cursor: "pointer", fontSize: 11, fontFamily: F }}>🔄</button>
          {!readOnly && <button onClick={async () => { setSheetId(null); setRows([]); setShowLink(true); if (onUnlink) await onUnlink(); }} style={{ background: "none", border: `1px solid ${C.r}30`, borderRadius: 6, padding: "4px 10px", color: C.r, cursor: "pointer", fontSize: 11 }}>✕</button>}
        </div>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 20, color: C.tm, fontSize: 12 }}>Cargando...</div>}
      {error && <div style={{ color: C.r, fontSize: 12, marginBottom: 10 }}>{error}</div>}

      {!loading && dataRows.length > 0 && (
        <>
          {/* Summary cards */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.b}`, padding: "14px 18px", flex: "1 1 120px" }}>
              <div style={{ fontSize: 10, color: C.tm, textTransform: "uppercase", letterSpacing: ".06em" }}>Total anual</div>
              <div style={{ fontFamily: D, fontSize: 26, fontWeight: 800, color: C.r, marginTop: 4 }}>${grandTotal.toLocaleString("en")}</div>
            </div>
            <div style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.b}`, padding: "14px 18px", flex: "1 1 100px" }}>
              <div style={{ fontSize: 10, color: C.tm, textTransform: "uppercase" }}>USD</div>
              <div style={{ fontFamily: D, fontSize: 20, fontWeight: 700, color: C.acc, marginTop: 4 }}>${usdTotal.toLocaleString("en")}</div>
            </div>
            {cadTotal > 0 && <div style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.b}`, padding: "14px 18px", flex: "1 1 100px" }}>
              <div style={{ fontSize: 10, color: C.tm, textTransform: "uppercase" }}>CAD</div>
              <div style={{ fontFamily: D, fontSize: 20, fontWeight: 700, color: C.bl, marginTop: 4 }}>C${cadTotal.toLocaleString("en")}</div>
            </div>}
            <div style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.b}`, padding: "14px 18px", flex: "1 1 100px" }}>
              <div style={{ fontSize: 10, color: C.tm, textTransform: "uppercase" }}>Promedio mensual</div>
              <div style={{ fontFamily: D, fontSize: 20, fontWeight: 700, color: C.p, marginTop: 4 }}>${Math.round(grandTotal / 12).toLocaleString("en")}</div>
            </div>
            <div style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.b}`, padding: "14px 18px", flex: "1 1 100px" }}>
              <div style={{ fontSize: 10, color: C.tm, textTransform: "uppercase" }}>Mes actual</div>
              <div style={{ fontFamily: D, fontSize: 20, fontWeight: 700, color: C.w, marginTop: 4 }}>${monthlyTotals[currentMonth].toLocaleString("en")}</div>
              <div style={{ fontSize: 9, color: C.td }}>{MONTHS[currentMonth]}</div>
            </div>
          </div>

          {/* Monthly bar chart */}
          {!compact && <div style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.b}`, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.tm, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".05em" }}>Gastos mes a mes</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140, padding: "0 4px" }}>
              {MONTHS.map((m, i) => {
                const val = monthlyTotals[i];
                const h = val > 0 ? Math.max((val / maxMonth) * 100, 4) : 4;
                const isCurrent = i === currentMonth;
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    {val > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: isCurrent ? C.acc : C.tx }}>${val}</span>}
                    <div style={{ width: "100%", maxWidth: 40, height: h, borderRadius: "4px 4px 1px 1px", background: isCurrent ? `linear-gradient(180deg,${C.acc},${C.acc}88)` : val > 0 ? `linear-gradient(180deg,${C.p},${C.p}55)` : C.b, transition: "height .4s", border: isCurrent ? `1px solid ${C.acc}` : "none" }} />
                    <span style={{ fontSize: 9, fontWeight: isCurrent ? 700 : 400, color: isCurrent ? C.acc : C.td }}>{m}</span>
                  </div>
                );
              })}
            </div>
          </div>}

          {/* Data table by section */}
          {!compact && <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 700 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: C.tm, fontWeight: 600, borderBottom: `2px solid ${C.acc}`, position: "sticky", left: 0, background: C.s, zIndex: 1, minWidth: 160 }}>Categoría</th>
                  <th style={{ padding: "8px 4px", color: C.td, fontWeight: 500, borderBottom: `2px solid ${C.acc}`, fontSize: 9 }}>$</th>
                  {MONTHS.map((m, i) => (
                    <th key={i} style={{ padding: "8px 4px", color: i === currentMonth ? C.acc : C.tm, fontWeight: i === currentMonth ? 700 : 500, borderBottom: `2px solid ${C.acc}`, textAlign: "center", background: i === currentMonth ? C.acc + "08" : "transparent" }}>{m}</th>
                  ))}
                  <th style={{ padding: "8px 6px", color: C.acc, fontWeight: 700, borderBottom: `2px solid ${C.acc}`, textAlign: "right" }}>Total</th>
                  <th style={{ padding: "8px 6px", color: C.tm, fontWeight: 500, borderBottom: `2px solid ${C.acc}`, textAlign: "right" }}>Prom</th>
                </tr>
              </thead>
              <tbody>
                {/* Total row */}
                <tr style={{ background: C.acc + "10" }}>
                  <td style={{ padding: "8px 10px", fontWeight: 700, color: C.acc, position: "sticky", left: 0, background: C.acc + "10", zIndex: 1 }}>TOTAL MENSUAL</td>
                  <td style={{ padding: "8px 4px", fontSize: 9, color: C.td }}></td>
                  {monthlyTotals.map((v, i) => (
                    <td key={i} style={{ padding: "8px 4px", textAlign: "center", fontWeight: 700, color: C.acc, background: i === currentMonth ? C.acc + "15" : "transparent" }}>{v > 0 ? `$${v.toLocaleString("en")}` : ""}</td>
                  ))}
                  <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 800, color: C.acc, fontFamily: D, fontSize: 13 }}>${grandTotal.toLocaleString("en")}</td>
                  <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 600, color: C.tm }}>${Math.round(grandTotal / 12).toLocaleString("en")}</td>
                </tr>
                {/* Sections */}
                {sections.map((sec, si) => (
                  <>{sec.title && <tr key={"sec-" + si}><td colSpan={16} style={{ padding: "10px 10px 4px", fontWeight: 700, color: C.r, fontSize: 11, borderTop: si > 0 ? `1px solid ${C.b}` : "none" }}>{sec.title}</td></tr>}
                  {sec.items.map((item, ii) => (
                    <tr key={si + "-" + ii} style={{ borderBottom: `1px solid ${C.b}15` }}>
                      <td style={{ padding: "6px 10px", color: C.tx, fontWeight: 500, position: "sticky", left: 0, background: C.s, zIndex: 1 }}>{item.name}</td>
                      <td style={{ padding: "6px 4px", fontSize: 9, color: item.currency === "CAD" ? C.bl : C.td }}>{item.currency}</td>
                      {item.monthly.map((v, mi) => (
                        <td key={mi} style={{ padding: "6px 4px", textAlign: "center", color: v > 0 ? C.tx : C.td + "30", background: mi === currentMonth ? C.acc + "05" : "transparent" }}>{v > 0 ? `$${v.toLocaleString("en")}` : "·"}</td>
                      ))}
                      <td style={{ padding: "6px 6px", textAlign: "right", fontWeight: 600, color: item.total > 0 ? C.tx : C.td }}>{item.total > 0 ? `$${item.total.toLocaleString("en")}` : ""}</td>
                      <td style={{ padding: "6px 6px", textAlign: "right", color: C.td }}>{item.avg > 0 ? `$${Math.round(item.avg).toLocaleString("en")}` : ""}</td>
                    </tr>
                  ))}</>
                ))}
              </tbody>
            </table>
          </div>}

          {/* Compact: just top categories */}
          {compact && <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {dataRows.filter(r => r.total > 0).sort((a, b) => b.total - a.total).slice(0, 5).map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                <span style={{ flex: 1, color: C.tx, fontWeight: 500 }}>{r.name}</span>
                <span style={{ color: r.currency === "CAD" ? C.bl : C.td, fontSize: 9 }}>{r.currency}</span>
                <div style={{ width: 60, height: 4, background: C.b, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min((r.total / grandTotal) * 100, 100)}%`, height: "100%", background: C.acc, borderRadius: 2 }} />
                </div>
                <span style={{ color: C.tx, fontWeight: 600, minWidth: 50, textAlign: "right" }}>${r.total.toLocaleString("en")}</span>
              </div>
            ))}
          </div>}
        </>
      )}

      {!loading && dataRows.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: 28, color: C.td, fontSize: 12 }}>
          Sin datos. Asegúrate de que la pestaña se llame "Gastos" con columnas: Categoría, Moneda, Ene...Dic
        </div>
      )}
    </div>
  );
}
