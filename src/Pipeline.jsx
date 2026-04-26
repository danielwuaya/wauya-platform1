import { useState } from "react";

const C = { bg:"#060B18",s:"#0A1428",s2:"#0F1D38",b:"#1A2D52",tx:"#F0F0F4",tm:"#8A94A8",td:"#4A5568",acc:"#F8BA10",r:"#FF4D6A",g:"#36DE67",w:"#FFC107",p:"#4A90D9",bl:"#60A5FA" };
const F = "'Poppins', sans-serif", D = "'Playfair Display', serif";

const STAGES = [
  { value: "nuevo", label: "Nuevo", color: "#6B7280", icon: "🆕" },
  { value: "contactado", label: "Contactado", color: "#60A5FA", icon: "📞" },
  { value: "reunion", label: "Reunión", color: "#A78BFA", icon: "🤝" },
  { value: "propuesta", label: "Propuesta", color: "#F59E0B", icon: "📄" },
  { value: "ganado", label: "Ganado", color: "#34D399", icon: "🏆" },
  { value: "perdido", label: "Perdido", color: "#FF4D6A", icon: "❌" },
];

export default function Pipeline({ prospects, onMove, onSelect }) {
  const [dragging, setDragging] = useState(null);

  const getProspects = (stage) => prospects.filter(p => (p.pipeline_status || "nuevo") === stage);
  const total = prospects.length;
  const won = getProspects("ganado").length;
  const convRate = total > 0 ? Math.round((won / total) * 100) : 0;

  return (
    <div>
      {/* Stats bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {STAGES.slice(0, -1).map(stage => {
          const count = getProspects(stage.value).length;
          return (
            <div key={stage.value} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.tm, fontFamily: F }}>
              <span style={{ fontSize: 12 }}>{stage.icon}</span>
              <span style={{ fontWeight: 600, color: stage.color }}>{count}</span>
              <span>{stage.label}</span>
            </div>
          );
        })}
        <div style={{ marginLeft: "auto", fontSize: 11, color: C.g, fontWeight: 700, fontFamily: F }}>
          Conversión: {convRate}%
        </div>
      </div>

      {/* Kanban board */}
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
        {STAGES.map(stage => {
          const items = getProspects(stage.value);
          return (
            <div key={stage.value}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = stage.color + "10"; }}
              onDragLeave={e => { e.currentTarget.style.background = "transparent"; }}
              onDrop={e => { e.preventDefault(); e.currentTarget.style.background = "transparent"; if (dragging) { onMove(dragging, stage.value); setDragging(null); } }}
              style={{ flex: "1 1 0", minWidth: 150, maxWidth: 200, background: "transparent", borderRadius: 10, transition: "background .15s" }}>
              {/* Column header */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>{stage.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: stage.color, fontFamily: F }}>{stage.label}</span>
                <span style={{ fontSize: 10, color: C.td, background: C.bg, padding: "1px 6px", borderRadius: 8 }}>{items.length}</span>
              </div>

              {/* Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, minHeight: 80, padding: "0 4px" }}>
                {items.length === 0 && (
                  <div style={{ padding: 16, textAlign: "center", fontSize: 10, color: C.td, borderRadius: 8, border: `1px dashed ${C.b}` }}>
                    Arrastra aquí
                  </div>
                )}
                {items.map(p => (
                  <div key={p.id} draggable onDragStart={() => setDragging(p.id)} onDragEnd={() => setDragging(null)}
                    onClick={() => onSelect && onSelect(p.id)}
                    style={{ background: C.s, borderRadius: 8, border: `1px solid ${C.b}`, padding: "10px 12px", cursor: "grab", transition: "all .15s", borderLeft: `3px solid ${stage.color}` }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = stage.color + "60"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.b; e.currentTarget.style.transform = ""; }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.tx, fontFamily: F, marginBottom: 3 }}>{p.company || p.name}</div>
                    {p.name !== p.company && p.company && <div style={{ fontSize: 10, color: C.tm }}>{p.name}</div>}
                    {p.services && <div style={{ fontSize: 9, color: C.td, marginTop: 4 }}>🎯 {p.services}</div>}
                    {p.email && <div style={{ fontSize: 9, color: C.td, marginTop: 2 }}>✉ {p.email}</div>}
                    {p.drive_folder_id && <div style={{ fontSize: 9, color: C.g, marginTop: 3 }}>📁 Drive vinculado</div>}
                    {/* Quick move buttons */}
                    <div style={{ display: "flex", gap: 3, marginTop: 6, flexWrap: "wrap" }}>
                      {STAGES.filter(s => s.value !== stage.value).slice(0, 3).map(s => (
                        <button key={s.value} onClick={e => { e.stopPropagation(); onMove(p.id, s.value); }}
                          style={{ background: s.color + "15", border: `1px solid ${s.color}25`, borderRadius: 4, padding: "2px 6px", color: s.color, cursor: "pointer", fontSize: 8, fontWeight: 600, fontFamily: F }}>
                          → {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
