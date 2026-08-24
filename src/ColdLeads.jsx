import { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabase.js";
import { buildLeadRows } from "./leadImport.js";

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

// Lee un Google Sheet de leads y devuelve las filas parseadas
async function readLeadsSheet(sheetId, batch, assignSeller) {
  const tabs = ["Leads", "Hoja1", "Sheet1", "Prospeccion", "Hoja 1", "Sheet 1"];
  let data = null, selectedTab = "first_sheet", lastErr = "";
  for (const tab of tabs) {
    try {
      const r = await fetch(`/api/sheets?sheetId=${sheetId}&range=${encodeURIComponent(tab)}!A1:AZ200`);
      const j = await r.json();
      if (j.error) { lastErr = j.error; continue; }
      if (Array.isArray(j) && j.length > 1) { data = j; selectedTab = tab; break; }
    } catch (e) { lastErr = e.message; }
  }
  // Fallback: primera hoja sin importar el nombre
  if (!data) {
    try {
      const r = await fetch(`/api/sheets?sheetId=${sheetId}&range=A1:AZ200`);
      const j = await r.json();
      if (Array.isArray(j) && j.length > 1) data = j;
      else if (j.error) lastErr = j.error;
    } catch (e) { lastErr = e.message; }
  }
  if (!data) throw new Error(lastErr || "No se pudo leer. Verifica que sea Google Sheet compartido.");
  return buildLeadRows(data, { batch, assignSeller, sheetId, tab: selectedTab });
}

async function importLeads(rows, actorId) {
  const { data, error } = await supabase.rpc("import_cold_leads", { p_leads: rows, p_actor_id: actorId ? String(actorId) : null });
  if (error) throw error;
  return data || { inserted: rows.length, updated: 0, total: rows.length };
}

function Btn({ children, onClick, v = "primary", sz = "md", disabled, style: sx }) { const b = { display: "inline-flex", alignItems: "center", gap: 7, border: "none", cursor: disabled ? "not-allowed" : "pointer", fontFamily: F, fontWeight: 600, borderRadius: 10, transition: "all .2s", opacity: disabled ? .35 : 1, whiteSpace: "nowrap", fontSize: sz === "sm" ? 11 : 13, padding: sz === "sm" ? "6px 12px" : "9px 18px" }; const vs = { primary: { background: `linear-gradient(135deg,${C.acc},#D4A00E)`, color: "#060B18" }, secondary: { background: C.s2, color: C.tx, border: `1px solid ${C.b}` }, ghost: { background: "transparent", color: C.tm } }; return <button onClick={onClick} disabled={disabled} style={{ ...b, ...vs[v], ...sx }}>{children}</button>; }
function Card({ children, style: sx, onClick }) { return <div onClick={onClick} style={{ background: `${C.s}e8`, borderRadius: 14, border: `1px solid ${C.b}80`, padding: 18, cursor: onClick ? "pointer" : "default", transition: "all .2s", ...sx }}>{children}</div>; }
function ModalWrap({ title, onClose, children, w = 560 }) { return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(16px)" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div style={{ background: `linear-gradient(160deg,${C.s}f5,${C.bg}f0)`, borderRadius: 20, border: `1px solid ${C.b}`, width: "92%", maxWidth: w, maxHeight: "88vh", overflow: "auto", animation: "modalIn .25s", boxShadow: "0 24px 80px rgba(0,0,0,.5)" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: `1px solid ${C.b}60`, position: "sticky", top: 0, background: `${C.s}f5`, zIndex: 1 }}><h3 style={{ fontFamily: D, fontSize: 17, fontWeight: 600, color: C.tx }}>{title}</h3><button onClick={onClose} style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 10, width: 30, height: 30, color: C.tm, cursor: "pointer", fontSize: 13 }}>✕</button></div><div style={{ padding: 22 }}>{children}</div></div></div>; }

export default function ColdLeads({ leads = [], employees = [], currentUser = null, folders = [], onReload, onConvert, toast }) {
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [selBatch, setSelBatch] = useState("todos");
  const [filterChannel, setFilterChannel] = useState("todos");
  const [filterSeller, setFilterSeller] = useState("todos");
  const [filterCity, setFilterCity] = useState("todos");
  const [filterIndustry, setFilterIndustry] = useState("todos");
  const showToast = toast || (() => {});
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // Si el usuario es vendedor, solo ve sus propios leads
  const isSeller = currentUser?.role === "employee" && currentUser?.department === "ventas";
  const sellers = employees.filter(e => e.department === "ventas");
  const visibleLeads = isSeller ? leads.filter(l => l.assigned_seller === currentUser.id) : leads;

  const batches = useMemo(() => [...new Set(visibleLeads.map(l => l.batch).filter(Boolean))], [visibleLeads]);
  const cities = useMemo(() => [...new Set(visibleLeads.map(l => l.city).filter(Boolean))].sort(), [visibleLeads]);
  const industries = useMemo(() => [...new Set(visibleLeads.map(l => l.industry).filter(Boolean))].sort(), [visibleLeads]);

  const stats = useMemo(() => {
    const byStatus = {};
    OUTBOUND_STATUS.forEach(s => byStatus[s.value] = visibleLeads.filter(l => l.outbound_status === s.value).length);
    return { total: visibleLeads.length, byStatus };
  }, [visibleLeads]);

  const updStatus = async (lead, status) => {
    if (status === "escrito" && lead.contact_eligibility !== "eligible") {
      showToast("Documenta la elegibilidad antes de registrar contacto", "error"); return;
    }
    try {
      const { error } = await supabase.rpc("transition_cold_lead", { p_lead_id: String(lead.id), p_status: status, p_actor_id: currentUser?.id ? String(currentUser.id) : null });
      if (error) throw error;
      onReload(); showToast("Estado actualizado y auditado");
    } catch (error) { showToast(error.message || "Error", "error"); }
  };
  const updNotes = async (id, notes) => {
    try {
      const { error } = await supabase.from("cold_leads").update({ notes }).eq("id", id);
      if (error) throw error;
      if (notes.trim()) await supabase.from("cold_lead_activities").insert({ lead_id: String(id), activity_type: "note", direction: "internal", notes: notes.trim(), actor_id: currentUser?.id ? String(currentUser.id) : null });
      onReload();
    } catch (error) { showToast(error.message || "Error guardando notas", "error"); }
  };
  const delLead = async (id) => {
    if (!confirm("¿Archivar este lead? Se conservará su auditoría.")) return;
    try {
      const { error } = await supabase.rpc("archive_cold_lead", { p_lead_id: String(id), p_actor_id: currentUser?.id ? String(currentUser.id) : null });
      if (error) throw error;
      onReload(); showToast("Lead archivado");
    } catch (error) { showToast(error.message || "Error al archivar", "error"); }
  };

  const filtered = visibleLeads.filter(l => {
    if (filterStatus !== "todos" && l.outbound_status !== filterStatus) return false;
    if (selBatch !== "todos" && l.batch !== selBatch) return false;
    if (filterSeller !== "todos" && l.assigned_seller !== filterSeller) return false;
    if (filterCity !== "todos" && l.city !== filterCity) return false;
    if (filterIndustry !== "todos" && l.industry !== filterIndustry) return false;
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
          <h1 style={{ fontFamily: D, fontSize: isMobile ? 20 : 26, fontWeight: 700, color: C.tx, letterSpacing: "-.02em" }}>{isSeller ? "Mi CRM" : "Leads Fríos"}</h1>
          <p style={{ fontSize: 12, color: C.td }}>{isSeller ? "Tu pipeline de prospección" : `Prospección outbound · ${visibleLeads.length} leads`}</p>
        </div>
        {!isSeller && <div style={{ display: "flex", gap: 6 }}>
          <Btn onClick={() => setModal({ type: "folders" })} v="secondary">📁 Carpetas</Btn>
          <Btn onClick={() => setModal({ type: "import" })}>+ Importar lote</Btn>
        </div>}
      </div>

      {/* Métricas por vendedor (solo admin) */}
      {!isSeller && sellers.length > 0 && <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {sellers.map(sel => {
          const sLeads = leads.filter(l => l.assigned_seller === sel.id);
          const contacted = sLeads.filter(l => l.outbound_status !== "sin_contactar").length;
          const demos = sLeads.filter(l => l.outbound_status === "reunion").length;
          const rate = sLeads.length > 0 ? Math.round((demos / sLeads.length) * 100) : 0;
          return <div key={sel.id} onClick={() => setFilterSeller(filterSeller === sel.id ? "todos" : sel.id)} style={{ flex: "1 1 160px", minWidth: 150, background: filterSeller === sel.id ? C.g + "12" : `${C.s}e8`, border: `1px solid ${filterSeller === sel.id ? C.g : C.b}80`, borderRadius: 12, padding: 14, cursor: "pointer", transition: "all .2s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: C.g + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.g, fontFamily: D }}>{sel.name[0]}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.tx }}>{sel.name}</div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div><div style={{ fontFamily: D, fontSize: 18, fontWeight: 800, color: C.tx }}>{sLeads.length}</div><div style={{ fontSize: 8, color: C.td }}>Leads</div></div>
              <div><div style={{ fontFamily: D, fontSize: 18, fontWeight: 800, color: C.bl }}>{contacted}</div><div style={{ fontSize: 8, color: C.td }}>Contactados</div></div>
              <div><div style={{ fontFamily: D, fontSize: 18, fontWeight: 800, color: C.g }}>{demos}</div><div style={{ fontSize: 8, color: C.td }}>Demos</div></div>
              <div><div style={{ fontFamily: D, fontSize: 18, fontWeight: 800, color: C.acc }}>{rate}%</div><div style={{ fontSize: 8, color: C.td }}>Conv.</div></div>
            </div>
          </div>;
        })}
      </div>}

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
        {!isSeller && selBatch !== "todos" && <Btn onClick={async () => {
          const count = leads.filter(l => l.batch === selBatch).length;
          if (!confirm(`¿Archivar el lote "${selBatch}" completo? Se ocultarán ${count} leads y se conservará la auditoría.`)) return;
          try {
            const { error } = await supabase.rpc("archive_cold_lead_batch", { p_batch: selBatch, p_actor_id: currentUser?.id ? String(currentUser.id) : null });
            if (error) { showToast("Error: " + error.message, "error"); return; }
            setSelBatch("todos"); onReload(); showToast(`Lote "${selBatch}" archivado (${count} leads)`);
          } catch (e) { showToast("Error: " + e.message, "error"); }
        }} v="secondary" sz="sm" style={{ color: C.r, borderColor: C.r + "40" }}>🗑️ Borrar lote</Btn>}
        <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} style={{ background: C.bg, border: `1px solid ${C.b}`, borderRadius: 10, padding: "9px 12px", color: C.tx, fontSize: 12, fontFamily: F, outline: "none", cursor: "pointer" }}>
          <option value="todos">Todos los canales</option>
          <option value="instagram">Con Instagram</option>
          <option value="email">Con Email</option>
          <option value="sin_social">Sin redes (solo email/tel)</option>
        </select>
        {cities.length > 1 && <select value={filterCity} onChange={e => setFilterCity(e.target.value)} style={{ background: C.bg, border: `1px solid ${C.b}`, borderRadius: 10, padding: "9px 12px", color: C.tx, fontSize: 12, fontFamily: F, outline: "none", cursor: "pointer" }}><option value="todos">Todas las ciudades</option>{cities.map(c => <option key={c} value={c}>{c}</option>)}</select>}
        {industries.length > 1 && <select value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)} style={{ background: C.bg, border: `1px solid ${C.b}`, borderRadius: 10, padding: "9px 12px", color: C.tx, fontSize: 12, fontFamily: F, outline: "none", cursor: "pointer" }}><option value="todos">Todas las industrias</option>{industries.map(i => <option key={i} value={i}>{i}</option>)}</select>}
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
                  {!isSeller && lead.assigned_seller && (() => { const s = sellers.find(e => e.id === lead.assigned_seller); return s ? <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 6, background: C.g + "18", color: C.g }}>📞 {s.name}</span> : null; })()}
                </div>
                <div style={{ fontSize: 11, color: C.tm }}>{lead.industry}{lead.city ? ` · ${lead.city}` : ""}</div>
                {/* Canales de contacto disponibles */}
                <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                  {(() => {
                    const hasIG = lead.instagram && lead.instagram.startsWith("http");
                    const hasFB = lead.facebook && lead.facebook.startsWith("http");
                    const hasEmail = lead.email && lead.email.includes("@");
                    const hasPhone = lead.phone && lead.phone.length > 4;
                    const hasWA = lead.whatsapp && lead.whatsapp.length > 4;
                    const chip = (ok, label, color) => <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: ok ? color + "18" : C.b + "40", color: ok ? color : C.td, border: `1px solid ${ok ? color + "30" : "transparent"}` }}>{ok ? "✓" : "✕"} {label}</span>;
                    return <>
                      {hasWA && chip(true, "WhatsApp", "#25D366")}
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
                  {lead.email && lead.email.includes("@") && <span style={{ color: C.acc }}>✉️ {lead.email}</span>}
                  {lead.instagram && lead.instagram.startsWith("http") && <a href={lead.instagram} target="_blank" rel="noopener noreferrer" style={{ color: C.p, textDecoration: "none" }}>📷 IG</a>}
                </div>
                {lead.problem && <div style={{ fontSize: 10, color: C.td, marginTop: 6, fontStyle: "italic" }}>💡 {lead.problem.slice(0, 120)}{lead.problem.length > 120 ? "..." : ""}</div>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                {lead.contact_eligibility === "ineligible" && <div style={{ fontSize: 9, fontWeight: 700, color: C.r }}>⛔ No contactar</div>}
                <select value={lead.outbound_status} onChange={e => updStatus(lead, e.target.value)} style={{ background: st.color + "15", border: `1px solid ${st.color}40`, borderRadius: 8, padding: "6px 10px", color: st.color, fontSize: 11, fontWeight: 600, fontFamily: F, outline: "none", cursor: "pointer" }}>
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

      {modal?.type === "import" && <ImportModal sellers={sellers} actorId={currentUser?.id} onClose={() => setModal(null)} onReload={onReload} showToast={showToast} />}
      {modal?.type === "folders" && <FoldersModal folders={folders} sellers={sellers} actorId={currentUser?.id} onClose={() => setModal(null)} onReload={onReload} showToast={showToast} />}
      {modal?.type === "detail" && <DetailModal lead={modal.lead} actorId={currentUser?.id} onClose={() => setModal(null)} onReload={onReload} onSaveNotes={updNotes} onCopied={() => showToast("Copiado")} showToast={showToast} />}
      {modal?.type === "convert" && <ConvertModal lead={modal.lead} onClose={() => setModal(null)} onConvert={onConvert} showToast={showToast} onReload={onReload} />}
    </div>
  );
}

function ImportModal({ sellers = [], actorId, onClose, onReload, showToast }) {
  const [link, setLink] = useState("");
  const [batch, setBatch] = useState("");
  const [assignSeller, setAssignSeller] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const readSheet = async () => {
    if (!link) return;
    // Si pegaron un link de carpeta por error
    if (link.includes("/drive/folders/") || link.includes("/folders/")) {
      showToast('Ese es un link de CARPETA. Usa el botón "📁 Carpetas" para importar desde carpetas, o pega el link de un Google Sheet individual.', "error");
      return;
    }
    setLoading(true); setPreview(null);
    const m = link.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    const sheetId = m ? m[1] : link;
    try {
      const rows = await readLeadsSheet(sheetId, batch, assignSeller || null);
      if (rows.length === 0) { showToast("No se encontraron leads. Revisa que la pestaña tenga datos y una columna Empresa o Médico.", "error"); setLoading(false); return; }
      setPreview(rows);
    } catch (e) {
      showToast("No se pudo leer: " + e.message, "error");
    }
    setLoading(false);
  };

  const doImport = async () => {
    if (!preview || preview.length === 0) return;
    setLoading(true);
    try {
      const result = await importLeads(preview, actorId);
      onReload(); showToast(`${result.inserted} nuevos · ${result.updated} actualizados sin duplicar`); onClose();
    } catch (e) { showToast("Error: " + e.message, "error"); setLoading(false); }
  };

  return <ModalWrap title="Importar lote de leads" onClose={onClose}>
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div><label style={{ fontSize: 11, fontWeight: 600, color: C.tm, fontFamily: F }}>Nombre del lote</label><input value={batch} onChange={e => setBatch(e.target.value)} placeholder="Ej: Niágara Automotriz Lote 01" style={{ width: "100%", background: C.bg, border: `1px solid ${C.b}`, borderRadius: 10, padding: "10px 14px", color: C.tx, fontSize: 13, fontFamily: F, outline: "none", marginTop: 6 }} /></div>
      {sellers.length > 0 && <div><label style={{ fontSize: 11, fontWeight: 600, color: C.g, fontFamily: F }}>Asignar a vendedor</label><select value={assignSeller} onChange={e => setAssignSeller(e.target.value)} style={{ width: "100%", background: C.bg, border: `1px solid ${assignSeller ? C.g : C.b}`, borderRadius: 10, padding: "10px 14px", color: C.tx, fontSize: 13, fontFamily: F, outline: "none", marginTop: 6, cursor: "pointer" }}><option value="">— Sin asignar (visible solo para admin) —</option>{sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><p style={{ fontSize: 10, color: C.td, marginTop: 4 }}>Estos leads aparecerán en el CRM de ese vendedor.</p></div>}
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

function DetailModal({ lead, actorId, onClose, onReload, onSaveNotes, onCopied, showToast }) {
  const [notes, setNotes] = useState(lead.notes || "");
  const [activities, setActivities] = useState([]);
  const [eligibility, setEligibility] = useState(lead.contact_eligibility || "review_required");
  const [basis, setBasis] = useState(lead.consent_basis || "unknown");
  const [eligibilityNotes, setEligibilityNotes] = useState(lead.eligibility_notes || "");
  const [consentSource, setConsentSource] = useState(lead.consent_source || "");
  const [consentCapturedAt, setConsentCapturedAt] = useState(lead.consent_captured_at?.slice(0, 10) || "");
  const [consentExpiresAt, setConsentExpiresAt] = useState(lead.consent_expires_at?.slice(0, 10) || "");
  const [activity, setActivity] = useState({ activity_type: "note", channel: "other", notes: "" });
  const canContact = lead.contact_eligibility === "eligible" && !lead.do_not_contact && !lead.unsubscribed_at;
  const loadActivities = async () => {
    const { data } = await supabase.from("cold_lead_activities").select("*").eq("lead_id", String(lead.id)).order("occurred_at", { ascending: false }).limit(30);
    setActivities(data || []);
  };
  useEffect(() => { loadActivities(); }, [lead.id]);
  const saveEligibility = async () => {
    const { error } = await supabase.rpc("review_cold_lead_eligibility", {
      p_lead_id: String(lead.id), p_eligibility: eligibility, p_consent_basis: basis,
      p_notes: eligibilityNotes || null, p_consent_source: consentSource || null,
      p_consent_captured_at: consentCapturedAt ? `${consentCapturedAt}T00:00:00Z` : null,
      p_consent_expires_at: consentExpiresAt ? `${consentExpiresAt}T23:59:59Z` : null,
      p_actor_id: actorId ? String(actorId) : null,
    });
    if (error) { showToast(error.message, "error"); return; }
    showToast("Revisión de elegibilidad auditada"); onReload(); onClose();
  };
  const markUnsubscribed = async () => {
    if (!confirm("¿Registrar una baja/no contactar? Esto bloqueará futuros contactos.")) return;
    const { error } = await supabase.rpc("mark_cold_lead_unsubscribed", {
      p_lead_id: String(lead.id), p_notes: eligibilityNotes || null, p_actor_id: actorId ? String(actorId) : null,
    });
    if (error) { showToast(error.message, "error"); return; }
    showToast("Baja registrada; contacto bloqueado"); onReload(); onClose();
  };
  const addActivity = async () => {
    if (!activity.notes.trim()) return;
    if (activity.activity_type === "contact_attempt" && !canContact) {
      showToast("El contacto requiere elegibilidad revisada", "error"); return;
    }
    const { error } = await supabase.from("cold_lead_activities").insert({
      lead_id: String(lead.id), activity_type: activity.activity_type,
      channel: activity.activity_type === "note" ? null : activity.channel,
      direction: activity.activity_type === "note" ? "internal" : activity.activity_type === "reply" ? "inbound" : "outbound",
      notes: activity.notes.trim(), actor_id: actorId ? String(actorId) : null,
    });
    if (error) { showToast(error.message, "error"); return; }
    setActivity({ activity_type: "note", channel: "other", notes: "" }); loadActivities(); showToast("Actividad registrada");
  };
  const field = (label, value) => value && value !== "No encontrado públicamente" ? <div style={{ marginBottom: 8 }}><div style={{ fontSize: 10, fontWeight: 600, color: C.tm, textTransform: "uppercase" }}>{label}</div><div style={{ fontSize: 12, color: C.tx, marginTop: 2 }}>{value}</div></div> : null;
  return <ModalWrap title={lead.company} onClose={onClose} w={620}>
    <div style={{ background: C.s2, borderRadius: 12, border: `1px solid ${C.b}`, padding: 14, marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.tx, marginBottom: 4 }}>Control de contacto saliente</div>
      <div style={{ fontSize: 10, color: C.tm, marginBottom: 8 }}>La ficha y los datos públicos siempre son visibles. Completa esta sección únicamente antes de registrar un mensaje comercial.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <select value={eligibility} onChange={e => setEligibility(e.target.value)} style={{ background: C.bg, border: `1px solid ${C.b}`, borderRadius: 8, padding: 8, color: C.tx }}>
          <option value="review_required">Revisión requerida</option><option value="eligible">Elegible</option><option value="ineligible">No elegible</option><option value="expired">Base expirada</option>
        </select>
        <select value={basis} onChange={e => setBasis(e.target.value)} style={{ background: C.bg, border: `1px solid ${C.b}`, borderRadius: 8, padding: 8, color: C.tx }}>
          <option value="unknown">Base desconocida</option><option value="express">Consentimiento expreso</option><option value="implied">Consentimiento implícito</option><option value="existing_business_relationship">Relación comercial existente</option><option value="inquiry">Consulta recibida</option><option value="other">Otra base documentada</option>
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, marginTop: 8 }}>
        <input value={consentSource} onChange={e => setConsentSource(e.target.value)} placeholder="Fuente/evidencia de la base" style={{ background: C.bg, border: `1px solid ${C.b}`, borderRadius: 8, padding: 8, color: C.tx }} />
        <input type="date" value={consentCapturedAt} onChange={e => setConsentCapturedAt(e.target.value)} title="Fecha de obtención" style={{ background: C.bg, border: `1px solid ${C.b}`, borderRadius: 8, padding: 8, color: C.tx }} />
        <input type="date" value={consentExpiresAt} onChange={e => setConsentExpiresAt(e.target.value)} title="Vencimiento cuando aplique" style={{ background: C.bg, border: `1px solid ${C.b}`, borderRadius: 8, padding: 8, color: C.tx }} />
      </div>
      <textarea value={eligibilityNotes} onChange={e => setEligibilityNotes(e.target.value)} placeholder="Evidencia, alcance y fecha de la revisión..." style={{ width: "100%", marginTop: 8, background: C.bg, border: `1px solid ${C.b}`, borderRadius: 8, padding: 8, color: C.tx, minHeight: 50 }} />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginTop: 8 }}><span style={{ fontSize: 9, color: C.td }}>La baja y el registro de auditoría siguen siendo obligatorios antes de cualquier automatización.</span><div style={{ display: "flex", gap: 6 }}><Btn onClick={markUnsubscribed} v="secondary" sz="sm" style={{ color: C.r }}>Registrar baja</Btn><Btn onClick={saveEligibility} sz="sm">Guardar revisión</Btn></div></div>
    </div>
    {/* Canales de contacto */}
    <div style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.b}`, padding: 14, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.tm, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Cómo contactar</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {lead.whatsapp && lead.whatsapp.length > 4 && <div style={{ fontSize: 13, color: "#25D366" }}>💬 WhatsApp: {lead.whatsapp}</div>}
        {lead.email && lead.email.includes("@") ? <div style={{ fontSize: 13, color: C.acc }}>✉️ {lead.email}</div> : <div style={{ fontSize: 12, color: C.td }}>✕ Sin email</div>}
        {lead.phone && lead.phone.length > 4 ? <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.g }}>📞 {lead.phone}</div> : <div style={{ fontSize: 12, color: C.td }}>✕ Sin teléfono</div>}
        {lead.instagram && lead.instagram.startsWith("http") ? <a href={lead.instagram} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#E1306C", textDecoration: "none" }}>📷 Instagram ↗</a> : <div style={{ fontSize: 12, color: C.td }}>✕ Sin Instagram</div>}
        {lead.facebook && lead.facebook.startsWith("http") ? <a href={lead.facebook} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#1877F2", textDecoration: "none" }}>📘 Facebook ↗</a> : <div style={{ fontSize: 12, color: C.td }}>✕ Sin Facebook</div>}
        {lead.rating && <div style={{ fontSize: 12, color: C.w }}>⭐ Rating Google: {lead.rating}</div>}
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
    <div style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.b}`, padding: 12, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.tm, textTransform: "uppercase", marginBottom: 6 }}>Procedencia y evidencia</div>
      <div style={{ fontSize: 11, color: C.tx }}>{lead.source_system || "legacy/manual"}{lead.source_external_id ? ` · ${lead.source_external_id}` : ""}</div>
      {lead.source_url && <a href={lead.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: C.bl }}>Abrir fuente ↗</a>}
      <div style={{ fontSize: 10, color: C.td, marginTop: 4 }}>Enriquecimiento: {lead.enrichment_status || "no iniciado"}</div>
    </div>
    {/* MENSAJES LISTOS PARA COPIAR */}
    {(lead.email_subject || lead.email_body || lead.initial_message || lead.followup_1 || lead.whatsapp_message) && <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.acc, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>📋 Borradores disponibles</div>
      <div style={{ fontSize: 9, color: C.td, marginBottom: 10 }}>Puedes consultar y copiar estos textos. Verifica la base aplicable antes de utilizarlos para contacto comercial.</div>
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
      {lead.whatsapp_message && <MsgBlock label="💬 Mensaje WhatsApp" text={lead.whatsapp_message} onCopied={onCopied} />}
      {lead.followup_1 && <MsgBlock label="🔁 Seguimiento 1" text={lead.followup_1} onCopied={onCopied} />}
      {lead.followup_2 && <MsgBlock label="🔁 Seguimiento 2" text={lead.followup_2} onCopied={onCopied} />}
    </div>}
    <div style={{ borderTop: `1px solid ${C.b}`, paddingTop: 14, marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.tm, marginBottom: 8 }}>REGISTRAR ACTIVIDAD</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <select value={activity.activity_type} onChange={e => setActivity({ ...activity, activity_type: e.target.value })} style={{ background: C.bg, border: `1px solid ${C.b}`, borderRadius: 8, padding: 7, color: C.tx }}><option value="note">Nota interna</option><option value="contact_attempt">Intento de contacto</option><option value="reply">Respuesta</option><option value="meeting">Reunión</option></select>
        {activity.activity_type !== "note" && <select value={activity.channel} onChange={e => setActivity({ ...activity, channel: e.target.value })} style={{ background: C.bg, border: `1px solid ${C.b}`, borderRadius: 8, padding: 7, color: C.tx }}><option value="email">Email</option><option value="phone">Teléfono</option><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="other">Otro</option></select>}
      </div>
      <textarea value={activity.notes} onChange={e => setActivity({ ...activity, notes: e.target.value })} placeholder="Resultado o contexto verificable..." style={{ width: "100%", marginTop: 7, background: C.bg, border: `1px solid ${C.b}`, borderRadius: 8, padding: 8, color: C.tx, minHeight: 50 }} />
      <Btn onClick={addActivity} disabled={!activity.notes.trim()} sz="sm">Añadir al historial</Btn>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>{activities.map(item => <div key={item.id} style={{ fontSize: 10, color: C.tm, padding: "6px 8px", background: C.bg, borderRadius: 7 }}><b style={{ color: C.tx }}>{item.activity_type}</b> · {new Date(item.occurred_at).toLocaleString()} {item.notes ? `— ${item.notes}` : ""}</div>)}</div>
    </div>
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

function FoldersModal({ folders = [], sellers = [], actorId, onClose, onReload, showToast }) {
  const [assignSeller, setAssignSeller] = useState("");
  const [link, setLink] = useState("");
  const [saveName, setSaveName] = useState("");
  const [loading, setLoading] = useState(false);
  const [sheets, setSheets] = useState(null);
  const [browsedName, setBrowsedName] = useState("");
  const [importingId, setImportingId] = useState(null);
  const [importedIds, setImportedIds] = useState([]);

  const extractId = (l) => { const m = l.match(/folders\/([a-zA-Z0-9_-]+)/); return m ? m[1] : l.trim(); };

  const browse = async (folderId, label) => {
    setLoading(true); setSheets(null); setBrowsedName(label || "");
    try {
      const r = await fetch(`/api/drive?action=list&folderId=${folderId}`);
      const j = await r.json();
      const files = Array.isArray(j.files) ? j.files : Array.isArray(j) ? j : [];
      const onlySheets = files.filter(f => f.mimeType && f.mimeType.includes("spreadsheet"));
      setSheets(onlySheets.length > 0 ? onlySheets : files);
    } catch (e) { showToast("Error leyendo carpeta", "error"); setSheets([]); }
    setLoading(false);
  };

  const browseFromLink = () => { if (!link) return; browse(extractId(link), ""); };

  const saveFolder = async () => {
    if (!saveName || !link) { showToast("Ponle nombre a la carpeta para guardarla", "error"); return; }
    try {
      await supabase.from("lead_folders").insert({ name: saveName, drive_folder_id: extractId(link) });
      onReload(); setSaveName(""); showToast("Carpeta guardada");
    } catch (e) { showToast("Error: " + e.message, "error"); }
  };

  const delFolder = async (id) => {
    if (!confirm("¿Eliminar esta carpeta guardada? (No borra nada de Drive)")) return;
    try { await supabase.from("lead_folders").delete().eq("id", id); onReload(); } catch {}
  };

  const importSheet = async (sheet) => {
    setImportingId(sheet.id);
    try {
      const rows = await readLeadsSheet(sheet.id, sheet.name, assignSeller || null);
      if (rows.length === 0) { showToast("No se encontraron leads en " + sheet.name, "error"); setImportingId(null); return; }
      const result = await importLeads(rows, actorId);
      onReload(); setImportedIds(p => [...p, sheet.id]);
      showToast(`${result.inserted} nuevos · ${result.updated} actualizados de "${sheet.name}"`);
    } catch (e) { showToast("Error: " + e.message, "error"); }
    setImportingId(null);
  };

  return <ModalWrap title="📁 Importar carpetas de leads" onClose={onClose} w={600}>
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* 1. Vendedor */}
      {sellers.length > 0 && <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: C.g, fontFamily: F }}>1. Asignar a vendedor</label>
        <select value={assignSeller} onChange={e => setAssignSeller(e.target.value)} style={{ width: "100%", background: C.bg, border: `1px solid ${assignSeller ? C.g : C.b}`, borderRadius: 10, padding: "10px 14px", color: C.tx, fontSize: 13, fontFamily: F, outline: "none", marginTop: 6, cursor: "pointer" }}>
          <option value="">— Sin asignar (solo admin) —</option>
          {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>}

      {/* 2. Link */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: C.acc, fontFamily: F }}>2. Link de la carpeta de Drive</label>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <input value={link} onChange={e => setLink(e.target.value)} placeholder="Pega el link de la carpeta" style={{ flex: 1, background: C.bg, border: `1px solid ${C.b}`, borderRadius: 10, padding: "10px 14px", color: C.tx, fontSize: 13, fontFamily: F, outline: "none" }} />
          <Btn onClick={browseFromLink} disabled={!link || loading}>{loading ? "..." : "Ver tablas"}</Btn>
        </div>
      </div>

      {/* Carpetas guardadas (acceso rápido) */}
      {folders.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {folders.map(f => <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 4, background: C.s2, borderRadius: 8, border: `1px solid ${C.b}`, padding: "4px 4px 4px 10px" }}>
          <button onClick={() => { setLink(`https://drive.google.com/drive/folders/${f.drive_folder_id}`); browse(f.drive_folder_id, f.name); }} style={{ background: "none", border: "none", color: C.bl, fontSize: 11, cursor: "pointer", fontFamily: F }}>📁 {f.name}</button>
          <button onClick={() => delFolder(f.id)} style={{ background: "none", border: "none", color: C.td, fontSize: 10, cursor: "pointer" }}>✕</button>
        </div>)}
      </div>}

      {/* Tablas encontradas */}
      {sheets !== null && <div style={{ borderTop: `1px solid ${C.b}`, paddingTop: 12 }}>
        {loading ? <p style={{ color: C.acc, fontSize: 13 }}>Leyendo carpeta...</p>
          : sheets.length === 0 ? <p style={{ color: C.td, fontSize: 12 }}>No hay tablas en esta carpeta.</p>
            : <>
              <div style={{ fontSize: 11, color: C.tm, marginBottom: 8 }}>{browsedName ? `📁 ${browsedName} · ` : ""}{sheets.length} tabla{sheets.length !== 1 ? "s" : ""}:</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{sheets.map(sh => {
                const done = importedIds.includes(sh.id);
                return <div key={sh.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: C.bg, borderRadius: 12, border: `1px solid ${done ? C.g + "40" : C.b}` }}>
                  <span style={{ fontSize: 16 }}>📊</span>
                  <span style={{ flex: 1, fontSize: 13, color: C.tx }}>{sh.name}</span>
                  {done ? <span style={{ fontSize: 12, color: C.g, fontWeight: 600 }}>✓ Importado</span>
                    : <Btn onClick={() => importSheet(sh)} sz="sm" disabled={importingId === sh.id}>{importingId === sh.id ? "Importando..." : "Importar"}</Btn>}
                </div>;
              })}</div>
            </>}
      </div>}

      {/* Guardar carpeta para después (opcional) */}
      {link && <div style={{ borderTop: `1px solid ${C.b}`, paddingTop: 12, display: "flex", gap: 8, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, color: C.td, fontFamily: F }}>Guardar carpeta para acceso rápido (opcional)</label>
          <input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="Ej: St. Catharines - Automotriz" style={{ width: "100%", background: C.bg, border: `1px solid ${C.b}`, borderRadius: 10, padding: "8px 12px", color: C.tx, fontSize: 12, fontFamily: F, outline: "none", marginTop: 4 }} />
        </div>
        <Btn onClick={saveFolder} v="secondary" sz="sm" disabled={!saveName}>Guardar</Btn>
      </div>}
    </div>
  </ModalWrap>;
}
