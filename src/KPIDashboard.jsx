import { useState, useEffect, useCallback } from "react";

const C = { bg:"#08080A",s:"#111115",s2:"#18181E",b:"#222230",tx:"#F0F0F4",tm:"#9898A8",td:"#5A5A6E",acc:"#CDFF50",r:"#FF4D6A",g:"#34D399",w:"#FBBF24",p:"#A78BFA",bl:"#60A5FA",blBg:"#0A1220",o:"#FB923C" };
const F = "'DM Sans', sans-serif", D = "'Sora', sans-serif";
const COLORS = [C.acc, C.bl, C.p, C.o, C.g, C.w, C.r];

function extractSheetId(url) {
  if (!url) return null;
  const m = url.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{30,}$/.test(url)) return url;
  return null;
}

function parseNum(v) {
  if (!v) return 0;
  const clean = String(v).replace(/[,%$€]/g, "").replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

function fmtNum(v, type) {
  const n = typeof v === "number" ? v : parseNum(v);
  if (type === "percent" || type === "porcentaje" || type === "%") return n.toFixed(1) + "%";
  if (type === "currency" || type === "moneda" || type === "$") return "$" + n.toLocaleString("es", { minimumFractionDigits: 0 });
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString("es");
}

function calcChange(cur, prev) {
  const c = parseNum(cur), p = parseNum(prev);
  if (!p) return null;
  return ((c - p) / p * 100).toFixed(1);
}

// ─── MINI LINE CHART ───
function MiniLine({ data, color = C.acc, h = 60, w = 200 }) {
  if (!data || data.length < 2) return null;
  const nums = data.map(parseNum);
  const min = Math.min(...nums), max = Math.max(...nums);
  const range = max - min || 1;
  const pad = 4;
  const points = nums.map((v, i) => {
    const x = pad + (i / (nums.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  const areaPoints = points + ` ${w - pad},${h} ${pad},${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`g-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#g-${color.replace("#", "")})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {nums.length > 0 && (() => {
        const lastX = pad + ((nums.length - 1) / (nums.length - 1)) * (w - pad * 2);
        const lastY = h - pad - ((nums[nums.length - 1] - min) / range) * (h - pad * 2);
        return <circle cx={lastX} cy={lastY} r="3" fill={color} />;
      })()}
    </svg>
  );
}

// ─── BAR CHART ───
function BarChart({ data, labels, colors, h = 160 }) {
  const max = Math.max(...data.map(parseNum), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: h, padding: "0 4px" }}>
      {data.map((v, i) => {
        const n = parseNum(v);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.tx, fontFamily: F }}>{fmtNum(n)}</span>
            <div style={{ width: "100%", maxWidth: 40, height: `${(n / max) * (h - 44)}px`, minHeight: 3, background: `linear-gradient(180deg, ${colors?.[i] || COLORS[i % COLORS.length]}, ${colors?.[i] || COLORS[i % COLORS.length]}66)`, borderRadius: "4px 4px 2px 2px", transition: "height .4s" }} />
            <span style={{ fontSize: 8, color: C.td, fontFamily: F, textAlign: "center", lineHeight: 1.1, maxWidth: 50, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{labels?.[i] || ""}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── KPI CARD ───
function KPICard({ label, value, prev, type, color, trend }) {
  const change = calcChange(value, prev);
  const isUp = change && parseFloat(change) >= 0;
  return (
    <div style={{ background: C.s, borderRadius: 14, border: `1px solid ${C.b}`, padding: "16px 18px", flex: "1 1 180px", minWidth: 160 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.tm, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8, fontFamily: F }}>{label}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
        <div style={{ fontFamily: D, fontSize: 26, fontWeight: 800, color: color || C.tx, lineHeight: 1 }}>{fmtNum(value, type)}</div>
        {change !== null && (
          <span style={{ fontSize: 11, fontWeight: 700, color: isUp ? C.g : C.r, marginBottom: 2 }}>
            {isUp ? "↑" : "↓"} {Math.abs(change)}%
          </span>
        )}
      </div>
      {trend && trend.length > 1 && (
        <div style={{ marginTop: 10 }}>
          <MiniLine data={trend} color={color || C.acc} w={160} h={40} />
        </div>
      )}
    </div>
  );
}

// ═══ MAIN COMPONENT ═══
export default function KPIDashboard({ sheetUrl, sheetId: propSheetId, onLink, onUnlink, readOnly = false }) {
  const [sheetInput, setSheetInput] = useState("");
  const [sheetId, setSheetId] = useState(propSheetId || null);
  const [kpis, setKpis] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showLink, setShowLink] = useState(!propSheetId);
  const [linking, setLinking] = useState(false);

  const fetchData = useCallback(async (sid) => {
    if (!sid) return;
    setLoading(true);
    setError("");
    try {
      // Fetch KPIs sheet
      const r1 = await fetch(`/api/sheets?sheetId=${sid}&range=KPIs!A1:Z50`);
      const d1 = await r1.json();
      if (d1.error) { setError(d1.error); setLoading(false); return; }
      if (Array.isArray(d1) && d1.length > 1) setKpis(d1);

      // Fetch Monthly sheet
      const r2 = await fetch(`/api/sheets?sheetId=${sid}&range=Mensual!A1:Z50`);
      const d2 = await r2.json();
      if (Array.isArray(d2) && d2.length > 1) setMonthly(d2);
    } catch (e) {
      setError("Error conectando con Google Sheets");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (propSheetId) { setSheetId(propSheetId); setShowLink(false); }
  }, [propSheetId]);

  useEffect(() => {
    if (sheetId) fetchData(sheetId);
  }, [sheetId, fetchData]);

  const handleLink = async () => {
    const id = extractSheetId(sheetInput);
    if (!id) { setError("URL de Google Sheet no válida"); return; }
    setLinking(true);
    setSheetId(id);
    setShowLink(false);
    if (onLink) await onLink(id);
    setLinking(false);
  };

  const handleUnlink = async () => {
    setSheetId(null);
    setKpis([]);
    setMonthly([]);
    setShowLink(true);
    if (onUnlink) await onUnlink();
  };

  // ─── LINK SCREEN ───
  if (!sheetId || showLink) {
    if (readOnly) return null;
    return (
      <div style={{ background: C.bg, borderRadius: 12, border: `2px dashed ${C.b}`, padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
        <div style={{ fontFamily: D, fontSize: 14, fontWeight: 600, color: C.tx, marginBottom: 4 }}>Vincular Google Sheet de KPIs</div>
        <div style={{ fontSize: 11, color: C.td, marginBottom: 16, lineHeight: 1.5, maxWidth: 400, margin: "0 auto 16px" }}>
          Pega el link de la hoja de cálculo con los KPIs del cliente.
          La hoja debe tener las pestañas "KPIs" y "Mensual".
        </div>
        <div style={{ display: "flex", gap: 8, maxWidth: 500, margin: "0 auto" }}>
          <input value={sheetInput} onChange={e => setSheetInput(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..."
            style={{ flex: 1, background: C.s, border: `1px solid ${C.b}`, borderRadius: 8, padding: "9px 12px", color: C.tx, fontSize: 12, fontFamily: F, outline: "none" }}
            onKeyDown={e => e.key === "Enter" && handleLink()} />
          <button onClick={handleLink} disabled={linking || !sheetInput}
            style={{ background: C.acc, color: "#000", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 12, fontWeight: 700, fontFamily: F, cursor: "pointer", opacity: linking || !sheetInput ? 0.4 : 1 }}>
            {linking ? "..." : "Vincular"}
          </button>
        </div>
        {error && <div style={{ color: C.r, fontSize: 11, marginTop: 8 }}>{error}</div>}
        {propSheetId && <button onClick={() => { setShowLink(false); setSheetId(propSheetId); }}
          style={{ background: "none", border: "none", color: C.tm, fontSize: 11, cursor: "pointer", marginTop: 12, fontFamily: F }}>← Volver al dashboard</button>}
      </div>
    );
  }

  // ─── PARSE DATA ───
  // KPIs sheet: Row 0 = headers, Row 1+ = data
  // Expected format: Métrica | Valor Actual | Valor Anterior | Meta | Tipo | Color
  const kpiCards = [];
  if (kpis.length > 1) {
    const headers = kpis[0];
    for (let i = 1; i < kpis.length; i++) {
      const row = kpis[i];
      if (!row[0]) continue;
      kpiCards.push({
        label: row[0] || "",
        value: row[1] || "0",
        prev: row[2] || "",
        target: row[3] || "",
        type: row[4] || "",
        color: row[5] || "",
      });
    }
  }

  // Monthly sheet: Row 0 = headers (Mes, Metric1, Metric2, ...)
  // Row 1+ = data per month
  const monthlyHeaders = monthly.length > 0 ? monthly[0] : [];
  const monthlyData = monthly.length > 1 ? monthly.slice(1) : [];
  const monthLabels = monthlyData.map(r => r[0] || "");

  // Build trend data per KPI (match by name)
  const trendMap = {};
  for (let col = 1; col < monthlyHeaders.length; col++) {
    const name = monthlyHeaders[col];
    if (name) trendMap[name.toLowerCase().trim()] = monthlyData.map(r => r[col] || "0");
  }

  // Match trends to KPI cards
  kpiCards.forEach(k => {
    const key = k.label.toLowerCase().trim();
    if (trendMap[key]) k.trend = trendMap[key];
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>📊</span>
          <span style={{ fontFamily: D, fontSize: 14, fontWeight: 700, color: C.tx }}>Dashboard de KPIs</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => fetchData(sheetId)} style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 6, padding: "4px 10px", color: C.tm, cursor: "pointer", fontSize: 11, fontFamily: F }}>🔄 Actualizar</button>
          {!readOnly && <button onClick={() => setShowLink(true)} style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 6, padding: "4px 10px", color: C.tm, cursor: "pointer", fontSize: 11, fontFamily: F }}>🔗 Cambiar</button>}
          {!readOnly && <button onClick={handleUnlink} style={{ background: "none", border: `1px solid ${C.r}30`, borderRadius: 6, padding: "4px 10px", color: C.r, cursor: "pointer", fontSize: 11, fontFamily: F }}>✕</button>}
        </div>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 24, color: C.tm, fontSize: 12 }}>Cargando datos...</div>}
      {error && <div style={{ color: C.r, fontSize: 12, padding: 8, marginBottom: 12 }}>{error}</div>}

      {!loading && kpiCards.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: 32, color: C.td, fontSize: 12 }}>
          No se encontraron datos. Asegúrate de que la hoja tenga la pestaña "KPIs" con datos.
        </div>
      )}

      {/* KPI Cards */}
      {kpiCards.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          {kpiCards.map((k, i) => (
            <KPICard key={i} label={k.label} value={k.value} prev={k.prev} type={k.type}
              color={k.color || COLORS[i % COLORS.length]} trend={k.trend} />
          ))}
        </div>
      )}

      {/* Monthly Charts */}
      {monthlyData.length > 0 && monthlyHeaders.length > 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {monthlyHeaders.slice(1).map((header, colIdx) => {
            const colData = monthlyData.map(r => r[colIdx + 1] || "0");
            const color = COLORS[colIdx % COLORS.length];
            return (
              <div key={colIdx} style={{ background: C.s, borderRadius: 14, border: `1px solid ${C.b}`, padding: 18 }}>
                <div style={{ fontFamily: D, fontSize: 13, fontWeight: 700, color: C.tx, marginBottom: 12 }}>{header}</div>
                <BarChart data={colData} labels={monthLabels} colors={colData.map(() => color)} h={140} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
