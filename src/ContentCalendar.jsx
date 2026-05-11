import { useState, useEffect, useCallback } from "react";

const C = { bg:"#060B18",s:"#0A1428",s2:"#0F1D38",b:"#1A2D52",tx:"#F0F0F4",tm:"#8A94A8",td:"#4A5568",acc:"#F8BA10",r:"#FF4D6A",g:"#36DE67",w:"#FFC107",p:"#4A90D9",bl:"#60A5FA",blBg:"#0A1633" };
const F = "'Poppins', sans-serif", D = "'Playfair Display', serif";
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MSHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const PLAT_COLORS = { instagram:"#E1306C", facebook:"#1877F2", tiktok:"#00F2EA", linkedin:"#0A66C2", twitter:"#1DA1F2", youtube:"#FF0000", blog:"#F59E0B", email:"#10B981", otro:"#6B7280" };
const STATUS_COLORS = { pendiente:"#6B7280", "en diseño":"#F59E0B", "en revisión":"#8B5CF6", aprobado:"#10B981", programado:"#3B82F6", publicado:"#36DE67" };
const FORMATO_ICONS = { reel:"🎬", carrusel:"📱", imagen:"🖼️", story:"📸", video:"🎥", blog:"📝", email:"📧", "infografía":"📊", otro:"📎" };

function extractSheetId(url) { const m = url?.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/); return m ? m[1] : (/^[a-zA-Z0-9_-]{30,}$/.test(url) ? url : null); }

export default function ContentCalendar({ sheetId: propSheetId, onLink, onUnlink, readOnly = false }) {
  const [sheetInput, setSheetInput] = useState("");
  const [sheetId, setSheetId] = useState(propSheetId || null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showLink, setShowLink] = useState(!propSheetId);
  const [selMonth, setSelMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selPost, setSelPost] = useState(null);
  const [viewMode, setViewMode] = useState("calendar"); // calendar or list

  const fetchData = useCallback(async (sid) => {
    if (!sid) return;
    setLoading(true); setError("");
    try {
      const r = await fetch(`/api/sheets?sheetId=${sid}&range=Calendario!A1:I500`);
      const d = await r.json();
      if (d.error) { setError(d.error); setLoading(false); return; }
      if (Array.isArray(d) && d.length > 1) {
        const parsed = d.slice(1).filter(row => row[0]).map((row, i) => ({
          id: i,
          mes: (row[0] || "").trim(),
          contenido: (row[1] || "").trim(),
          formato: (row[2] || "").trim(),
          plataforma: (row[3] || "").trim(),
          tipo: (row[4] || "").trim(),
          responsable: (row[5] || "").trim(),
          status: (row[6] || "pendiente").trim().toLowerCase(),
          fecha: (row[7] || "").trim(),
          copy: (row[8] || "").trim(),
        }));
        setPosts(parsed);
        // Auto-select first month with data
        const months = [...new Set(parsed.map(p => p.mes))];
        if (months.length > 0 && !months.includes(selMonth)) setSelMonth(months[0]);
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
        <div style={{ fontSize: 28, marginBottom: 6 }}>📅</div>
        <div style={{ fontFamily: D, fontSize: 13, fontWeight: 600, color: C.tx, marginBottom: 4 }}>Vincular calendario de contenido</div>
        <div style={{ fontSize: 11, color: C.td, marginBottom: 14, lineHeight: 1.5 }}>
          La pestaña debe llamarse "Calendario" con columnas: Mes, Contenido, Formato, Plataforma, Tipo, Responsable, Status, Fecha, Copy
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

  // Filter by month
  const monthPosts = posts.filter(p => p.mes === selMonth);
  const availableMonths = [...new Set(posts.map(p => p.mes))];

  // Stats
  const statusCounts = {};
  monthPosts.forEach(p => { statusCounts[p.status] = (statusCounts[p.status] || 0) + 1; });
  const byPlatform = {};
  monthPosts.forEach(p => { const k = p.plataforma.toLowerCase(); byPlatform[k] = (byPlatform[k] || 0) + 1; });
  const byResponsable = {};
  monthPosts.forEach(p => { if (p.responsable) byResponsable[p.responsable] = (byResponsable[p.responsable] || 0) + 1; });

  // Calendar grid
  const daysInMonth = (month) => {
    const mi = MONTHS.indexOf(month);
    if (mi === -1) return [];
    const year = new Date().getFullYear();
    const firstDay = new Date(year, mi, 1).getDay();
    const totalDays = new Date(year, mi + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);
    return cells;
  };

  const getPostsForDay = (day) => {
    if (!day) return [];
    const mi = MONTHS.indexOf(selMonth);
    const pad = (n) => String(n).padStart(2, "0");
    const year = new Date().getFullYear();
    const dateStr = `${year}-${pad(mi + 1)}-${pad(day)}`;
    return monthPosts.filter(p => p.fecha === dateStr);
  };

  const days = daysInMonth(selMonth);
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>📅</span>
          <span style={{ fontFamily: D, fontSize: 14, fontWeight: 700, color: C.tx }}>Calendario de contenido</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setViewMode(viewMode === "calendar" ? "list" : "calendar")} style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 6, padding: "4px 10px", color: C.tm, cursor: "pointer", fontSize: 11, fontFamily: F }}>{viewMode === "calendar" ? "📋 Lista" : "📅 Calendario"}</button>
          <button onClick={() => fetchData(sheetId)} style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 6, padding: "4px 10px", color: C.tm, cursor: "pointer", fontSize: 11, fontFamily: F }}>🔄</button>
          {!readOnly && <button onClick={async () => { setSheetId(null); setPosts([]); setShowLink(true); if (onUnlink) await onUnlink(); }} style={{ background: "none", border: `1px solid ${C.r}30`, borderRadius: 6, padding: "4px 10px", color: C.r, cursor: "pointer", fontSize: 11 }}>✕</button>}
        </div>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 20, color: C.tm, fontSize: 12 }}>Cargando...</div>}
      {error && <div style={{ color: C.r, fontSize: 12, marginBottom: 10 }}>{error}</div>}

      {!loading && posts.length > 0 && (
        <>
          {/* Month selector */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {availableMonths.map(m => (
              <button key={m} onClick={() => { setSelMonth(m); setSelPost(null); }} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${selMonth === m ? C.acc : C.b}`, background: selMonth === m ? C.acc + "15" : "transparent", color: selMonth === m ? C.acc : C.tm, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: F }}>{m}</button>
            ))}
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <div style={{ fontSize: 11, color: C.tx, fontWeight: 600 }}>{monthPosts.length} posts</div>
            {Object.entries(statusCounts).map(([st, cnt]) => {
              const color = STATUS_COLORS[st] || "#6B7280";
              return <span key={st} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: color + "20", color, fontWeight: 600 }}>{st} ({cnt})</span>;
            })}
            <span style={{ fontSize: 10, color: C.td }}>|</span>
            {Object.entries(byResponsable).map(([name, cnt]) => (
              <span key={name} style={{ fontSize: 10, color: C.tm }}>👤 {name}: {cnt}</span>
            ))}
          </div>

          {/* CALENDAR VIEW */}
          {viewMode === "calendar" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
                {weekDays.map(d => (
                  <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 600, color: C.tm, padding: 4 }}>{d}</div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                {days.map((day, i) => {
                  if (!day) return <div key={"e" + i} />;
                  const dayPosts = getPostsForDay(day);
                  const isToday = day === new Date().getDate() && MONTHS.indexOf(selMonth) === new Date().getMonth();
                  return (
                    <div key={day} style={{ background: isToday ? C.acc + "10" : C.bg, border: `1px solid ${isToday ? C.acc : C.b}`, borderRadius: 6, padding: 4, minHeight: 65, cursor: dayPosts.length > 0 ? "pointer" : "default" }} onClick={() => { if (dayPosts.length > 0) setSelPost(dayPosts[0]); }}>
                      <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? C.acc : C.tx, marginBottom: 2 }}>{day}</div>
                      {dayPosts.slice(0, 2).map((p, pi) => {
                        const platColor = PLAT_COLORS[p.plataforma.toLowerCase()] || "#6B7280";
                        const fmtIcon = FORMATO_ICONS[p.formato.toLowerCase()] || "📎";
                        return (
                          <div key={pi} onClick={(e) => { e.stopPropagation(); setSelPost(p); }} style={{ fontSize: 8, padding: "2px 4px", borderRadius: 3, background: platColor + "20", color: platColor, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", fontWeight: 500, lineHeight: 1.3 }}>
                            {fmtIcon} {p.contenido.slice(0, 18)}
                          </div>
                        );
                      })}
                      {dayPosts.length > 2 && <div style={{ fontSize: 8, color: C.td }}>+{dayPosts.length - 2} más</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LIST VIEW */}
          {viewMode === "list" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 400, overflow: "auto" }}>
              {monthPosts.map((p, i) => {
                const platColor = PLAT_COLORS[p.plataforma.toLowerCase()] || "#6B7280";
                const statusColor = STATUS_COLORS[p.status] || "#6B7280";
                const fmtIcon = FORMATO_ICONS[p.formato.toLowerCase()] || "📎";
                return (
                  <div key={i} onClick={() => setSelPost(p)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: i % 2 === 0 ? C.bg : "transparent", borderRadius: 6, cursor: "pointer", border: `1px solid ${selPost?.id === p.id ? C.acc : "transparent"}` }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{fmtIcon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: C.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.contenido}</div>
                      <div style={{ fontSize: 9, color: C.td, display: "flex", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                        <span style={{ color: platColor, fontWeight: 600 }}>{p.plataforma}</span>
                        <span>{p.formato}</span>
                        <span>{p.tipo}</span>
                        {p.responsable && <span>👤 {p.responsable}</span>}
                        {p.fecha && <span>📅 {p.fecha}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: statusColor + "20", color: statusColor, fontWeight: 600, flexShrink: 0 }}>{p.status}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* POST DETAIL */}
          {selPost && (
            <div style={{ marginTop: 14, background: C.bg, borderRadius: 10, border: `1px solid ${C.acc}30`, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontFamily: D, fontSize: 14, fontWeight: 700, color: C.tx }}>{selPost.contenido}</div>
                  <div style={{ fontSize: 11, color: C.td, marginTop: 2 }}>{selPost.mes} · {selPost.fecha}</div>
                </div>
                <button onClick={() => setSelPost(null)} style={{ background: "none", border: "none", color: C.tm, cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: (PLAT_COLORS[selPost.plataforma.toLowerCase()] || "#6B7280") + "20", color: PLAT_COLORS[selPost.plataforma.toLowerCase()] || "#6B7280", fontWeight: 600 }}>{selPost.plataforma}</span>
                <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: C.s2, color: C.tm, border: `1px solid ${C.b}` }}>{FORMATO_ICONS[selPost.formato.toLowerCase()] || "📎"} {selPost.formato}</span>
                <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: C.s2, color: C.tm, border: `1px solid ${C.b}` }}>{selPost.tipo}</span>
                <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: (STATUS_COLORS[selPost.status] || "#6B7280") + "20", color: STATUS_COLORS[selPost.status] || "#6B7280", fontWeight: 600 }}>{selPost.status}</span>
                {selPost.responsable && <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: C.p + "20", color: C.p }}>👤 {selPost.responsable}</span>}
              </div>
              {selPost.copy && (
                <div style={{ background: C.s, borderRadius: 8, padding: 12, border: `1px solid ${C.b}` }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: C.acc, marginBottom: 6 }}>COPY DEL POST:</div>
                  <div style={{ fontSize: 12, color: C.tx, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{selPost.copy}</div>
                  <button onClick={() => { navigator.clipboard.writeText(selPost.copy); alert("Copy copiado al portapapeles"); }} style={{ marginTop: 8, background: C.s2, border: `1px solid ${C.b}`, borderRadius: 6, padding: "4px 12px", color: C.tm, cursor: "pointer", fontSize: 10, fontFamily: F }}>📋 Copiar copy</button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!loading && posts.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: 28, color: C.td, fontSize: 12 }}>
          Sin datos. Verifica que la pestaña se llame "Calendario" con columnas: Mes, Contenido, Formato, Plataforma, Tipo, Responsable, Status, Fecha, Copy
        </div>
      )}
    </div>
  );
}
