import { useState, useEffect, useCallback } from "react";

const C = { bg:"#060B18",s:"#0A1428",s2:"#0F1D38",b:"#1A2D52",tx:"#F0F0F4",tm:"#8A94A8",td:"#4A5568",acc:"#F8BA10",r:"#FF4D6A",g:"#36DE67",w:"#FFC107",p:"#4A90D9",bl:"#60A5FA" };
const F = "'Poppins', sans-serif", D = "'Playfair Display', serif";

const PLAT_COLORS = { instagram:"#E1306C", facebook:"#1877F2", tiktok:"#00F2EA", linkedin:"#0A66C2", twitter:"#1DA1F2", youtube:"#FF0000", reels:"#E1306C" };
const STATUS_COLORS = { pendiente:"#6B7280", "en diseño":"#F59E0B", "en revisión":"#8B5CF6", aprobado:"#36DE67", programado:"#3B82F6", publicado:"#36DE67" };
const TYPE_ICONS = { post:"📷", carrusel:"📱", carousel:"📱", motion:"🎬", reel:"🎥", video:"🎥", story:"📸", imagen:"🖼️", blog:"📝", otro:"📎" };

function extractSheetId(url) { const m = url?.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/); return m ? m[1] : (/^[a-zA-Z0-9_-]{30,}$/.test(url) ? url : null); }

function getPlatColor(plat) {
  const p = (plat || "").toLowerCase();
  for (const [k, v] of Object.entries(PLAT_COLORS)) { if (p.includes(k)) return v; }
  return "#6B7280";
}

const calCSS = `
.cal3d-week{margin-bottom:16px}
.cal3d-week-head{display:flex;align-items:center;gap:8px;padding:8px 0;margin-bottom:8px}
.cal3d-week-label{font-size:13px;font-weight:600;color:var(--acc,#F8BA10);text-transform:uppercase;letter-spacing:.05em}
.cal3d-week-count{font-size:10px;padding:2px 8px;border-radius:10px;background:rgba(248,186,16,.12);color:#F8BA10}
.cal3d-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;border:1px solid rgba(26,45,82,.5);background:linear-gradient(145deg,rgba(15,29,56,.7),rgba(10,20,40,.8));margin-bottom:6px;cursor:pointer;transition:all .25s;backdrop-filter:blur(8px)}
.cal3d-item:hover{transform:translateX(4px);border-color:rgba(248,186,16,.25);background:linear-gradient(145deg,rgba(15,29,56,.9),rgba(10,20,40,.95))}
.cal3d-item-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.cal3d-badge{display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:8px;font-size:10px;font-weight:600;backdrop-filter:blur(4px)}
.cal3d-detail{background:linear-gradient(145deg,rgba(15,29,56,.9),rgba(6,11,24,.95));border:1px solid rgba(248,186,16,.2);border-radius:16px;padding:20px;backdrop-filter:blur(12px);animation:cal3d-in .3s ease;margin-top:14px}
@keyframes cal3d-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.cal3d-plats{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.cal3d-plat{font-size:10px;padding:2px 8px;border-radius:6px;font-weight:500}
`;

export default function ContentCalendar({ sheetId: propSheetId, onLink, onUnlink, readOnly = false }) {
  const [sheetInput, setSheetInput] = useState("");
  const [sheetId, setSheetId] = useState(propSheetId || null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showLink, setShowLink] = useState(!propSheetId);
  const [selPost, setSelPost] = useState(null);

  const fetchData = useCallback(async (sid) => {
    if (!sid) return;
    setLoading(true); setError("");
    try {
      const r = await fetch(`/api/sheets?sheetId=${sid}&range=Calendario!A1:H500`);
      const d = await r.json();
      if (d.error) { setError(d.error); setLoading(false); return; }
      if (Array.isArray(d) && d.length > 1) {
        const parsed = d.slice(1).filter(row => row[0] || row[3]).map((row, i) => ({
          id: i,
          semana: (row[0] || "").trim(),
          plataforma: (row[1] || "").trim(),
          tipo: (row[2] || "").trim(),
          descripcion: (row[3] || "").trim(),
          estado: (row[4] || "pendiente").trim().toLowerCase(),
          hora: (row[5] || "").trim(),
        }));
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

  // Link screen
  if (!sheetId || showLink) {
    if (readOnly) return null;
    return (
      <div style={{ background: `linear-gradient(145deg,${C.s},${C.bg})`, borderRadius: 16, border: `2px dashed ${C.b}`, padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
        <div style={{ fontFamily: D, fontSize: 15, fontWeight: 700, color: C.tx, marginBottom: 6 }}>Vincular calendario de contenido</div>
        <div style={{ fontSize: 11, color: C.td, marginBottom: 16, lineHeight: 1.6 }}>
          Pestaña "Calendario" con: Fecha, Plataforma, Tipo, Descripción, Estado, Hora
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

  // Group by semana
  const weeks = [];
  const weekMap = {};
  posts.forEach(p => {
    const key = p.semana.toLowerCase() || "sin semana";
    if (!weekMap[key]) { weekMap[key] = []; weeks.push(key); }
    weekMap[key].push(p);
  });

  // Stats
  const statusCounts = {};
  posts.forEach(p => { statusCounts[p.estado] = (statusCounts[p.estado] || 0) + 1; });
  const typesCounts = {};
  posts.forEach(p => { const t = p.tipo.toLowerCase(); typesCounts[t] = (typesCounts[t] || 0) + 1; });

  return (
    <div>
      <style>{calCSS}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${C.acc},#D4A00E)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 4px 12px rgba(248,186,16,.2)" }}>📅</div>
          <div>
            <div style={{ fontFamily: D, fontSize: 16, fontWeight: 700, color: C.tx }}>Calendario de contenido</div>
            <div style={{ fontSize: 10, color: C.td }}>{posts.length} posts · {weeks.length} semanas</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => fetchData(sheetId)} style={{ background: `linear-gradient(145deg,${C.s2},${C.s})`, border: `1px solid ${C.b}`, borderRadius: 8, padding: "6px 12px", color: C.tm, cursor: "pointer", fontSize: 11, fontFamily: F }}>🔄</button>
          {!readOnly && <button onClick={async () => { setSheetId(null); setPosts([]); setShowLink(true); if (onUnlink) await onUnlink(); }} style={{ background: "none", border: `1px solid ${C.r}30`, borderRadius: 8, padding: "6px 12px", color: C.r, cursor: "pointer", fontSize: 11 }}>✕</button>}
        </div>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 24, color: C.acc, fontSize: 13 }}>Cargando calendario...</div>}
      {error && <div style={{ color: C.r, fontSize: 12, marginBottom: 10 }}>{error}</div>}

      {!loading && posts.length > 0 && (
        <>
          {/* Stats bar */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.tx }}>{posts.length} posts</span>
            {Object.entries(statusCounts).map(([st, cnt]) => {
              const color = STATUS_COLORS[st] || "#6B7280";
              return <span key={st} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 10, background: color + "20", color, fontWeight: 600 }}>{st} ({cnt})</span>;
            })}
            <span style={{ color: C.td }}>|</span>
            {Object.entries(typesCounts).map(([t, cnt]) => (
              <span key={t} style={{ fontSize: 10, color: C.tm }}>{TYPE_ICONS[t] || "📎"} {t}: {cnt}</span>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map(weekKey => {
            const items = weekMap[weekKey];
            return (
              <div key={weekKey} className="cal3d-week">
                <div className="cal3d-week-head">
                  <div className="cal3d-week-label">{weekKey}</div>
                  <div className="cal3d-week-count">{items.length} posts</div>
                </div>
                {items.map((p, i) => {
                  const platColor = getPlatColor(p.plataforma);
                  const stColor = STATUS_COLORS[p.estado] || "#6B7280";
                  const typeIcon = TYPE_ICONS[p.tipo.toLowerCase()] || "📎";
                  const platforms = p.plataforma.split(/[\/,]/).map(s => s.trim()).filter(Boolean);

                  return (
                    <div key={p.id} className="cal3d-item" onClick={() => setSelPost(selPost?.id === p.id ? null : p)}>
                      <div className="cal3d-item-icon" style={{ background: platColor + "18", border: `1px solid ${platColor}30` }}>
                        {typeIcon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: C.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.descripcion}</div>
                        <div className="cal3d-plats">
                          {platforms.map((pl, pi) => (
                            <span key={pi} className="cal3d-plat" style={{ background: getPlatColor(pl) + "18", color: getPlatColor(pl) }}>{pl}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                        <span className="cal3d-badge" style={{ background: stColor + "18", color: stColor }}>{p.estado}</span>
                        {p.hora && <span style={{ fontSize: 10, color: C.td }}>🕐 {p.hora}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Post detail */}
          {selPost && (
            <div className="cal3d-detail">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: D, fontSize: 16, fontWeight: 700, color: C.tx, lineHeight: 1.3 }}>{selPost.descripcion}</div>
                  <div style={{ fontSize: 11, color: C.td, marginTop: 4 }}>{selPost.semana}</div>
                </div>
                <button onClick={() => setSelPost(null)} style={{ background: `linear-gradient(145deg,${C.s2},${C.s})`, border: `1px solid ${C.b}`, borderRadius: 8, width: 28, height: 28, color: C.tm, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {selPost.plataforma.split(/[\/,]/).map((pl, i) => (
                  <span key={i} className="cal3d-badge" style={{ background: getPlatColor(pl) + "18", color: getPlatColor(pl) }}>{pl.trim()}</span>
                ))}
                <span className="cal3d-badge" style={{ background: C.s2, color: C.tm, border: `1px solid ${C.b}` }}>{TYPE_ICONS[selPost.tipo.toLowerCase()] || "📎"} {selPost.tipo}</span>
                <span className="cal3d-badge" style={{ background: (STATUS_COLORS[selPost.estado] || "#6B7280") + "18", color: STATUS_COLORS[selPost.estado] || "#6B7280" }}>{selPost.estado}</span>
                {selPost.hora && <span className="cal3d-badge" style={{ background: C.s2, color: C.tm, border: `1px solid ${C.b}` }}>🕐 {selPost.hora}</span>}
              </div>
            </div>
          )}
        </>
      )}

      {!loading && posts.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: 32, color: C.td, fontSize: 12 }}>
          Sin datos. La pestaña debe llamarse "Calendario" con columnas: Fecha, Plataforma, Tipo, Descripción, Estado, Hora
        </div>
      )}
    </div>
  );
}
