import { useState, useEffect, useCallback } from "react";

const C = { bg:"#060B18",s:"#0A1428",s2:"#0F1D38",b:"#1A2D52",tx:"#F0F0F4",tm:"#8A94A8",td:"#4A5568",acc:"#F8BA10",r:"#FF4D6A",g:"#36DE67",w:"#FFC107",p:"#4A90D9",bl:"#60A5FA",blBg:"#0A1633" };
const F = "'Poppins', sans-serif", D = "'Playfair Display', serif";

const CAT_COLORS = { publicidad:"#F8BA10", software:"#4A90D9", producción:"#36DE67", freelance:"#FB923C", nómina:"#A78BFA", transporte:"#60A5FA", comida:"#FF6B8A", oficina:"#8B5CF6", impuestos:"#EF4444", otro:"#6B7280" };
const CAT_ICONS = { publicidad:"📢", software:"💻", producción:"🎬", freelance:"🤝", nómina:"👥", transporte:"🚗", comida:"🍽️", oficina:"🏢", impuestos:"🏛️", otro:"📎" };

function extractSheetId(url) { const m = url?.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/); return m ? m[1] : (/^[a-zA-Z0-9_-]{30,}$/.test(url) ? url : null); }

export default function Expenses({ sheetId: propSheetId, onLink, onUnlink, readOnly = false, compact = false }) {
  const [sheetInput, setSheetInput] = useState("");
  const [sheetId, setSheetId] = useState(propSheetId || null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showLink, setShowLink] = useState(!propSheetId);
  const [filter, setFilter] = useState("todos");

  const fetchData = useCallback(async (sid) => {
    if (!sid) return;
    setLoading(true); setError("");
    try {
      const r = await fetch(`/api/sheets?sheetId=${sid}&range=Gastos!A1:Z500`);
      const d = await r.json();
      if (d.error) { setError(d.error); setLoading(false); return; }
      if (Array.isArray(d) && d.length > 1) {
        const parsed = d.slice(1).filter(row => row[0] && row[3]).map(row => ({
          date: row[0] || "",
          category: (row[1] || "otro").toLowerCase().trim(),
          description: row[2] || "",
          amount: parseFloat(String(row[3]).replace(/[,$]/g, "")) || 0,
          client: row[4] || "",
          method: row[5] || "",
        }));
        setExpenses(parsed);
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

  // Link screen
  if (!sheetId || showLink) {
    if (readOnly) return null;
    return (
      <div style={{ background: C.bg, borderRadius: 10, border: `2px dashed ${C.b}`, padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>💸</div>
        <div style={{ fontFamily: D, fontSize: 13, fontWeight: 600, color: C.tx, marginBottom: 4 }}>Vincular hoja de gastos</div>
        <div style={{ fontSize: 11, color: C.td, marginBottom: 14, lineHeight: 1.5 }}>
          La hoja debe tener una pestaña "Gastos" con columnas: Fecha, Categoría, Descripción, Monto, Cliente/Proyecto, Método
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
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = {};
  expenses.forEach(e => {
    const cat = e.category;
    if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0 };
    byCategory[cat].total += e.amount;
    byCategory[cat].count++;
  });
  const sortedCats = Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total);

  const byClient = {};
  expenses.forEach(e => {
    const cl = e.client || "Sin asignar";
    if (!byClient[cl]) byClient[cl] = 0;
    byClient[cl] += e.amount;
  });
  const sortedClients = Object.entries(byClient).sort((a, b) => b[1] - a[1]);

  const filtered = filter === "todos" ? expenses : expenses.filter(e => e.category === filter);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>💸</span>
          <span style={{ fontFamily: D, fontSize: 14, fontWeight: 700, color: C.tx }}>Gastos</span>
          <span style={{ fontSize: 11, color: C.td }}>({expenses.length} registros)</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => fetchData(sheetId)} style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 6, padding: "4px 10px", color: C.tm, cursor: "pointer", fontSize: 11, fontFamily: F }}>🔄</button>
          {!readOnly && <button onClick={() => setShowLink(true)} style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 6, padding: "4px 10px", color: C.tm, cursor: "pointer", fontSize: 11, fontFamily: F }}>🔗</button>}
          {!readOnly && <button onClick={async () => { setSheetId(null); setExpenses([]); setShowLink(true); if (onUnlink) await onUnlink(); }} style={{ background: "none", border: `1px solid ${C.r}30`, borderRadius: 6, padding: "4px 10px", color: C.r, cursor: "pointer", fontSize: 11 }}>✕</button>}
        </div>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 20, color: C.tm, fontSize: 12 }}>Cargando...</div>}
      {error && <div style={{ color: C.r, fontSize: 12, marginBottom: 10 }}>{error}</div>}

      {!loading && expenses.length > 0 && (
        <>
          {/* Total + Category breakdown */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.b}`, padding: "12px 16px", minWidth: 120 }}>
              <div style={{ fontSize: 10, color: C.tm, textTransform: "uppercase", letterSpacing: ".06em" }}>Total gastos</div>
              <div style={{ fontFamily: D, fontSize: 24, fontWeight: 800, color: C.r, marginTop: 4 }}>${total.toLocaleString("es", { minimumFractionDigits: 2 })}</div>
            </div>
            {sortedCats.slice(0, compact ? 3 : 6).map(([cat, data]) => {
              const color = CAT_COLORS[cat] || "#6B7280";
              const icon = CAT_ICONS[cat] || "📎";
              const pct = Math.round((data.total / total) * 100);
              return (
                <div key={cat} onClick={() => setFilter(filter === cat ? "todos" : cat)} style={{ background: filter === cat ? color + "15" : C.bg, borderRadius: 10, border: `1px solid ${filter === cat ? color : C.b}`, padding: "10px 14px", cursor: "pointer", minWidth: 100 }}>
                  <div style={{ fontSize: 10, color: C.tm, display: "flex", alignItems: "center", gap: 4 }}><span>{icon}</span>{cat.charAt(0).toUpperCase() + cat.slice(1)}</div>
                  <div style={{ fontFamily: D, fontSize: 16, fontWeight: 700, color, marginTop: 2 }}>${data.total.toLocaleString("es", { minimumFractionDigits: 0 })}</div>
                  <div style={{ fontSize: 9, color: C.td }}>{pct}% · {data.count} items</div>
                </div>
              );
            })}
          </div>

          {/* Top clients by spend */}
          {!compact && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.tm, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>Gasto por cliente/proyecto</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {sortedClients.slice(0, 6).map(([cl, amt]) => {
                  const pct = Math.round((amt / total) * 100);
                  return (
                    <div key={cl} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                      <span style={{ flex: 1, color: C.tx, fontWeight: 500 }}>{cl}</span>
                      <div style={{ width: 80, height: 4, background: C.b, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: C.acc, borderRadius: 2 }} />
                      </div>
                      <span style={{ color: C.r, fontWeight: 600, minWidth: 60, textAlign: "right" }}>${amt.toLocaleString("es", { minimumFractionDigits: 0 })}</span>
                      <span style={{ color: C.td, minWidth: 30 }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Expense list */}
          {!compact && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.tm, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>
                {filter !== "todos" ? `Filtrando: ${filter}` : "Todos los gastos"} ({filtered.length})
                {filter !== "todos" && <button onClick={() => setFilter("todos")} style={{ background: "none", border: "none", color: C.acc, cursor: "pointer", fontSize: 10, marginLeft: 8, fontFamily: F }}>✕ limpiar</button>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 300, overflow: "auto" }}>
                {filtered.map((e, i) => {
                  const color = CAT_COLORS[e.category] || "#6B7280";
                  const icon = CAT_ICONS[e.category] || "📎";
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: i % 2 === 0 ? C.bg : "transparent", borderRadius: 6, fontSize: 11 }}>
                      <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: C.tx, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</div>
                        <div style={{ fontSize: 9, color: C.td }}>{e.date} · {e.client}{e.method ? ` · ${e.method}` : ""}</div>
                      </div>
                      <span style={{ color, fontSize: 10, fontWeight: 600, padding: "2px 6px", background: color + "15", borderRadius: 4 }}>{e.category}</span>
                      <span style={{ color: C.tx, fontWeight: 700, fontFamily: D, minWidth: 60, textAlign: "right" }}>${e.amount.toLocaleString("es", { minimumFractionDigits: 2 })}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {!loading && expenses.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: 28, color: C.td, fontSize: 12 }}>
          No se encontraron datos. Asegúrate de que la hoja tenga la pestaña "Gastos".
        </div>
      )}
    </div>
  );
}
