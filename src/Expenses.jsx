import { useState } from "react";

const C = { bg:"#060B18",s:"#0A1428",s2:"#0F1D38",b:"#1A2D52",tx:"#F0F0F4",tm:"#8A94A8",td:"#4A5568",acc:"#F8BA10",r:"#FF4D6A",g:"#36DE67",w:"#FFC107",p:"#4A90D9",bl:"#60A5FA" };
const F = "'Poppins', sans-serif", D = "'Playfair Display', serif";
const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const CATS = [{value:"operaciones",label:"Operaciones",icon:"⚙️"},{value:"publicidad",label:"Publicidad",icon:"📢"},{value:"personal",label:"Personal",icon:"👥"},{value:"software",label:"Software",icon:"💻"},{value:"otro",label:"Otro",icon:"📎"}];

export default function Expenses({ expenses=[], onAdd, onDelete, onUpdate, compact=false }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name:"", category:"operaciones", currency:"USD", amount:"", month:new Date().getMonth()+1, year:new Date().getFullYear(), recurring:false, notes:"" });
  const [selYear, setSelYear] = useState(new Date().getFullYear());

  const yearExpenses = expenses.filter(e => e.year === selYear);
  const monthlyTotals = MONTHS.map((_, mi) => yearExpenses.filter(e => e.month === mi + 1).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0));
  const grandTotal = monthlyTotals.reduce((s, v) => s + v, 0);
  const usdTotal = yearExpenses.filter(e => e.currency === "USD").reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const cadTotal = yearExpenses.filter(e => e.currency === "CAD").reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const maxMonth = Math.max(...monthlyTotals, 1);
  const currentMonth = new Date().getMonth();

  // Group by category
  const byCategory = {};
  yearExpenses.forEach(e => {
    if (!byCategory[e.category]) byCategory[e.category] = [];
    byCategory[e.category].push(e);
  });

  const handleAdd = () => {
    if (!form.name || !form.amount) return;
    onAdd({ ...form, amount: parseFloat(form.amount) || 0 });
    setForm({ ...form, name: "", amount: "", notes: "" });
    setShowAdd(false);
  };

  // COMPACT view for dashboard
  if (compact) return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>💸</span>
          <span style={{ fontFamily: D, fontSize: 14, fontWeight: 700, color: C.tx }}>Gastos {selYear}</span>
        </div>
        <span style={{ fontFamily: D, fontSize: 18, fontWeight: 800, color: C.r }}>${grandTotal.toLocaleString("en")}</span>
      </div>
      {yearExpenses.length > 0 ? <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {Object.entries(byCategory).map(([cat, items]) => {
          const catInfo = CATS.find(c => c.value === cat) || CATS[4];
          const total = items.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
          return <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
            <span>{catInfo.icon}</span>
            <span style={{ flex: 1, color: C.tx }}>{catInfo.label}</span>
            <div style={{ width: 60, height: 4, background: C.b, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${Math.min((total / grandTotal) * 100, 100)}%`, height: "100%", background: C.acc, borderRadius: 2 }} />
            </div>
            <span style={{ color: C.tx, fontWeight: 600, minWidth: 50, textAlign: "right" }}>${total.toLocaleString("en")}</span>
          </div>;
        })}
      </div> : <p style={{ fontSize: 11, color: C.td }}>Sin gastos registrados</p>}
    </div>
  );

  // FULL view
  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${C.acc},#D4A00E)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 4px 12px rgba(248,186,16,.2)" }}>💸</div>
          <div>
            <div style={{ fontFamily: D, fontSize: 16, fontWeight: 700, color: C.tx }}>Gastos de Wuaya</div>
            <div style={{ fontSize: 10, color: C.td }}>{yearExpenses.length} gastos en {selYear}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <select value={selYear} onChange={e => setSelYear(parseInt(e.target.value))} style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 8, padding: "6px 10px", color: C.tx, fontSize: 12, fontFamily: F, outline: "none" }}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => setShowAdd(!showAdd)} style={{ background: showAdd ? "transparent" : `linear-gradient(135deg,${C.acc},#D4A00E)`, color: showAdd ? C.tm : "#060B18", border: `1px solid ${showAdd ? C.b : C.acc}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: F }}>{showAdd ? "✕ Cancelar" : "+ Agregar gasto"}</button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && <div style={{ background: C.bg, borderRadius: 12, padding: 16, border: `1px solid ${C.acc}30`, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nombre (ej: Canva Pro)" style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: 8, padding: "9px 12px", color: C.tx, fontSize: 12, fontFamily: F, outline: "none" }} />
          <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="Monto" style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: 8, padding: "9px 12px", color: C.tx, fontSize: 12, fontFamily: F, outline: "none" }} />
          <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: 8, padding: "9px 12px", color: C.tx, fontSize: 12, fontFamily: F, outline: "none" }}>
            <option value="USD">USD</option><option value="CAD">CAD</option>
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: 8, padding: "9px 12px", color: C.tx, fontSize: 12, fontFamily: F, outline: "none" }}>
            {CATS.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
          </select>
          <select value={form.month} onChange={e => setForm({ ...form, month: parseInt(e.target.value) })} style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: 8, padding: "9px 12px", color: C.tx, fontSize: 12, fontFamily: F, outline: "none" }}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={form.year} onChange={e => setForm({ ...form, year: parseInt(e.target.value) })} style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: 8, padding: "9px 12px", color: C.tx, fontSize: 12, fontFamily: F, outline: "none" }}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.tm, cursor: "pointer" }}>
            <input type="checkbox" checked={form.recurring} onChange={e => setForm({ ...form, recurring: e.target.checked })} /> Recurrente
          </label>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notas (opcional)" style={{ flex: 1, background: C.s, border: `1px solid ${C.b}`, borderRadius: 8, padding: "9px 12px", color: C.tx, fontSize: 12, fontFamily: F, outline: "none" }} />
          <button onClick={handleAdd} disabled={!form.name || !form.amount} style={{ background: `linear-gradient(135deg,${C.acc},#D4A00E)`, color: "#060B18", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: F, opacity: form.name && form.amount ? 1 : 0.4 }}>Guardar</button>
        </div>
      </div>}

      {/* Summary cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.b}`, padding: "14px 18px", flex: "1 1 120px" }}>
          <div style={{ fontSize: 10, color: C.tm, textTransform: "uppercase", letterSpacing: ".06em" }}>Total {selYear}</div>
          <div style={{ fontFamily: D, fontSize: 26, fontWeight: 800, color: C.r, marginTop: 4 }}>${grandTotal.toLocaleString("en")}</div>
        </div>
        <div style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.b}`, padding: "14px 18px", flex: "1 1 100px" }}>
          <div style={{ fontSize: 10, color: C.tm, textTransform: "uppercase" }}>USD</div>
          <div style={{ fontFamily: D, fontSize: 20, fontWeight: 700, color: C.acc, marginTop: 4 }}>${usdTotal.toLocaleString("en")}</div>
        </div>
        {cadTotal > 0 && <div style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.b}`, padding: "14px 18px", flex: "1 1 100px" }}>
          <div style={{ fontSize: 10, color: C.tm, textTransform: "uppercase" }}>CAD</div>
          <div style={{ fontFamily: D, fontSize: 20, fontWeight: 700, color: C.bl, marginTop: 4 }}>C${cadTotal.toLocaleString("en")}</div>
        </div>}
        <div style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.b}`, padding: "14px 18px", flex: "1 1 100px" }}>
          <div style={{ fontSize: 10, color: C.tm, textTransform: "uppercase" }}>Promedio mensual</div>
          <div style={{ fontFamily: D, fontSize: 20, fontWeight: 700, color: C.p, marginTop: 4 }}>${Math.round(grandTotal / 12).toLocaleString("en")}</div>
        </div>
      </div>

      {/* Monthly bar chart */}
      <div style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.b}`, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.tm, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".05em" }}>Gastos mes a mes</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140, padding: "0 4px" }}>
          {MONTHS.map((m, i) => {
            const val = monthlyTotals[i];
            const h = val > 0 ? Math.max((val / maxMonth) * 100, 4) : 4;
            const isCurrent = i === currentMonth;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                {val > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: isCurrent ? C.acc : C.tx }}>${val}</span>}
                <div style={{ width: "100%", maxWidth: 40, height: h, borderRadius: "4px 4px 1px 1px", background: isCurrent ? `linear-gradient(180deg,${C.acc},${C.acc}88)` : val > 0 ? `linear-gradient(180deg,${C.p},${C.p}55)` : C.b, transition: "height .4s", border: isCurrent ? `1px solid ${C.acc}` : "none" }} />
                <span style={{ fontSize: 9, fontWeight: isCurrent ? 700 : 400, color: isCurrent ? C.acc : C.td }}>{m}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Data table by category */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 600 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "8px 10px", color: C.tm, fontWeight: 600, borderBottom: `2px solid ${C.acc}`, minWidth: 160 }}>Gasto</th>
              <th style={{ padding: "8px 4px", color: C.td, fontWeight: 500, borderBottom: `2px solid ${C.acc}`, fontSize: 9 }}>Cat</th>
              <th style={{ padding: "8px 4px", color: C.td, fontWeight: 500, borderBottom: `2px solid ${C.acc}`, fontSize: 9 }}>$</th>
              {MONTHS.map((m, i) => (
                <th key={i} style={{ padding: "8px 4px", color: i === currentMonth ? C.acc : C.tm, fontWeight: i === currentMonth ? 700 : 500, borderBottom: `2px solid ${C.acc}`, textAlign: "center" }}>{m}</th>
              ))}
              <th style={{ padding: "8px 6px", color: C.acc, fontWeight: 700, borderBottom: `2px solid ${C.acc}`, textAlign: "right" }}>Total</th>
              <th style={{ padding: "8px 4px", borderBottom: `2px solid ${C.acc}`, width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {/* Total row */}
            <tr style={{ background: C.acc + "10" }}>
              <td style={{ padding: "8px 10px", fontWeight: 700, color: C.acc }}>TOTAL</td>
              <td></td><td></td>
              {monthlyTotals.map((v, i) => (
                <td key={i} style={{ padding: "8px 4px", textAlign: "center", fontWeight: 700, color: C.acc }}>{v > 0 ? `$${v.toLocaleString("en")}` : ""}</td>
              ))}
              <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 800, color: C.acc, fontFamily: D, fontSize: 13 }}>${grandTotal.toLocaleString("en")}</td>
              <td></td>
            </tr>
            {/* Data rows grouped by unique expense name */}
            {(() => {
              const names = [...new Set(yearExpenses.map(e => e.name))];
              return names.map(name => {
                const items = yearExpenses.filter(e => e.name === name);
                const catInfo = CATS.find(c => c.value === items[0]?.category) || CATS[4];
                const rowTotal = items.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
                const monthly = MONTHS.map((_, mi) => items.filter(e => e.month === mi + 1).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0));
                return (
                  <tr key={name} style={{ borderBottom: `1px solid ${C.b}15` }}>
                    <td style={{ padding: "6px 10px", color: C.tx, fontWeight: 500 }}>{name}</td>
                    <td style={{ padding: "6px 4px", fontSize: 12, textAlign: "center" }}>{catInfo.icon}</td>
                    <td style={{ padding: "6px 4px", fontSize: 9, color: items[0]?.currency === "CAD" ? C.bl : C.td }}>{items[0]?.currency}</td>
                    {monthly.map((v, mi) => (
                      <td key={mi} style={{ padding: "6px 4px", textAlign: "center", color: v > 0 ? C.tx : C.td + "30" }}>{v > 0 ? `$${v.toLocaleString("en")}` : "·"}</td>
                    ))}
                    <td style={{ padding: "6px 6px", textAlign: "right", fontWeight: 600, color: C.tx }}>${rowTotal.toLocaleString("en")}</td>
                    <td style={{ padding: "6px 4px", textAlign: "center" }}>
                      <button onClick={() => { if (confirm("¿Eliminar todos los gastos de \"" + name + "\"?")) items.forEach(e => onDelete(e.id)); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.r, fontSize: 10 }}>🗑️</button>
                    </td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </div>

      {yearExpenses.length === 0 && <div style={{ textAlign: "center", padding: 32, color: C.td, fontSize: 12 }}>Sin gastos para {selYear}. Click "+ Agregar gasto" para empezar.</div>}
    </div>
  );
}
