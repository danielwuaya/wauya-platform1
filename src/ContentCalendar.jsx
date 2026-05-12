import { useState, useEffect, useCallback } from "react";

const C = { bg:"#060B18",s:"#0A1428",s2:"#0F1D38",b:"#1A2D52",tx:"#F0F0F4",tm:"#8A94A8",td:"#4A5568",acc:"#F8BA10",r:"#FF4D6A",g:"#36DE67",w:"#FFC107",p:"#4A90D9",bl:"#60A5FA",blBg:"#0A1633" };
const F = "'Poppins', sans-serif", D = "'Playfair Display', serif";
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const PLAT = { instagram:{color:"#E1306C",icon:"📸"}, facebook:{color:"#1877F2",icon:"📘"}, tiktok:{color:"#00F2EA",icon:"🎵"}, linkedin:{color:"#0A66C2",icon:"💼"}, twitter:{color:"#1DA1F2",icon:"🐦"}, youtube:{color:"#FF0000",icon:"▶️"}, blog:{color:"#F59E0B",icon:"📝"}, email:{color:"#10B981",icon:"📧"}, otro:{color:"#6B7280",icon:"📎"} };
const STAT = { pendiente:{color:"#6B7280",bg:"#6B728015"}, "en diseño":{color:"#F59E0B",bg:"#F59E0B15"}, "en revisión":{color:"#8B5CF6",bg:"#8B5CF615"}, aprobado:{color:"#10B981",bg:"#10B98115"}, programado:{color:"#3B82F6",bg:"#3B82F615"}, publicado:{color:"#36DE67",bg:"#36DE6715"} };
const FMT = { reel:"🎬", carrusel:"📱", imagen:"🖼️", story:"📸", video:"🎥", blog:"📝", email:"📧", "infografía":"📊", otro:"📎" };

function extractSheetId(url) { const m = url?.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/); return m ? m[1] : (/^[a-zA-Z0-9_-]{30,}$/.test(url) ? url : null); }

const calCSS = `
.cal3d-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;perspective:1200px}
.cal3d-day{background:linear-gradient(145deg,rgba(15,29,56,.8),rgba(10,20,40,.9));border:1px solid rgba(26,45,82,.6);border-radius:12px;padding:6px;min-height:85px;cursor:pointer;transition:all .3s cubic-bezier(.4,0,.2,1);transform-style:preserve-3d;position:relative;overflow:hidden;backdrop-filter:blur(10px)}
.cal3d-day::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(248,186,16,.15),transparent)}
.cal3d-day:hover{transform:translateY(-4px) rotateX(2deg);border-color:rgba(248,186,16,.35);box-shadow:0 8px 25px rgba(0,0,0,.4),0 0 15px rgba(248,186,16,.08)}
.cal3d-today{border-color:rgba(248,186,16,.5);box-shadow:0 0 20px rgba(248,186,16,.12)}
.cal3d-today::after{content:'';position:absolute;bottom:0;left:10%;right:10%;height:2px;background:linear-gradient(90deg,transparent,#F8BA10,transparent);border-radius:1px}
.cal3d-post{padding:3px 5px;border-radius:6px;margin-bottom:3px;font-size:9px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;transition:all .2s;border-left:2px solid;backdrop-filter:blur(4px)}
.cal3d-post:hover{transform:scale(1.03);filter:brightness(1.15)}
.cal3d-month-btn{padding:6px 16px;border-radius:20px;border:1px solid transparent;background:transparent;color:#8A94A8;cursor:pointer;font-size:12px;font-weight:500;font-family:'Poppins',sans-serif;transition:all .25s}
.cal3d-month-btn.active{background:linear-gradient(135deg,#F8BA10,#D4A00E);color:#060B18;border-color:#F8BA10;font-weight:700;box-shadow:0 4px 15px rgba(248,186,16,.25)}
.cal3d-month-btn:hover:not(.active){background:rgba(248,186,16,.1);color:#F8BA10;border-color:rgba(248,186,16,.3)}
.cal3d-stat{background:linear-gradient(145deg,rgba(15,29,56,.7),rgba(10,20,40,.8));border:1px solid rgba(26,45,82,.5);border-radius:14px;padding:12px 16px;backdrop-filter:blur(8px);transition:all .3s}
.cal3d-stat:hover{transform:translateY(-2px);border-color:rgba(248,186,16,.2)}
.cal3d-detail{background:linear-gradient(145deg,rgba(15,29,56,.9),rgba(6,11,24,.95));border:1px solid rgba(248,186,16,.2);border-radius:16px;padding:20px;backdrop-filter:blur(12px);animation:cal3d-in .3s ease}
@keyframes cal3d-in{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
.cal3d-badge{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-size:10px;font-weight:600;backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,.08)}
.cal3d-copy-box{background:linear-gradient(145deg,rgba(10,20,40,.9),rgba(6,11,24,.95));border:1px solid rgba(26,45,82,.6);border-radius:12px;padding:16px;position:relative;overflow:hidden}
.cal3d-copy-box::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(248,186,16,.2),transparent)}
.cal3d-list-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;cursor:pointer;transition:all .25s;border:1px solid transparent;background:linear-gradient(145deg,rgba(15,29,56,.5),rgba(10,20,40,.6))}
.cal3d-list-item:hover{transform:translateX(4px);border-color:rgba(248,186,16,.2);background:linear-gradient(145deg,rgba(15,29,56,.8),rgba(10,20,40,.9))}
.cal3d-wday{text-align:center;font-size:10px;font-weight:600;color:#8A94A8;padding:6px;text-transform:uppercase;letter-spacing:.08em}
`;

export default function ContentCalendar({ sheetId: propSheetId, onLink, onUnlink, readOnly = false }) {
  const [sheetInput, setSheetInput] = useState("");
  const [sheetId, setSheetId] = useState(propSheetId || null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showLink, setShowLink] = useState(!propSheetId);
  const [selMonth, setSelMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selPost, setSelPost] = useState(null);
  const [viewMode, setViewMode] = useState("calendar");

  const fetchData = useCallback(async (sid) => {
    if (!sid) return;
    setLoading(true); setError("");
    try {
      const r = await fetch(`/api/sheets?sheetId=${sid}&range=Calendario!A1:I500`);
      const d = await r.json();
      if (d.error) { setError(d.error); setLoading(false); return; }
      if (Array.isArray(d) && d.length > 1) {
        const parsed = d.slice(1).filter(row => row[0]).map((row, i) => ({
          id: i, mes: (row[0]||"").trim(), contenido: (row[1]||"").trim(), formato: (row[2]||"").trim(),
          plataforma: (row[3]||"").trim(), tipo: (row[4]||"").trim(), responsable: (row[5]||"").trim(),
          status: (row[6]||"pendiente").trim().toLowerCase(), fecha: (row[7]||"").trim(), copy: (row[8]||"").trim(),
        }));
        setPosts(parsed);
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

  if (!sheetId || showLink) {
    if (readOnly) return null;
    return (
      <div style={{ background: `linear-gradient(145deg,${C.s},${C.bg})`, borderRadius: 16, border: `2px dashed ${C.b}`, padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
        <div style={{ fontFamily: D, fontSize: 15, fontWeight: 700, color: C.tx, marginBottom: 6 }}>Vincular calendario de contenido</div>
        <div style={{ fontSize: 11, color: C.td, marginBottom: 16, lineHeight: 1.6 }}>
          Pestaña "Calendario" con: Mes, Contenido, Formato, Plataforma, Tipo, Responsable, Status, Fecha, Copy
        </div>
        <div style={{ display: "flex", gap: 8, maxWidth: 480, margin: "0 auto" }}>
          <input value={sheetInput} onChange={e => setSheetInput(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..."
            style={{ flex: 1, background: C.bg, border: `1px solid ${C.b}`, borderRadius: 10, padding: "10px 12px", color: C.tx, fontSize: 12, fontFamily: F, outline: "none" }}
            onFocus={e => e.target.style.borderColor = C.acc} onBlur={e => e.target.style.borderColor = C.b}
            onKeyDown={e => e.key === "Enter" && handleLink()} />
          <button onClick={handleLink} disabled={!sheetInput} style={{ background: `linear-gradient(135deg,${C.acc},#D4A00E)`, color: "#060B18", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 12, fontWeight: 700, fontFamily: F, cursor: "pointer", opacity: sheetInput ? 1 : 0.4, boxShadow: "0 4px 15px rgba(248,186,16,.25)" }}>Vincular</button>
        </div>
        {error && <div style={{ color: C.r, fontSize: 11, marginTop: 8 }}>{error}</div>}
      </div>
    );
  }

  const monthPosts = posts.filter(p => p.mes === selMonth);
  const availableMonths = [...new Set(posts.map(p => p.mes))];
  const statusCounts = {}; monthPosts.forEach(p => { statusCounts[p.status] = (statusCounts[p.status] || 0) + 1; });
  const byResponsable = {}; monthPosts.forEach(p => { if (p.responsable) byResponsable[p.responsable] = (byResponsable[p.responsable] || 0) + 1; });
  const byPlatform = {}; monthPosts.forEach(p => { const k = p.plataforma.toLowerCase(); byPlatform[k] = (byPlatform[k] || 0) + 1; });

  const daysInMonth = (month) => {
    const mi = MONTHS.indexOf(month); if (mi === -1) return [];
    const year = new Date().getFullYear();
    const firstDay = new Date(year, mi, 1).getDay();
    const totalDays = new Date(year, mi + 1, 0).getDate();
    const cells = []; for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d); return cells;
  };
  const getPostsForDay = (day) => {
    if (!day) return [];
    const mi = MONTHS.indexOf(selMonth); const pad = n => String(n).padStart(2, "0");
    const dateStr = `${new Date().getFullYear()}-${pad(mi + 1)}-${pad(day)}`;
    return monthPosts.filter(p => p.fecha === dateStr);
  };
  const days = daysInMonth(selMonth);
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  return (
    <div>
      <style>{calCSS}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${C.acc},#D4A00E)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 4px 12px rgba(248,186,16,.2)" }}>📅</div>
          <div>
            <div style={{ fontFamily: D, fontSize: 16, fontWeight: 700, color: C.tx }}>Calendario de contenido</div>
            <div style={{ fontSize: 10, color: C.td }}>{monthPosts.length} posts en {selMonth}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setViewMode(viewMode === "calendar" ? "list" : "calendar")} style={{ background: `linear-gradient(145deg,${C.s2},${C.s})`, border: `1px solid ${C.b}`, borderRadius: 8, padding: "6px 12px", color: C.tm, cursor: "pointer", fontSize: 11, fontFamily: F, transition: "all .2s" }}>{viewMode === "calendar" ? "📋 Lista" : "📅 Calendario"}</button>
          <button onClick={() => fetchData(sheetId)} style={{ background: `linear-gradient(145deg,${C.s2},${C.s})`, border: `1px solid ${C.b}`, borderRadius: 8, padding: "6px 12px", color: C.tm, cursor: "pointer", fontSize: 11, fontFamily: F }}>🔄</button>
          {!readOnly && <button onClick={async () => { setSheetId(null); setPosts([]); setShowLink(true); if (onUnlink) await onUnlink(); }} style={{ background: "none", border: `1px solid ${C.r}30`, borderRadius: 8, padding: "6px 12px", color: C.r, cursor: "pointer", fontSize: 11 }}>✕</button>}
        </div>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 24, color: C.acc, fontSize: 13 }}>Cargando calendario...</div>}
      {error && <div style={{ color: C.r, fontSize: 12, marginBottom: 10 }}>{error}</div>}

      {!loading && posts.length > 0 && (
        <>
          {/* Month tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", background: `linear-gradient(145deg,rgba(15,29,56,.4),rgba(10,20,40,.5))`, padding: "8px 10px", borderRadius: 14, border: `1px solid ${C.b}` }}>
            {availableMonths.map(m => (
              <button key={m} className={`cal3d-month-btn${selMonth === m ? " active" : ""}`} onClick={() => { setSelMonth(m); setSelPost(null); }}>{m}</button>
            ))}
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {Object.entries(byPlatform).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([pk, cnt]) => {
              const p = PLAT[pk] || PLAT.otro;
              return <div key={pk} className="cal3d-stat" style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 90 }}>
                <span style={{ fontSize: 14 }}>{p.icon}</span>
                <div><div style={{ fontSize: 16, fontWeight: 800, color: p.color, fontFamily: D }}>{cnt}</div>
                <div style={{ fontSize: 9, color: C.td, textTransform: "capitalize" }}>{pk}</div></div>
              </div>;
            })}
            <div className="cal3d-stat" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14 }}>📊</span>
              <div>{Object.entries(statusCounts).map(([st, cnt]) => {
                const s = STAT[st] || STAT.pendiente;
                return <span key={st} style={{ fontSize: 9, color: s.color, marginRight: 8 }}>{st}: <strong>{cnt}</strong></span>;
              })}</div>
            </div>
          </div>

          {/* CALENDAR VIEW */}
          {viewMode === "calendar" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 4 }}>
                {weekDays.map(d => <div key={d} className="cal3d-wday">{d}</div>)}
              </div>
              <div className="cal3d-grid">
                {days.map((day, i) => {
                  if (!day) return <div key={"e" + i} />;
                  const dayPosts = getPostsForDay(day);
                  const isToday = day === new Date().getDate() && MONTHS.indexOf(selMonth) === new Date().getMonth();
                  return (
                    <div key={day} className={`cal3d-day${isToday ? " cal3d-today" : ""}`} onClick={() => { if (dayPosts.length > 0) setSelPost(dayPosts[0]); }}>
                      <div style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: isToday ? C.acc : C.tx, marginBottom: 3, fontFamily: D }}>{day}</div>
                      {dayPosts.slice(0, 3).map((p, pi) => {
                        const pl = PLAT[p.plataforma.toLowerCase()] || PLAT.otro;
                        return (
                          <div key={pi} className="cal3d-post" onClick={e => { e.stopPropagation(); setSelPost(p); }}
                            style={{ background: pl.color + "12", color: pl.color, borderLeftColor: pl.color }}>
                            {FMT[p.formato.toLowerCase()] || "📎"} {p.contenido.slice(0, 16)}
                          </div>
                        );
                      })}
                      {dayPosts.length > 3 && <div style={{ fontSize: 8, color: C.acc, textAlign: "center" }}>+{dayPosts.length - 3}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LIST VIEW */}
          {viewMode === "list" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 450, overflow: "auto" }}>
              {monthPosts.map((p, i) => {
                const pl = PLAT[p.plataforma.toLowerCase()] || PLAT.otro;
                const st = STAT[p.status] || STAT.pendiente;
                return (
                  <div key={i} className="cal3d-list-item" onClick={() => setSelPost(p)}
                    style={{ borderColor: selPost?.id === p.id ? C.acc + "50" : "transparent" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: pl.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, border: `1px solid ${pl.color}30` }}>{pl.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.contenido}</div>
                      <div style={{ fontSize: 9, color: C.td, display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
                        <span style={{ color: pl.color }}>{p.plataforma}</span>
                        <span>{FMT[p.formato.toLowerCase()] || "📎"} {p.formato}</span>
                        <span>{p.tipo}</span>
                        {p.responsable && <span>👤 {p.responsable}</span>}
                        {p.fecha && <span>📅 {p.fecha.slice(5)}</span>}
                      </div>
                    </div>
                    <span className="cal3d-badge" style={{ background: st.bg, color: st.color }}>{p.status}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* POST DETAIL */}
          {selPost && (
            <div className="cal3d-detail" style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: D, fontSize: 16, fontWeight: 700, color: C.tx, lineHeight: 1.3 }}>{selPost.contenido}</div>
                  <div style={{ fontSize: 11, color: C.td, marginTop: 4 }}>{selPost.mes} · {selPost.fecha}</div>
                </div>
                <button onClick={() => setSelPost(null)} style={{ background: `linear-gradient(145deg,${C.s2},${C.s})`, border: `1px solid ${C.b}`, borderRadius: 8, width: 28, height: 28, color: C.tm, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>

              <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                {[
                  { label: selPost.plataforma, color: (PLAT[selPost.plataforma.toLowerCase()] || PLAT.otro).color, icon: (PLAT[selPost.plataforma.toLowerCase()] || PLAT.otro).icon },
                  { label: selPost.formato, color: C.tm, icon: FMT[selPost.formato.toLowerCase()] || "📎" },
                  { label: selPost.tipo, color: C.bl },
                  { label: selPost.status, color: (STAT[selPost.status] || STAT.pendiente).color },
                ].map((b, i) => (
                  <span key={i} className="cal3d-badge" style={{ background: b.color + "15", color: b.color }}>{b.icon || ""} {b.label}</span>
                ))}
                {selPost.responsable && <span className="cal3d-badge" style={{ background: C.p + "15", color: C.p }}>👤 {selPost.responsable}</span>}
              </div>

              {selPost.copy && (
                <div className="cal3d-copy-box">
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.acc, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".08em" }}>Copy del post</div>
                  <div style={{ fontSize: 13, color: C.tx, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{selPost.copy}</div>
                  <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                    <button onClick={() => { navigator.clipboard.writeText(selPost.copy); alert("Copy copiado"); }} style={{ background: `linear-gradient(135deg,${C.acc},#D4A00E)`, border: "none", borderRadius: 8, padding: "7px 14px", color: "#060B18", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: F, boxShadow: "0 3px 10px rgba(248,186,16,.2)" }}>📋 Copiar copy</button>
                    {selPost.copy.includes("#") && <button onClick={() => { const tags = selPost.copy.match(/#\w+/g); if (tags) { navigator.clipboard.writeText(tags.join(" ")); alert("Hashtags copiados"); } }} style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 8, padding: "7px 14px", color: C.tm, cursor: "pointer", fontSize: 11, fontFamily: F }}>#️⃣ Copiar hashtags</button>}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!loading && posts.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: 32, color: C.td, fontSize: 12 }}>
          Sin datos. Pestaña "Calendario" con: Mes, Contenido, Formato, Plataforma, Tipo, Responsable, Status, Fecha, Copy
        </div>
      )}
    </div>
  );
}
