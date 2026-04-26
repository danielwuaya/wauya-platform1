import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase.js";

const C = { bg:"#060B18",s:"#0A1428",s2:"#0F1D38",b:"#1A2D52",tx:"#F0F0F4",tm:"#8A94A8",td:"#4A5568",acc:"#F8BA10",r:"#FF4D6A",g:"#36DE67",w:"#FFC107",p:"#4A90D9",bl:"#60A5FA",blBg:"#0A1633" };
const F = "'Poppins', sans-serif", D = "'Playfair Display', serif";

const STATUSES = {
  pendiente: { label: "⏳ Pendiente", color: "#F59E0B", bg: "#F59E0B18" },
  aprobado: { label: "✅ Aprobado", color: "#34D399", bg: "#34D39918" },
  cambios: { label: "✏️ Cambios", color: "#FF4D6A", bg: "#FF4D6A18" },
};

export default function Approvals({ clientId, readOnly = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", file_url: "" });
  const [comment, setComment] = useState({});

  const load = useCallback(async () => {
    const { data } = await supabase.from("approvals").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
    if (data) setItems(data);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!form.title) return;
    await supabase.from("approvals").insert({ client_id: clientId, ...form });
    setForm({ title: "", description: "", file_url: "" }); setShowAdd(false); load();
  };

  const updateStatus = async (id, status, clientComment) => {
    const updates = { status };
    if (clientComment !== undefined) updates.client_comment = clientComment;
    await supabase.from("approvals").update(updates).eq("id", id);
    load();
  };

  const del = async (id) => { if (confirm("¿Eliminar?")) { await supabase.from("approvals").delete().eq("id", id); load(); } };

  const pending = items.filter(i => i.status === "pendiente").length;
  const approved = items.filter(i => i.status === "aprobado").length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h3 style={{ fontFamily: D, fontSize: 14, fontWeight: 700, color: C.tx, margin: 0 }}>
            {readOnly ? "Contenido para aprobar" : "Aprobaciones"} ({items.length})
          </h3>
          {items.length > 0 && <div style={{ fontSize: 10, color: C.tm, marginTop: 2 }}>
            ⏳ {pending} pendientes · ✅ {approved} aprobados
          </div>}
        </div>
        {!readOnly && <button onClick={() => setShowAdd(!showAdd)} style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 8, padding: "5px 12px", color: C.tx, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: F }}>
          + Enviar a aprobar
        </button>}
      </div>

      {showAdd && !readOnly && (
        <div style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.b}`, padding: 14, marginBottom: 14 }}>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Título (ej: Post Instagram Semana 1)"
            style={{ width: "100%", background: C.s, border: `1px solid ${C.b}`, borderRadius: 6, padding: "7px 10px", color: C.tx, fontSize: 12, fontFamily: F, outline: "none", marginBottom: 8, boxSizing: "border-box" }} />
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descripción o copy del contenido..."
            style={{ width: "100%", background: C.s, border: `1px solid ${C.b}`, borderRadius: 6, padding: "7px 10px", color: C.tx, fontSize: 12, fontFamily: F, outline: "none", resize: "vertical", minHeight: 50, marginBottom: 8, boxSizing: "border-box" }} />
          <input value={form.file_url} onChange={e => setForm({ ...form, file_url: e.target.value })} placeholder="Link del archivo (Google Drive, Canva, etc.)"
            style={{ width: "100%", background: C.s, border: `1px solid ${C.b}`, borderRadius: 6, padding: "7px 10px", color: C.tx, fontSize: 12, fontFamily: F, outline: "none", marginBottom: 10, boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", color: C.tm, cursor: "pointer", fontSize: 11, fontFamily: F }}>Cancelar</button>
            <button onClick={add} disabled={!form.title} style={{ background: C.acc, color: "#000", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 11, fontWeight: 700, fontFamily: F, cursor: "pointer", opacity: form.title ? 1 : 0.4 }}>Enviar</button>
          </div>
        </div>
      )}

      {loading && <div style={{ fontSize: 12, color: C.tm, padding: 16, textAlign: "center" }}>Cargando...</div>}

      {!loading && items.length === 0 && (
        <div style={{ textAlign: "center", padding: 28, color: C.td, fontSize: 12 }}>
          {readOnly ? "No hay contenido pendiente de aprobación" : "Envía contenido para que el cliente lo apruebe"}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map(item => {
          const st = STATUSES[item.status] || STATUSES.pendiente;
          return (
            <div key={item.id} style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.b}`, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.tx, fontFamily: F }}>{item.title}</div>
                  {item.description && <div style={{ fontSize: 11, color: C.tm, marginTop: 3, lineHeight: 1.5 }}>{item.description}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: st.color, background: st.bg, padding: "3px 8px", borderRadius: 12, fontFamily: F }}>{st.label}</span>
                  {!readOnly && <button onClick={() => del(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.r, fontSize: 12 }}>✕</button>}
                </div>
              </div>

              {item.file_url && (
                <a href={item.file_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: C.bl, textDecoration: "none", padding: "3px 8px", background: C.blBg, borderRadius: 6, marginBottom: 6, border: `1px solid ${C.bl}30` }}>
                  📎 Ver archivo
                </a>
              )}

              {item.client_comment && (
                <div style={{ fontSize: 11, color: C.w, marginTop: 6, padding: "6px 10px", background: C.w + "10", borderRadius: 6, borderLeft: `3px solid ${C.w}` }}>
                  💬 {item.client_comment}
                </div>
              )}

              {/* Client actions */}
              {readOnly && item.status === "pendiente" && (
                <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <input value={comment[item.id] || ""} onChange={e => setComment({ ...comment, [item.id]: e.target.value })} placeholder="Comentario (opcional)"
                      style={{ width: "100%", background: C.s, border: `1px solid ${C.b}`, borderRadius: 6, padding: "6px 8px", color: C.tx, fontSize: 11, fontFamily: F, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <button onClick={() => updateStatus(item.id, "aprobado", comment[item.id] || "")}
                    style={{ background: C.g + "20", border: `1px solid ${C.g}40`, borderRadius: 6, padding: "6px 12px", color: C.g, cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: F, whiteSpace: "nowrap" }}>
                    ✅ Aprobar
                  </button>
                  <button onClick={() => { if (!comment[item.id]) { alert("Escribe un comentario indicando los cambios"); return; } updateStatus(item.id, "cambios", comment[item.id]); }}
                    style={{ background: C.r + "10", border: `1px solid ${C.r}30`, borderRadius: 6, padding: "6px 12px", color: C.r, cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: F, whiteSpace: "nowrap" }}>
                    ✏️ Pedir cambios
                  </button>
                </div>
              )}

              {/* Admin: re-send for approval */}
              {!readOnly && item.status === "cambios" && (
                <button onClick={() => updateStatus(item.id, "pendiente", "")} style={{ marginTop: 8, background: C.w + "20", border: `1px solid ${C.w}40`, borderRadius: 6, padding: "5px 12px", color: C.w, cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: F }}>
                  🔄 Re-enviar a aprobación
                </button>
              )}

              <div style={{ fontSize: 9, color: C.td, marginTop: 6 }}>{new Date(item.created_at).toLocaleDateString()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
