import { useState, useMemo } from "react";
import { supabase } from "./supabase.js";

const C = { bg:"#060B18",s:"#0A1428",s2:"#0F1D38",b:"#1A2D52",tx:"#F0F0F4",tm:"#8A94A8",td:"#4A5568",acc:"#F8BA10",r:"#FF4D6A",g:"#36DE67",w:"#FFC107",p:"#4A90D9",bl:"#60A5FA",blBg:"#0A1633" };
const F = "'Poppins', sans-serif", D = "'Playfair Display', serif";

const OUTBOUND_STATUS = [
  { value: "sin_contactar", label: "Sin contactar", color: "#6B7280", icon: "⚪" },
  { value: "escrito", label: "Ya lo escribimos", color: "#3B82F6", icon: "✍️" },
  { value: "no_respondio", label: "No respondió", color: "#EF4444", icon: "🔇" },
  { value: "respondio", label: "Respondió", color: "#F59E0B", icon: "💬" },
  { value: "reunion", label: "Agendó reunión", color: "#36DE67", icon: "📅" },
  { value: "descartado", label: "Descartado", color: "#4A5568", icon: "✕" },
];

function Btn({ children, onClick, v = "primary", sz = "md", disabled, style: sx }) { const b = { display: "inline-flex", alignItems: "center", gap: 7, border: "none", cursor: disabled ? "not-allowed" : "pointer", fontFamily: F, fontWeight: 600, borderRadius: 10, transition: "all .2s", opacity: disabled ? .35 : 1, whiteSpace: "nowrap", fontSize: sz === "sm" ? 11 : 13, padding: sz === "sm" ? "6px 12px" : "9px 18px" }; const vs = { primary: { background: `linear-gradient(135deg,${C.acc},#D4A00E)`, color: "#060B18" }, secondary: { background: C.s2, color: C.tx, border: `1px solid ${C.b}` }, ghost: { background: "transparent", color: C.tm } }; return <button onClick={onClick} disabled={disabled} style={{ ...b, ...vs[v], ...sx }}>{children}</button>; }
function Card({ children, style: sx, onClick }) { return <div onClick={onClick} style={{ background: `${C.s}e8`, borderRadius: 14, border: `1px solid ${C.b}80`, padding: 18, cursor: onClick ? "pointer" : "default", transition: "all .2s", ...sx }}>{children}</div>; }
function ModalWrap({ title, onClose, children, w = 560 }) { return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(16px)" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div style={{ background: `linear-gradient(160deg,${C.s}f5,${C.bg}f0)`, borderRadius: 20, border: `1px solid ${C.b}`, width: "92%", maxWidth: w, maxHeight: "88vh", overflow: "auto", animation: "modalIn .25s", boxShadow: "0 24px 80px rgba(0,0,0,.5)" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: `1px solid ${C.b}60`, position: "sticky", top: 0, background: `${C.s}f5`, zIndex: 1 }}><h3 style={{ fontFamily: D, fontSize: 17, fontWeight: 600, color: C.tx }}>{title}</h3><button onClick={onClose} style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 10, width: 30, height: 30, color: C.tm, cursor: "pointer", fontSize: 13 }}>✕</button></div><div style={{ padding: 22 }}>{children}</div></div></div>; }

export default function ColdLeads({ leads = [], onReload, onConvert, toast }) {
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [selBatch, setSelBatch] = useState("todos");
  const [filterChannel, setFilterChannel] = useState("todos");
  const showToast = toast || (() => {});
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const batches = useMemo(() => [...new Set(leads.map(l => l.batch).filter(Boolean))], [leads]);

  const stats = useMemo(() => {
    const byStatus = {};
    OUTBOUND_STATUS.forEach(s => byStatus[s.value] = leads.filter(l => l.outbound_status === s.value).length);
    return { total: leads.length, byStatus };
  }, [leads]);

  const updStatus = async (id, status) => {
    try { await supabase.from("cold_leads").update({ outbound_status: status }).eq("id", id); onReload(); showToast("Estado actualizado"); }
    catch { showToast("Error", "error"); }
  };
  const updNotes = async (id, notes) => {
    try { await supabase.from("cold_leads").update({ notes }).eq("id", id); onReload(); }
    catch {}
  };
  const delLead = async (id) => {
    if (!confirm("¿Eliminar este lead?")) return;
    try { await supabase.from("cold_leads").delete().eq("id", id); onReload(); showToast("Eliminado"); } catch {}
  };

  const filtered = leads.filter(l => {
    if (filterStatus !== "todos" && l.outbound_status !== filterStatus) return false;
    if (selBatch !== "todos" && l.batch !== selBatch) return false;
    if (search && !(l.company + l.city + l.industry + l.owner_name).toLowerCase().includes(search.toLowerCase())) return false;
    const hasIG = l.instagram && l.instagram.startsWith("http");
    const hasFB = l.facebook && l.facebook.startsWith("http");
    const hasEmail = l.email && l.email.includes("@");
    if (filterChannel === "instagram" && !hasIG) return false;
    if (filterChannel === "email" && !hasEmail) return false;
    if (filterChannel === "sin_social" && (hasIG || hasFB)) return false;
    return true;
  });

  return (
    <div style={{ animation: "fadeUp .3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ fontFamily: D, fontSize: isMobile ? 20 : 26, fontWeight: 700, color: C.tx, letterSpacing: "-.02em" }}>Leads Fríos</h1>
          <p style={{ fontSize: 12, color: C.td }}>Prospección outbound · {leads.length} leads</p>
        </div>
        <Btn onClick={() => setModal({ type: "import" })}>+ Importar lote</Btn>
      </div>

      {/* Status pipeline stats */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {OUTBOUND_STATUS.map(st => (
          <div key={st.value} onClick={() => setFilterStatus(filterStatus === st.value ? "todos" : st.value)} style={{ flex: "1 1 100px", minWidth: 90, background: filterStatus === st.value ? st.color + "20" : `${C.s}e8`, border: `1px solid ${filterStatus === st.value ? st.color : C.b}80`, borderRadius: 12, padding: "12px 14px", cursor: "pointer", transition: "all .2s" }}>
            <div style={{ fontSize: 16, marginBottom: 2 }}>{st.icon}</div>
            <div style={{ fontFamily: D, fontSize: 22, fontWeight: 800, color: st.color }}>{stats.byStatus[st.value] || 0}</div>
            <div style={{ fontSize: 9, color: C.td }}>{st.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empresa, ciudad..." style={{ flex: 1, minWidth: 180, background: C.bg, border: `1px solid ${C.b}`, borderRadius: 10, padding: "9px 14px", color: C.tx, fontSize: 13, fontFamily: F, outline: "none" }} />
        {batches.length > 0 && <select value={selBatch} onChange={e => setSelBatch(e.target.value)} style={{ background: C.bg, border: `1px solid ${C.b}`, borderRadius: 10, padding: "9px 12px", color: C.tx, fontSize: 12, fontFamily: F, outline: "none", cursor: "pointer" }}><option value="todos">Todos los lotes</option>{batches.map(b => <option key={b} value={b}>{b}</option>)}</select>}
        <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} style={{ background: C.bg, border: `1px solid ${C.b}`, borderRadius: 10, padding: "9px 12px", color: C.tx, fontSize: 12, fontFamily: F, outline: "none", cursor: "pointer" }}>
          <option value="todos">Todos los canales</option>
          <option value="instagram">Con Instagram</option>
          <option value="email">Con Email</option>
          <option value="sin_social">Sin redes (solo email/tel)</option>
        </select>
        {filterStatus !== "todos" && <Btn onClick={() => setFilterStatus("todos")} v="ghost" sz="sm">✕ Ver todos</Btn>}
      </div>

      {/* Leads list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(lead => {
          const st = OUTBOUND_STATUS.find(s => s.value === lead.outbound_status) || OUTBOUND_STATUS[0];
          const isReunion = lead.outbound_status === "reunion";
          return <Card key={lead.id} style={{ borderLeft: `3px solid ${st.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: C.tx, fontFamily: D }}>{lead.company}</span>
                  {lead.priority && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: lead.priority === "A" ? C.g + "20" : lead.priority === "B" ? C.w + "20" : C.td + "20", color: lead.priority === "A" ? C.g : lead.priority === "B" ? C.w : C.td }}>Prioridad {lead.priority}</span>}
                  {lead.lead_score > 0 && <span style={{ fontSize: 9, color: C.acc }}>Score {lead.lead_score}</span>}
                </div>
                <div style={{ fontSize: 11, color: C.tm }}>{lead.industry}{lead.city ? ` · ${lead.city}` : ""}</div>
                {/* Canales de contacto disponibles */}
                <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                  {(() => {
                    const hasIG = lead.instagram && lead.instagram.startsWith("http");
                    const hasFB = lead.facebook && lead.facebook.startsWith("http");
                    const hasEmail = lead.email && lead.email.includes("@");
                    const hasPhone = lead.phone && lead.phone.length > 4;
                    const chip = (ok, label, color) => <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: ok ? color + "18" : C.b + "40", color: ok ? color : C.td, border: `1px solid ${ok ? color + "30" : "transparent"}` }}>{ok ? "✓" : "✕"} {label}</span>;
                    return <>
                      {chip(hasIG, "Instagram", "#E1306C")}
                      {chip(hasFB, "Facebook", "#1877F2")}
                      {chip(hasEmail, "Email", C.acc)}
                      {chip(hasPhone, "Teléfono", C.g)}
                    </>;
                  })()}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 10, color: C.td, flexWrap: "wrap" }}>
                  {lead.owner_name && lead.owner_name !== "No encontrado públicamente" && <span>👤 {lead.owner_name}</span>}
                  {lead.phone && lead.phone.length > 4 && <span>📞 {lead.phone}</span>}
                  {lead.email && lead.email.includes("@") && <a href={`mailto:${lead.email}`} style={{ color: C.acc, textDecoration: "none" }}>✉️ {lead.email}</a>}
                  {lead.instagram && lead.instagram.startsWith("http") && <a href={lead.instagram} target="_blank" rel="noopener noreferrer" style={{ color: C.p, textDecoration: "none" }}>📷 IG</a>}
                </div>
                {lead.problem && <div style={{ fontSize: 10, color: C.td, marginTop: 6, fontStyle: "italic" }}>💡 {lead.problem.slice(0, 120)}{lead.problem.length > 120 ? "..." : ""}</div>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                <select value={lead.outbound_status} onChange={e => updStatus(lead.id, e.target.value)} style={{ background: st.color + "15", border: `1px solid ${st.color}40`, borderRadius: 8, padding: "6px 10px", color: st.color, fontSize: 11, fontWeight: 600, fontFamily: F, outline: "none", cursor: "pointer" }}>
                  {OUTBOUND_STATUS.map(s => <option key={s.value} value={s.value} style={{ background: C.s, color: C.tx }}>{s.icon} {s.label}</option>)}
                </select>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => setModal({ type: "detail", lead })} style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 8, padding: "4px 10px", color: C.tm, fontSize: 10, cursor: "pointer", fontFamily: F }}>Ver detalle</button>
                  <button onClick={() => delLead(lead.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.r, fontSize: 11 }}>🗑️</button>
                </div>
              </div>
            </div>
            {/* Convert button when meeting scheduled */}
            {isReunion && !lead.converted_prospect_id && <div style={{ marginTop: 12, padding: "12px 14px", background: C.g + "0C", border: `1px solid ${C.g}30`, borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontSize: 12, color: C.g, fontWeight: 500 }}>✓ Reunión agendada — listo para convertir en prospecto</span>
              <Btn onClick={() => setModal({ type: "convert", lead })} sz="sm">→ Crear prospecto</Btn>
            </div>}
            {lead.converted_prospect_id && <div style={{ marginTop: 10, fontSize: 11, color: C.g }}>✓ Convertido a prospecto</div>}
          </Card>;
        })}
        {filtered.length === 0 && <Card style={{ textAlign: "center", padding: 40 }}><p style={{ color: C.td }}>{leads.length === 0 ? 'Sin leads. Click "+ Importar lote" para cargar tu primera tabla.' : "Ningún lead con estos filtros."}</p></Card>}
      </div>

      {modal?.type === "import" && <ImportModal onClose={() => setModal(null)} onReload={onReload} showToast={showToast} />}
      {modal?.type === "detail" && <DetailModal lead={modal.lead} onClose={() => setModal(null)} onSaveNotes={updNotes} onCopied={() => showToast("Copiado")} />}
      {modal?.type === "convert" && <ConvertModal lead={modal.lead} onClose={() => setModal(null)} onConvert={onConvert} showToast={showToast} onReload={onReload} />}
    </div>
  );
}

function ImportModal({ onClose, onReload, showToast }) {
  const [link, setLink] = useState("");
  const [batch, setBatch] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const readSheet = async () => {
    if (!link) return;
    setLoading(true); setPreview(null);
    const m = link.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    const sheetId = m ? m[1] : link;
    const tabs = ["Leads", "Hoja1", "Sheet1", "Prospeccion"];
    let data = null, lastErr = "";
    for (const tab of tabs) {
      try {
        const r = await fetch(`/api/sheets?sheetId=${sheetId}&range=${encodeURIComponent(tab)}!A1:AZ200`);
        const j = await r.json();
        if (j.error) { lastErr = j.error; continue; }
        if (Array.isArray(j) && j.length > 2) { data = j; break; }
      } catch (e) { lastErr = e.message; }
    }
    if (!data) { showToast("No se pudo leer: " + (lastErr || "verifica el link y que sea Google Sheet compartido"), "error"); setLoading(false); return; }
    // Find header row (contains "Empresa" or "Company")
    let headerIdx = data.findIndex(row => row.some(c => c && /empresa|company/i.test(String(c))));
    if (headerIdx === -1) headerIdx = 0;
    const headers = data[headerIdx].map(h => String(h || "").toLowerCase().trim());
    const col = (...names) => headers.findIndex(h => names.some(n => h.includes(n)));
    const idx = {
      lead_id: col("lead id", "id"), company: col("empresa", "company"), industry: col("industria", "industry"),
      city: col("ciudad", "city"), address: col("dirección", "address"), phone: col("teléfono", "phone"),
      email: col("email"), instagram: col("instagram"), facebook: col("facebook"), linkedin: col("linkedin empresa"),
      owner: col("propietario", "gerente", "owner"), role: col("cargo", "role"),
      website: col("estado de la página", "website"), problem: col("problema detectado", "problem"),
      opportunity: col("oportunidad"), solution: col("solución web", "solution"),
      priority: col("prioridad"), score: col("lead score", "score"),
      message: col("mensaje inicial"), obs: col("observaciones"),
      email_subject: col("asunto de email", "asunto"), email_body: col("email inicial"),
      followup_1: col("seguimiento 1"), followup_2: col("seguimiento 2"),
    };
    const rows = data.slice(headerIdx + 1).filter(r => r[idx.company]).map(r => ({
      lead_id: r[idx.lead_id] || "", company: r[idx.company] || "", industry: r[idx.industry] || "",
      city: r[idx.city] || "", address: r[idx.address] || "", phone: String(r[idx.phone] || ""),
      email: r[idx.email] || "", instagram: r[idx.instagram] || "", facebook: r[idx.facebook] || "",
      linkedin: r[idx.linkedin] || "", owner_name: r[idx.owner] || "", owner_role: r[idx.role] || "",
      website_status: r[idx.website] || "", problem: r[idx.problem] || "", opportunity: r[idx.opportunity] || "",
      recommended_solution: r[idx.solution] || "", priority: r[idx.priority] || "",
      lead_score: parseFloat(r[idx.score]) || 0, initial_message: r[idx.message] || "",
      observations: r[idx.obs] || "", batch: batch || "Lote sin nombre", outbound_status: "sin_contactar",
      email_subject: r[idx.email_subject] || "", email_body: r[idx.email_body] || "",
      followup_1: r[idx.followup_1] || "", followup_2: r[idx.followup_2] || "",
    }));
    setPreview(rows);
    setLoading(false);
  };

  const doImport = async () => {
    if (!preview || preview.length === 0) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("cold_leads").insert(preview);
      if (error) { showToast("Error: " + error.message, "error"); setLoading(false); return; }
      onReload(); showToast(`${preview.length} leads importados`); onClose();
    } catch (e) { showToast("Error: " + e.message, "error"); setLoading(false); }
  };

  return <ModalWrap title="Importar lote de leads" onClose={onClose}>
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div><label style={{ fontSize: 11, fontWeight: 600, color: C.tm, fontFamily: F }}>Nombre del lote</label><input value={batch} onChange={e => setBatch(e.target.value)} placeholder="Ej: Niágara Automotriz Lote 01" style={{ width: "100%", background: C.bg, border: `1px solid ${C.b}`, borderRadius: 10, padding: "10px 14px", color: C.tx, fontSize: 13, fontFamily: F, outline: "none", marginTop: 6 }} /></div>
      <div><label style={{ fontSize: 11, fontWeight: 600, color: C.tm, fontFamily: F }}>Link del Google Sheet</label><input value={link} onChange={e => setLink(e.target.value)} placeholder="Pega el link del Sheet con los leads" style={{ width: "100%", background: C.bg, border: `1px solid ${C.b}`, borderRadius: 10, padding: "10px 14px", color: C.tx, fontSize: 13, fontFamily: F, outline: "none", marginTop: 6 }} /></div>
      <div style={{ background: C.blBg, borderRadius: 10, padding: 12, border: `1px solid ${C.bl}25`, fontSize: 11, color: C.tm, lineHeight: 1.6 }}>El Sheet debe ser Google Sheet nativo (no .xlsx), compartido como "Cualquiera con el enlace → Lector", con una pestaña "Leads". La plataforma detecta las columnas automáticamente por nombre.</div>
      {!preview ? <Btn onClick={readSheet} disabled={!link || loading}>{loading ? "Leyendo..." : "Leer y previsualizar"}</Btn>
        : <div>
          <div style={{ background: C.g + "10", border: `1px solid ${C.g}30`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.g }}>✓ {preview.length} leads listos para importar</div>
            <div style={{ fontSize: 11, color: C.tm, marginTop: 4 }}>{preview.slice(0, 4).map(l => l.company).join(", ")}{preview.length > 4 ? ` y ${preview.length - 4} más...` : ""}</div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn onClick={() => setPreview(null)} v="ghost">Volver</Btn>
            <Btn onClick={doImport} disabled={loading}>{loading ? "Importando..." : `Importar ${preview.length} leads`}</Btn>
          </div>
        </div>}
    </div>
  </ModalWrap>;
}

function MsgBlock({ label, text, onCopied }) {
  return <div style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: C.tx }}>{label}</span>
      <button onClick={() => { navigator.clipboard.writeText(text); onCopied && onCopied(); }} style={{ background: C.acc, border: "none", borderRadius: 8, padding: "5px 12px", color: "#060B18", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: F }}>📋 Copiar</button>
    </div>
    <div style={{ fontSize: 12, color: C.tx, background: C.bg, padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.b}`, lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 160, overflow: "auto" }}>{text}</div>
  </div>;
}

function DetailModal({ lead, onClose, onSaveNotes, onCopied }) {
  const [notes, setNotes] = useState(lead.notes || "");
  const field = (label, value) => value && value !== "No encontrado públicamente" ? <div style={{ marginBottom: 8 }}><div style={{ fontSize: 10, fontWeight: 600, color: C.tm, textTransform: "uppercase" }}>{label}</div><div style={{ fontSize: 12, color: C.tx, marginTop: 2 }}>{value}</div></div> : null;
  return <ModalWrap title={lead.company} onClose={onClose} w={620}>
    {/* Canales de contacto */}
    <div style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.b}`, padding: 14, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.tm, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Cómo contactar</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {lead.email && lead.email.includes("@") ? <a href={`mailto:${lead.email}`} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.acc, textDecoration: "none" }}>✉️ {lead.email}</a> : <div style={{ fontSize: 12, color: C.td }}>✕ Sin email</div>}
        {lead.phone && lead.phone.length > 4 ? <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.g }}>📞 {lead.phone}</div> : <div style={{ fontSize: 12, color: C.td }}>✕ Sin teléfono</div>}
        {lead.instagram && lead.instagram.startsWith("http") ? <a href={lead.instagram} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#E1306C", textDecoration: "none" }}>📷 Instagram ↗</a> : <div style={{ fontSize: 12, color: C.td }}>✕ Sin Instagram</div>}
        {lead.facebook && lead.facebook.startsWith("http") ? <a href={lead.facebook} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#1877F2", textDecoration: "none" }}>📘 Facebook ↗</a> : <div style={{ fontSize: 12, color: C.td }}>✕ Sin Facebook</div>}
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
      {field("Industria", lead.industry)}{field("Ciudad", lead.city)}
      {field("Dirección", lead.address)}{field("Propietario", lead.owner_name)}
      {field("Cargo", lead.owner_role)}{field("Estado web", lead.website_status)}
    </div>
    {field("Problema detectado", lead.problem)}
    {field("Oportunidad estratégica", lead.opportunity)}
    {field("Solución recomendada", lead.recommended_solution)}
    {/* MENSAJES LISTOS PARA COPIAR */}
    {(lead.email_subject || lead.email_body || lead.initial_message || lead.followup_1) && <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.acc, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>📋 Mensajes listos para enviar</div>
      {/* Email */}
      {(lead.email_subject || lead.email_body) && <div style={{ background: C.acc + "0A", border: `1px solid ${C.acc}30`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.acc }}>✉️ Email inicial</span>
          <button onClick={() => { navigator.clipboard.writeText((lead.email_subject ? `Asunto: ${lead.email_subject}\n\n` : "") + (lead.email_body || "")); onCopied && onCopied(); }} style={{ background: C.acc, border: "none", borderRadius: 8, padding: "5px 12px", color: "#060B18", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: F }}>📋 Copiar todo</button>
        </div>
        {lead.email_subject && <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}><span style={{ fontSize: 9, fontWeight: 600, color: C.tm, textTransform: "uppercase" }}>Asunto</span><button onClick={() => { navigator.clipboard.writeText(lead.email_subject); onCopied && onCopied(); }} style={{ background: "none", border: "none", color: C.acc, fontSize: 9, cursor: "pointer", fontFamily: F }}>copiar</button></div>
          <div style={{ fontSize: 12, color: C.tx, background: C.bg, padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.b}` }}>{lead.email_subject}</div>
        </div>}
        {lead.email_body && <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}><span style={{ fontSize: 9, fontWeight: 600, color: C.tm, textTransform: "uppercase" }}>Cuerpo</span><button onClick={() => { navigator.clipboard.writeText(lead.email_body); onCopied && onCopied(); }} style={{ background: "none", border: "none", color: C.acc, fontSize: 9, cursor: "pointer", fontFamily: F }}>copiar</button></div>
          <div style={{ fontSize: 12, color: C.tx, background: C.bg, padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.b}`, lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 200, overflow: "auto" }}>{lead.email_body}</div>
        </div>}
        {lead.email && lead.email.includes("@") && <a href={`mailto:${lead.email}?subject=${encodeURIComponent(lead.email_subject || "")}&body=${encodeURIComponent(lead.email_body || "")}`} style={{ display: "inline-block", marginTop: 8, fontSize: 11, color: C.acc, textDecoration: "none", fontWeight: 600 }}>✉️ Abrir en correo →</a>}
      </div>}
      {/* Mensaje inicial IG/DM */}
      {lead.initial_message && <MsgBlock label="📷 Mensaje inicial (Instagram/DM)" text={lead.initial_message} onCopied={onCopied} />}
      {lead.followup_1 && <MsgBlock label="🔁 Seguimiento 1" text={lead.followup_1} onCopied={onCopied} />}
      {lead.followup_2 && <MsgBlock label="🔁 Seguimiento 2" text={lead.followup_2} onCopied={onCopied} />}
    </div>}
    <div><label style={{ fontSize: 11, fontWeight: 600, color: C.tm, fontFamily: F }}>Notas de seguimiento</label><textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => onSaveNotes(lead.id, notes)} placeholder="Anota lo que pase con este lead..." style={{ width: "100%", background: C.bg, border: `1px solid ${C.b}`, borderRadius: 10, padding: "10px 14px", color: C.tx, fontSize: 13, fontFamily: F, outline: "none", minHeight: 70, marginTop: 6, resize: "vertical" }} /></div>
  </ModalWrap>;
}

function ConvertModal({ lead, onClose, onConvert, showToast, onReload }) {
  const [selling, setSelling] = useState(lead.recommended_solution || "");
  const [notes, setNotes] = useState("");
  const SERVICES = ["Social Media", "Pauta Digital (Ads)", "Branding", "Website", "Social Media + Ads", "Paquete completo"];
  const doConvert = async () => {
    try {
      // Create prospect from lead data
      const prospectData = {
        name: lead.owner_name && lead.owner_name !== "No encontrado públicamente" ? lead.owner_name : lead.company,
        company: lead.company,
        email: lead.email || "",
        phone: lead.phone || "",
        services: selling,
        notes: `[Desde outbound]\nIndustria: ${lead.industry}\nCiudad: ${lead.city}\nProblema: ${lead.problem}\n${notes ? "Notas: " + notes : ""}`,
        pipeline_status: "reunion",
      };
      const { data, error } = await supabase.from("prospects").insert(prospectData).select().single();
      if (error) { showToast("Error: " + error.message, "error"); return; }
      await supabase.from("cold_leads").update({ converted_prospect_id: data.id }).eq("id", lead.id);
      onReload(); if (onConvert) onConvert();
      showToast("Prospecto creado desde lead"); onClose();
    } catch (e) { showToast("Error: " + e.message, "error"); }
  };
  return <ModalWrap title="Convertir en prospecto" onClose={onClose}>
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: C.bg, borderRadius: 10, padding: 12, border: `1px solid ${C.b}` }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.tx }}>{lead.company}</div>
        <div style={{ fontSize: 11, color: C.td, marginTop: 2 }}>{lead.owner_name !== "No encontrado públicamente" ? lead.owner_name + " · " : ""}{lead.city}</div>
        <div style={{ fontSize: 11, color: C.td, marginTop: 4 }}>{lead.email} {lead.phone}</div>
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: C.tm, fontFamily: F, display: "block", marginBottom: 6 }}>¿Qué le queremos vender?</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {SERVICES.map(s => <button key={s} onClick={() => setSelling(s)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${selling === s ? C.acc : C.b}`, background: selling === s ? C.acc + "15" : "transparent", color: selling === s ? C.acc : C.tm, fontSize: 11, cursor: "pointer", fontFamily: F }}>{s}</button>)}
        </div>
        <input value={selling} onChange={e => setSelling(e.target.value)} placeholder="O escribe otro servicio" style={{ width: "100%", background: C.bg, border: `1px solid ${C.b}`, borderRadius: 10, padding: "10px 14px", color: C.tx, fontSize: 13, fontFamily: F, outline: "none" }} />
      </div>
      <div><label style={{ fontSize: 11, fontWeight: 600, color: C.tm, fontFamily: F }}>Notas de la reunión (opcional)</label><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Contexto de la reunión agendada..." style={{ width: "100%", background: C.bg, border: `1px solid ${C.b}`, borderRadius: 10, padding: "10px 14px", color: C.tx, fontSize: 13, fontFamily: F, outline: "none", minHeight: 60, marginTop: 6, resize: "vertical" }} /></div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn onClick={onClose} v="ghost">Cancelar</Btn>
        <Btn onClick={doConvert} disabled={!selling}>Crear prospecto →</Btn>
      </div>
    </div>
  </ModalWrap>;
}
