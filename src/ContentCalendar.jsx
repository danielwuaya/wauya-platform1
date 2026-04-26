import { useState, useEffect, useCallback } from "react";

const C = { bg:"#060B18",s:"#0A1428",s2:"#0F1D38",b:"#1A2D52",tx:"#F0F0F4",tm:"#8A94A8",td:"#4A5568",acc:"#F8BA10",r:"#FF4D6A",g:"#36DE67",w:"#FFC107",p:"#4A90D9",bl:"#60A5FA",blBg:"#0A1633" };
const F = "'Poppins', sans-serif", D = "'Playfair Display', serif";

const PLATFORMS = { instagram: { icon: "📸", color: "#E1306C" }, facebook: { icon: "📘", color: "#1877F2" }, tiktok: { icon: "🎵", color: "#00f2ea" }, linkedin: { icon: "💼", color: "#0A66C2" }, twitter: { icon: "🐦", color: "#1DA1F2" }, youtube: { icon: "▶️", color: "#FF0000" }, blog: { icon: "📝", color: "#34D399" }, email: { icon: "📧", color: "#F59E0B" }, otro: { icon: "📌", color: "#9898A8" } };
const POST_STATUS = { pendiente: { color: "#6B7280", label: "Pendiente" }, aprobado: { color: "#34D399", label: "Aprobado" }, publicado: { color: "#60A5FA", label: "Publicado" }, borrador: { color: "#F59E0B", label: "Borrador" } };
const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function extractSheetId(url) { const m = url?.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/); return m ? m[1] : (/^[a-zA-Z0-9_-]{30,}$/.test(url) ? url : null); }

export default function ContentCalendar({ sheetId: propSheetId, onLink, onUnlink, readOnly = false }) {
  const [sheetInput, setSheetInput] = useState("");
  const [sheetId, setSheetId] = useState(propSheetId || null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showLink, setShowLink] = useState(!propSheetId);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchData = useCallback(async (sid) => {
    if (!sid) return;
    setLoading(true); setError("");
    try {
      const r = await fetch(`/api/sheets?sheetId=${sid}&range=Calendario!A1:Z200`);
      const d = await r.json();
      if (d.error) { setError(d.error); setLoading(false); return; }
      if (Array.isArray(d) && d.length > 1) {
        const parsed = d.slice(1).map(row => ({
          date: row[0] || "", platform: (row[1] || "").toLowerCase().trim(), type: row[2] || "",
          description: row[3] || "", status: (row[4] || "pendiente").toLowerCase().trim(), time: row[5] || "",
        })).filter(p => p.date);
        setPosts(parsed);
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
        <div style={{ fontSize: 28, marginBottom: 6 }}>📅</div>
        <div style={{ fontFamily: D, fontSize: 13, fontWeight: 600, color: C.tx, marginBottom: 4 }}>Vincular calendario de contenido</div>
        <div style={{ fontSize: 11, color: C.td, marginBottom: 14, lineHeight: 1.5 }}>
          La hoja debe tener una pestaña "Calendario" con columnas: Fecha, Plataforma, Tipo, Descripción, Estado, Hora
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

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
  const totalDays = lastDay.getDate();
  const weeks = [];
  let current = 1 - startOffset;
  while (current <= totalDays) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(current > 0 && current <= totalDays ? current : null);
      current++;
    }
    weeks.push(week);
  }

  // Match posts to dates
  const getPostsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return posts.filter(p => {
      try {
        const parts = p.date.includes("/") ? p.date.split("/") : p.date.includes("-") ? p.date.split("-") : [];
        if (parts.length < 3) return false;
        let y, m, d;
        if (parts[0].length === 4) { y = parts[0]; m = parts[1]; d = parts[2]; }
        else { d = parts[0]; m = parts[1]; y = parts[2]; }
        const normalized = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        return normalized === dateStr;
      } catch { return false; }
    });
  };

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); };
  const isToday = (day) => { const t = new Date(); return day === t.getDate() && month === t.getMonth() && year === t.getFullYear(); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={prevMonth} style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 6, padding: "4px 10px", color: C.tm, cursor: "pointer", fontSize: 14 }}>←</button>
          <span style={{ fontFamily: D, fontSize: 15, fontWeight: 700, color: C.tx, minWidth: 160, textAlign: "center" }}>{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 6, padding: "4px 10px", color: C.tm, cursor: "pointer", fontSize: 14 }}>→</button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => fetchData(sheetId)} style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 6, padding: "4px 10px", color: C.tm, cursor: "pointer", fontSize: 11, fontFamily: F }}>🔄</button>
          {!readOnly && <button onClick={() => { setShowLink(true); }} style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 6, padding: "4px 10px", color: C.tm, cursor: "pointer", fontSize: 11, fontFamily: F }}>🔗</button>}
          {!readOnly && <button onClick={async () => { setSheetId(null); setPosts([]); setShowLink(true); if (onUnlink) await onUnlink(); }} style={{ background: "none", border: `1px solid ${C.r}30`, borderRadius: 6, padding: "4px 10px", color: C.r, cursor: "pointer", fontSize: 11 }}>✕</button>}
        </div>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 20, color: C.tm, fontSize: 12 }}>Cargando...</div>}
      {error && <div style={{ color: C.r, fontSize: 12, marginBottom: 10 }}>{error}</div>}

      {!loading && (
        <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${C.b}` }}>
          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: C.s }}>
            {DAYS.map(d => <div key={d} style={{ padding: "6px 4px", textAlign: "center", fontSize: 10, fontWeight: 700, color: C.tm, fontFamily: F, borderBottom: `1px solid ${C.b}` }}>{d}</div>)}
          </div>
          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
              {week.map((day, di) => {
                const dayPosts = getPostsForDay(day);
                const today = isToday(day);
                return (
                  <div key={di} style={{ minHeight: 70, padding: 4, borderRight: di < 6 ? `1px solid ${C.b}15` : "none", borderBottom: `1px solid ${C.b}15`, background: day ? (today ? C.acc + "08" : "transparent") : C.bg + "50" }}>
                    {day && (
                      <>
                        <div style={{ fontSize: 11, fontWeight: today ? 700 : 400, color: today ? C.acc : C.tm, fontFamily: F, marginBottom: 3 }}>{day}</div>
                        {dayPosts.slice(0, 3).map((p, pi) => {
                          const plat = PLATFORMS[p.platform] || PLATFORMS.otro;
                          const st = POST_STATUS[p.status] || POST_STATUS.pendiente;
                          return (
                            <div key={pi} style={{ fontSize: 9, padding: "2px 4px", borderRadius: 4, marginBottom: 2, background: st.color + "15", borderLeft: `2px solid ${st.color}`, color: C.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "default" }}
                              title={`${p.description}\n${p.platform} · ${p.type} · ${st.label}${p.time ? " · " + p.time : ""}`}>
                              <span style={{ marginRight: 3 }}>{plat.icon}</span>{p.description || p.type}
                            </div>
                          );
                        })}
                        {dayPosts.length > 3 && <div style={{ fontSize: 8, color: C.td, paddingLeft: 4 }}>+{dayPosts.length - 3} más</div>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
        {Object.entries(POST_STATUS).map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.tm }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: v.color }} />{v.label}
          </div>
        ))}
      </div>
    </div>
  );
}
