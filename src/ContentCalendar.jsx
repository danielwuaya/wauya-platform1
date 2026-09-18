import { useState, useEffect, useCallback } from "react";
 
const C = { bg:"#060B18",s:"#0A1428",s2:"#0F1D38",b:"#1A2D52",tx:"#F0F0F4",tm:"#8A94A8",td:"#4A5568",acc:"#F8BA10",r:"#FF4D6A",g:"#36DE67",w:"#FFC107",p:"#4A90D9",bl:"#60A5FA" };
const F = "'Poppins', sans-serif", D = "'Playfair Display', serif";
 
const PLAT_COLORS = { instagram:"#E1306C", facebook:"#1877F2", tiktok:"#00F2EA", linkedin:"#0A66C2", twitter:"#1DA1F2", youtube:"#FF0000", reels:"#E1306C" };
const STATUS_COLORS = { pendiente:"#6B7280", "en diseño":"#F59E0B", "en revisión":"#8B5CF6", aprobado:"#36DE67", programado:"#3B82F6", publicado:"#36DE67", pending:"#6B7280", draft:"#F59E0B", "in review":"#8B5CF6", approved:"#36DE67", scheduled:"#3B82F6", published:"#36DE67", posted:"#36DE67", idea:"#6B7280" };
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
      // Prueba varios nombres de pestaña; si ninguno tiene datos, lee la primera hoja
      const tabs = ["Calendario", "Contenido", "Calendar", "Content Calendar", "Content", "Hoja1", "Sheet1"];
      let d = null, lastErr = "";
      for (const tab of tabs) {
        try {
          const r = await fetch(`/api/sheets?sheetId=${sid}&range=${encodeURIComponent(tab)}!A1:Z500`);
          const j = await r.json();
          if (j.error) { lastErr = j.error; continue; }
          if (Array.isArray(j) && j.length > 1) { d = j; break; }
        } catch (e) { lastErr = e.message; }
      }
      if (!d) {
        try {
          const r = await fetch(`/api/sheets?sheetId=${sid}&range=A1:Z500`);
          const j = await r.json();
          if (Array.isArray(j) && j.length > 1) d = j; else if (j.error) lastErr = j.error;
        } catch (e) { lastErr = e.message; }
      }
      if (!d) { setError(lastErr || "No se pudo leer. Verifica que sea Google Sheet compartido."); setLoading(false); return; }
 
      // Detecta la fila de encabezados (la que tiene más celdas llenas, o la que contiene content/contenido/descripción)
      let headerIdx = d.findIndex(row => row.some(c => c && /content|contenido|descrip|copy|publish|fecha|plataforma|platform/i.test(String(c))));
      if (headerIdx === -1) {
        let maxCells = 0;
        d.forEach((row, i) => { const filled = row.filter(c => c && String(c).trim()).length; if (filled > maxCells && filled >= 3) { maxCells = filled; headerIdx = i; } });
      }
      if (headerIdx === -1) headerIdx = 0;
      const headers = d[headerIdx].map(h => String(h || "").toLowerCase().trim());
      const col = (...names) => headers.findIndex(h => names.some(n => h.includes(n)));
      const idx = {
        num: col("n°", "n.", "orden", "#", "no."),
        descripcion: col("content", "contenido", "descripción", "descripcion", "copy (ready", "tema", "idea"),
        formato: col("format", "formato"),
        plataforma: col("platform", "plataforma", "red"),
        tipo: col("content type", "tipo de contenido", "tipo", "type"),
        responsable: col("responsible", "responsable", "encargado"),
        estado: col("status", "estado"),
        fecha: col("publish date", "fecha de publicación", "fecha de publicacion", "fecha", "date"),
        hook: col("hook", "gancho"),
        copy: col("copy (ready", "copy", "texto"),
        hashtags: col("hashtag"),
        cta: col("cta", "llamado"),
        aprobacion: col("aprobación del cliente", "aprobacion del cliente", "client approval", "aprobación", "aprobacion"),
        comentarios: col("comentarios del cliente", "client comments", "comentarios", "comments"),
        hora: col("hora", "time"),
        semana: col("semana", "week"),
      };
      const get = (row, i) => i >= 0 ? String(row[i] || "").trim() : "";
      const parsed = d.slice(headerIdx + 1)
        .filter(row => get(row, idx.descripcion) || get(row, idx.copy) || get(row, idx.hook))
        .map((row, i) => ({
          id: i,
          num: get(row, idx.num),
          descripcion: get(row, idx.descripcion) || get(row, idx.copy) || get(row, idx.hook),
          formato: get(row, idx.formato),
          plataforma: get(row, idx.plataforma),
          tipo: get(row, idx.tipo) || get(row, idx.formato),
          responsable: get(row, idx.responsable),
          estado: (get(row, idx.estado) || "pendiente").toLowerCase(),
          fecha: get(row, idx.fecha),
          hook: get(row, idx.hook),
          copy: get(row, idx.copy),
          hashtags: get(row, idx.hashtags),
          cta: get(row, idx.cta),
          aprobacion: get(row, idx.aprobacion),
          comentarios: get(row, idx.comentarios),
          hora: get(row, idx.hora),
          // Agrupa por semana si existe; si no, por fecha; si no, "Contenido"
          semana: get(row, idx.semana) || get(row, idx.fecha) || "Contenido",
        }));
      setPosts(parsed);
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
          Google Sheet compartido como "Cualquiera con el enlace → Lector". Detecta las columnas por nombre: Content, Format, Platform, Status, Publish Date, Hook, Copy, CTA, Hashtags... (español o inglés).
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
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {selPost.plataforma.split(/[\/,]/).filter(Boolean).map((pl, i) => (
                  <span key={i} className="cal3d-badge" style={{ background: getPlatColor(pl) + "18", color: getPlatColor(pl) }}>{pl.trim()}</span>
                ))}
                {selPost.tipo && <span className="cal3d-badge" style={{ background: C.s2, color: C.tm, border: `1px solid ${C.b}` }}>{TYPE_ICONS[selPost.tipo.toLowerCase()] || "📎"} {selPost.tipo}</span>}
                <span className="cal3d-badge" style={{ background: (STATUS_COLORS[selPost.estado] || "#6B7280") + "18", color: STATUS_COLORS[selPost.estado] || "#6B7280" }}>{selPost.estado}</span>
                {selPost.fecha && <span className="cal3d-badge" style={{ background: C.s2, color: C.tm, border: `1px solid ${C.b}` }}>📅 {selPost.fecha}</span>}
                {selPost.hora && <span className="cal3d-badge" style={{ background: C.s2, color: C.tm, border: `1px solid ${C.b}` }}>🕐 {selPost.hora}</span>}
                {selPost.responsable && <span className="cal3d-badge" style={{ background: C.p + "18", color: C.p }}>👤 {selPost.responsable}</span>}
              </div>
              {/* Campos ricos: Hook, Copy, CTA, Hashtags, aprobación */}
              {(() => {
                const block = (label, value, opts = {}) => value ? (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.tm, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</span>
                      {opts.copyable && <button onClick={() => navigator.clipboard.writeText(value)} style={{ background: C.acc, border: "none", borderRadius: 6, padding: "3px 10px", color: "#060B18", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: F }}>📋 Copiar</button>}
                    </div>
                    <div style={{ fontSize: 12, color: C.tx, background: C.bg, padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.b}`, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{value}</div>
                  </div>
                ) : null;
                return <>
                  {block("Hook / Gancho", selPost.hook, { copyable: true })}
                  {block("Copy (listo para publicar)", selPost.copy, { copyable: true })}
                  {block("CTA", selPost.cta, { copyable: true })}
                  {block("Hashtags", selPost.hashtags, { copyable: true })}
                  {(selPost.aprobacion || selPost.comentarios) && <div style={{ background: C.g + "0A", border: `1px solid ${C.g}25`, borderRadius: 10, padding: 12, marginTop: 4 }}>
                    {selPost.aprobacion && <div style={{ fontSize: 12, color: C.tx, marginBottom: selPost.comentarios ? 8 : 0 }}><span style={{ fontWeight: 700, color: C.g }}>✓ Aprobación del cliente: </span>{selPost.aprobacion}</div>}
                    {selPost.comentarios && <div style={{ fontSize: 12, color: C.tx }}><span style={{ fontWeight: 700, color: C.acc }}>💬 Comentarios del cliente: </span>{selPost.comentarios}</div>}
                  </div>}
                </>;
              })()}
            </div>
          )}
        </>
      )}
 
      {!loading && posts.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: 32, color: C.td, fontSize: 12 }}>
          Sin datos. Revisa que el Sheet tenga una fila de encabezados (Content/Contenido, Platform, Status...) y esté compartido como "Cualquiera con el enlace → Lector".
        </div>
      )}
    </div>
  );
}
 
