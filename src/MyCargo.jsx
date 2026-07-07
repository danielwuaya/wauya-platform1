import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "./supabase.js";

const C = { bg:"#060B18",s:"#0A1428",s2:"#0F1D38",b:"#1A2D52",tx:"#F0F0F4",tm:"#8A94A8",td:"#4A5568",acc:"#F8BA10",r:"#FF4D6A",g:"#36DE67",w:"#FFC107",p:"#4A90D9",bl:"#60A5FA",blBg:"#0A1633" };
const F = "'Poppins', sans-serif", D = "'Playfair Display', serif";

// TARIFA CONSTANTS
const RATE_PER_LB = 8.75;
const MIN_CHARGE = 25;
const BOX_FULL = 75;
const BOX_HALF = 38;
const CAT_C_PER_LB = 6;
const CAT_C_TRAMITE = 50;
const CAT_C_TRANSPORTE = 10;
const CAT_C_BODEGAJE_LB = 0.75;

const RATE_TYPES = [
  { value:"libra", label:"Consolidado por libra", desc:"$8.75/lb · mínimo $25" },
  { value:"cuatroxcuatro", label:"4x4 (por caja)", desc:"$75 completo · $38 medio" },
  { value:"categoria_c", label:"Categoría C", desc:"$6/lb + trámite + transporte + bodegaje" },
];

const STATUSES = [
  { value:"bodega", label:"Llegó a bodega", color:"#6B7280", icon:"📦" },
  { value:"transito", label:"En tránsito", color:"#3B82F6", icon:"✈️" },
  { value:"aduana", label:"En aduana", color:"#F59E0B", icon:"🛃" },
  { value:"pago", label:"Solicitud de pago", color:"#8B5CF6", icon:"💳" },
  { value:"retiro", label:"Disponible para retiro", color:"#10B981", icon:"📍" },
  { value:"entregado", label:"Entregado", color:"#36DE67", icon:"✅" },
];

// AUTO CALCULATION
function calcShipping(pkg) {
  const weight = parseFloat(pkg.weight) || 0;
  const arancel = parseFloat(pkg.arancel) || 0;
  if (pkg.rate_type === "libra") {
    const base = Math.max(weight * RATE_PER_LB, MIN_CHARGE);
    return base + arancel;
  }
  if (pkg.rate_type === "cuatroxcuatro") {
    const full = (parseInt(pkg.boxes_full) || 0) * BOX_FULL;
    const half = (parseInt(pkg.boxes_half) || 0) * BOX_HALF;
    return full + half + arancel;
  }
  if (pkg.rate_type === "categoria_c") {
    return (weight * CAT_C_PER_LB) + CAT_C_TRAMITE + CAT_C_TRANSPORTE + (weight * CAT_C_BODEGAJE_LB) + arancel;
  }
  return arancel;
}

function Btn({children,onClick,v="primary",sz="md",disabled,style:sx}){const b={display:"inline-flex",alignItems:"center",gap:7,border:"none",cursor:disabled?"not-allowed":"pointer",fontFamily:F,fontWeight:600,borderRadius:10,transition:"all .2s",opacity:disabled?.35:1,whiteSpace:"nowrap",fontSize:sz==="sm"?11:13,padding:sz==="sm"?"6px 12px":"9px 18px"};const vs={primary:{background:`linear-gradient(135deg,${C.acc},#D4A00E)`,color:"#060B18",boxShadow:"0 2px 8px rgba(248,186,16,.2)"},secondary:{background:C.s2,color:C.tx,border:`1px solid ${C.b}`},danger:{background:C.r+"18",color:C.r,border:`1px solid ${C.r}25`},ghost:{background:"transparent",color:C.tm}};return<button onClick={onClick} disabled={disabled} style={{...b,...vs[v],...sx}}>{children}</button>}
function Inp({label,...p}){return<div style={{display:"flex",flexDirection:"column",gap:6}}>{label&&<label style={{fontSize:11,fontWeight:600,color:C.tm,fontFamily:F}}>{label}</label>}<input {...p} style={{background:C.bg,border:`1px solid ${C.b}`,borderRadius:10,padding:"10px 14px",color:C.tx,fontSize:13,fontFamily:F,outline:"none",width:"100%",...p.style}}/></div>}
function Sel({label,options,...p}){return<div style={{display:"flex",flexDirection:"column",gap:6}}>{label&&<label style={{fontSize:11,fontWeight:600,color:C.tm,fontFamily:F}}>{label}</label>}<select {...p} style={{background:C.bg,border:`1px solid ${C.b}`,borderRadius:10,padding:"10px 14px",color:C.tx,fontSize:13,fontFamily:F,outline:"none",cursor:"pointer",...p.style}}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div>}
function Card({children,style:sx,onClick}){return<div onClick={onClick} style={{background:`${C.s}e8`,borderRadius:14,border:`1px solid ${C.b}80`,padding:20,cursor:onClick?"pointer":"default",transition:"all .2s",...sx}}>{children}</div>}
function Badge({label,color}){return<span style={{fontSize:10,fontWeight:600,padding:"3px 9px",borderRadius:8,background:color+"18",color}}>{label}</span>}

export default function MyCargo({ toast }) {
  const [tab, setTab] = useState("dashboard");
  const [clients, setClients] = useState([]);
  const [packages, setPackages] = useState([]);
  const [manifests, setManifests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selClient, setSelClient] = useState(null);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const showToast = toast || (() => {});

  const loadAll = useCallback(async () => {
    try {
      const [c, p, m] = await Promise.all([
        supabase.from("cargo_clients").select("*").order("created_at", { ascending: false }),
        supabase.from("cargo_packages").select("*").order("created_at", { ascending: false }),
        supabase.from("cargo_manifests").select("*").order("created_at", { ascending: false }),
      ]);
      if (c.data) setClients(c.data);
      if (p.data) setPackages(p.data);
      if (m.data) setManifests(m.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Dashboard stats
  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now - 7 * 864e5);
    const weekPkgs = packages.filter(p => new Date(p.created_at) >= weekAgo);
    const totalWeight = packages.reduce((s, p) => s + (parseFloat(p.weight) || 0), 0);
    const totalRevenue = packages.reduce((s, p) => s + calcShipping(p), 0);
    const weekRevenue = weekPkgs.reduce((s, p) => s + calcShipping(p), 0);
    const byStatus = {};
    STATUSES.forEach(st => { byStatus[st.value] = packages.filter(p => p.status === st.value).length; });
    return { totalPkgs: packages.length, weekPkgs: weekPkgs.length, totalWeight, totalRevenue, weekRevenue, byStatus };
  }, [packages]);

  const clientPkgs = (cid) => packages.filter(p => p.cargo_client_id === cid);
  const clientTotal = (cid) => clientPkgs(cid).reduce((s, p) => s + calcShipping(p), 0);

  const addClient = async (data) => {
    try { await supabase.from("cargo_clients").insert(data); await loadAll(); setModal(null); showToast("Cliente creado"); }
    catch (e) { showToast("Error: " + e.message, "error"); }
  };
  const addPackage = async (data) => {
    try {
      const shipping = calcShipping(data);
      const clean = {
        cargo_client_id: data.cargo_client_id,
        manifest_id: data.manifest_id || null,
        tracking_number: data.tracking_number || "",
        description: data.description || "",
        weight: parseFloat(data.weight) || 0,
        invoice_value: parseFloat(data.invoice_value) || 0,
        invoice_url: data.invoice_url || "",
        invoice_name: data.invoice_name || "",
        rate_type: data.rate_type || "libra",
        boxes_full: parseInt(data.boxes_full) || 0,
        boxes_half: parseInt(data.boxes_half) || 0,
        arancel: parseFloat(data.arancel) || 0,
        shipping_cost: shipping,
        status: data.status || "bodega",
        estimated_delivery: data.estimated_delivery || null,
      };
      const { error } = await supabase.from("cargo_packages").insert(clean);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      await loadAll(); setModal(null); showToast("Paquete registrado");
    }
    catch (e) { showToast("Error: " + e.message, "error"); }
  };
  const updPackageStatus = async (id, status) => {
    try { await supabase.from("cargo_packages").update({ status }).eq("id", id); await loadAll(); showToast("Estado actualizado"); }
    catch { showToast("Error", "error"); }
  };
  const addManifest = async (data) => {
    try {
      const clean = { name: data.name, shipment_date: data.shipment_date || null, status: data.status || "abierto", document_url: data.document_url || "", document_name: data.document_name || "", notes: data.notes || "" };
      const { error } = await supabase.from("cargo_manifests").insert(clean);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      await loadAll(); setModal(null); showToast("Manifiesto creado");
    }
    catch (e) { showToast("Error: " + e.message, "error"); }
  };
  const delPackage = async (id) => {
    if (!confirm("¿Eliminar paquete?")) return;
    try { await supabase.from("cargo_packages").delete().eq("id", id); await loadAll(); showToast("Eliminado"); } catch {}
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.acc }}>Cargando My Cargo...</div>;

  const filtClients = clients.filter(c => !search || (c.first_name + c.last_name + c.cedula + c.email).toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ animation: "fadeUp .3s ease" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#4A90D9,#2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📦</div>
          <div>
            <h1 style={{ fontFamily: D, fontSize: isMobile ? 20 : 26, fontWeight: 700, color: C.tx, letterSpacing: "-.02em" }}>My Cargo</h1>
            <p style={{ fontSize: 12, color: C.td }}>Courier internacional USA → Ecuador</p>
          </div>
        </div>
        <Btn onClick={() => setModal({ type: "warehouse" })} v="secondary" sz="sm">📍 Dirección bodega</Btn>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, padding: 4, background: C.s2, borderRadius: 12, border: `1px solid ${C.b}60` }}>
        {[{ k: "dashboard", l: "Dashboard" }, { k: "packages", l: "Paquetes" }, { k: "clients", l: "Clientes" }, { k: "manifests", l: "Manifiestos" }].map(t => (
          <button key={t.k} onClick={() => { setTab(t.k); setSelClient(null); }} style={{ flex: 1, padding: "8px 16px", borderRadius: 10, border: "none", background: tab === t.k ? C.acc : "transparent", color: tab === t.k ? "#060B18" : C.tm, fontSize: 12, fontWeight: tab === t.k ? 700 : 500, cursor: "pointer", fontFamily: F, transition: "all .2s" }}>{t.l}</button>
        ))}
      </div>

      {/* DASHBOARD */}
      {tab === "dashboard" && <>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <Stat label="Paquetes totales" value={stats.totalPkgs} icon="📦" color={C.acc} />
          <Stat label="Esta semana" value={stats.weekPkgs} icon="📅" color={C.bl} sub={"$" + stats.weekRevenue.toFixed(2)} />
          <Stat label="Peso total" value={stats.totalWeight.toFixed(1) + " lb"} icon="⚖️" color={C.p} />
          <Stat label="Ingresos totales" value={"$" + stats.totalRevenue.toFixed(0)} icon="💰" color={C.g} />
          <Stat label="Clientes" value={clients.length} icon="👥" color={C.w} />
        </div>
        <Card style={{ marginBottom: 20 }}>
          <h3 style={{ fontFamily: D, fontSize: 14, fontWeight: 600, color: C.tx, marginBottom: 14 }}>Paquetes por estado</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {STATUSES.map(st => (
              <div key={st.value} onClick={() => setTab("packages")} style={{ background: st.color + "10", border: `1px solid ${st.color}25`, borderRadius: 12, padding: "12px 16px", minWidth: 100, cursor: "pointer", transition: "all .2s" }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{st.icon}</div>
                <div style={{ fontFamily: D, fontSize: 22, fontWeight: 800, color: st.color }}>{stats.byStatus[st.value] || 0}</div>
                <div style={{ fontSize: 10, color: C.td }}>{st.label}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 style={{ fontFamily: D, fontSize: 14, fontWeight: 600, color: C.tx, marginBottom: 14 }}>Últimos paquetes de la semana</h3>
          {packages.slice(0, 8).length === 0 ? <p style={{ fontSize: 12, color: C.td }}>Sin paquetes aún</p> :
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{packages.slice(0, 8).map(pkg => {
              const cl = clients.find(c => c.id === pkg.cargo_client_id);
              const st = STATUSES.find(s => s.value === pkg.status) || STATUSES[0];
              return <div key={pkg.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: C.bg, borderRadius: 10, border: `1px solid ${C.b}60`, fontSize: 12 }}>
                <span>{st.icon}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ color: C.tx, fontWeight: 500 }}>{pkg.tracking_number || "Sin tracking"}</span>
                  {cl && <span style={{ color: C.td, marginLeft: 8 }}>{cl.first_name} {cl.last_name}</span>}
                </div>
                <span style={{ color: C.p }}>{pkg.weight} lb</span>
                <span style={{ color: C.g, fontWeight: 600 }}>${calcShipping(pkg).toFixed(2)}</span>
                <Badge label={st.label} color={st.color} />
              </div>;
            })}</div>}
        </Card>
      </>}

      {/* PACKAGES */}
      {tab === "packages" && <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar tracking, cliente..." style={{ flex: 1, minWidth: 200, background: C.bg, border: `1px solid ${C.b}`, borderRadius: 10, padding: "9px 14px", color: C.tx, fontSize: 13, fontFamily: F, outline: "none" }} />
          <Btn onClick={() => setModal({ type: "add_package" })} disabled={clients.length === 0}>+ Nuevo paquete</Btn>
        </div>
        {clients.length === 0 && <Card style={{ textAlign: "center", padding: 32 }}><p style={{ color: C.tm, fontSize: 13 }}>Primero crea un cliente en la pestaña "Clientes"</p></Card>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {packages.filter(pkg => { const cl = clients.find(c => c.id === pkg.cargo_client_id); return !search || (pkg.tracking_number + (cl ? cl.first_name + cl.last_name : "")).toLowerCase().includes(search.toLowerCase()); }).map(pkg => {
            const cl = clients.find(c => c.id === pkg.cargo_client_id);
            const st = STATUSES.find(s => s.value === pkg.status) || STATUSES[0];
            const rt = RATE_TYPES.find(r => r.value === pkg.rate_type) || RATE_TYPES[0];
            return <Card key={pkg.id} style={{ borderLeft: `3px solid ${st.color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.tx, fontFamily: D }}>{pkg.tracking_number || "Sin tracking"}</span>
                    <Badge label={st.label} color={st.color} />
                  </div>
                  <div style={{ fontSize: 11, color: C.tm }}>{cl ? `${cl.first_name} ${cl.last_name} · ${cl.cedula}` : "Sin cliente"}</div>
                  {pkg.description && <div style={{ fontSize: 11, color: C.td, marginTop: 2 }}>{pkg.description}</div>}
                  <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 10, color: C.td, flexWrap: "wrap" }}>
                    <span style={{ color: C.p }}>⚖️ {pkg.weight} lb</span>
                    <span>{rt.label}</span>
                    {pkg.invoice_value > 0 && <span>🧾 ${pkg.invoice_value}</span>}
                    {pkg.arancel > 0 && <span style={{ color: C.w }}>Arancel ${pkg.arancel}</span>}
                    {pkg.estimated_delivery && <span>📅 {pkg.estimated_delivery}</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.g, fontFamily: D }}>${calcShipping(pkg).toFixed(2)}</div>
                  <div style={{ fontSize: 9, color: C.td }}>total a cobrar</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
                <select value={pkg.status} onChange={e => updPackageStatus(pkg.id, e.target.value)} style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 8, padding: "5px 10px", color: C.tx, fontSize: 11, fontFamily: F, outline: "none", cursor: "pointer" }}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.icon} {s.label}</option>)}
                </select>
                {pkg.invoice_url && <a href={pkg.invoice_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: C.bl, textDecoration: "none", padding: "5px 10px", background: C.blBg, borderRadius: 8, border: `1px solid ${C.bl}30` }}>🧾 Ver factura</a>}
                <button onClick={() => delPackage(pkg.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.r, fontSize: 12, marginLeft: "auto" }}>🗑️</button>
              </div>
            </Card>;
          })}
          {packages.length === 0 && clients.length > 0 && <Card style={{ textAlign: "center", padding: 32 }}><p style={{ color: C.td }}>Sin paquetes. Click "+ Nuevo paquete"</p></Card>}
        </div>
      </>}

      {/* CLIENTS */}
      {tab === "clients" && <>
        {!selClient ? <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 8 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..." style={{ flex: 1, background: C.bg, border: `1px solid ${C.b}`, borderRadius: 10, padding: "9px 14px", color: C.tx, fontSize: 13, fontFamily: F, outline: "none" }} />
            <Btn onClick={() => setModal({ type: "add_client" })}>+ Nuevo cliente</Btn>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
            {filtClients.map(cl => {
              const pkgs = clientPkgs(cl.id);
              return <Card key={cl.id} onClick={() => setSelClient(cl.id)} style={{ cursor: "pointer" }}>
                <div style={{ fontFamily: D, fontSize: 15, fontWeight: 600, color: C.tx }}>{cl.first_name} {cl.last_name}</div>
                <div style={{ fontSize: 11, color: C.tm, marginTop: 2 }}>{cl.cedula}</div>
                <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11, color: C.td }}>
                  <span style={{ color: C.acc }}>📦 {pkgs.length} paquetes</span>
                  <span style={{ color: C.g }}>${clientTotal(cl.id).toFixed(2)}</span>
                </div>
              </Card>;
            })}
            {filtClients.length === 0 && <Card style={{ textAlign: "center", padding: 32, gridColumn: "1/-1" }}><p style={{ color: C.td }}>Sin clientes. Click "+ Nuevo cliente"</p></Card>}
          </div>
        </> : (() => {
          const cl = clients.find(c => c.id === selClient);
          if (!cl) return null;
          const pkgs = clientPkgs(cl.id);
          return <>
            <Btn onClick={() => setSelClient(null)} v="ghost" sz="sm" style={{ marginBottom: 12 }}>← Volver</Btn>
            <Card style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <h2 style={{ fontFamily: D, fontSize: 20, fontWeight: 700, color: C.tx }}>{cl.first_name} {cl.last_name}</h2>
                  <div style={{ fontSize: 12, color: C.tm, marginTop: 4, lineHeight: 1.8 }}>
                    <div>🪪 Cédula: {cl.cedula}</div>
                    {cl.phone && <div>📞 {cl.phone}</div>}
                    {cl.email && <div>✉️ {cl.email}</div>}
                    {cl.address && <div>📍 {cl.address}{cl.city ? `, ${cl.city}` : ""}</div>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: D, fontSize: 28, fontWeight: 800, color: C.g }}>${clientTotal(cl.id).toFixed(2)}</div>
                  <div style={{ fontSize: 10, color: C.td }}>total {pkgs.length} paquetes</div>
                </div>
              </div>
            </Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontFamily: D, fontSize: 15, fontWeight: 600, color: C.tx }}>Paquetes ({pkgs.length})</h3>
              <Btn onClick={() => setModal({ type: "add_package", clientId: cl.id })} sz="sm">+ Agregar paquete</Btn>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {pkgs.map(pkg => {
                const st = STATUSES.find(s => s.value === pkg.status) || STATUSES[0];
                return <div key={pkg.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: C.bg, borderRadius: 10, border: `1px solid ${C.b}60`, fontSize: 12 }}>
                  <span>{st.icon}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: C.tx, fontWeight: 500 }}>{pkg.tracking_number}</span>
                    {pkg.description && <span style={{ color: C.td, marginLeft: 8 }}>{pkg.description}</span>}
                  </div>
                  <span style={{ color: C.p }}>{pkg.weight} lb</span>
                  <span style={{ color: C.g, fontWeight: 600 }}>${calcShipping(pkg).toFixed(2)}</span>
                  <Badge label={st.label} color={st.color} />
                </div>;
              })}
              {pkgs.length === 0 && <p style={{ fontSize: 12, color: C.td, textAlign: "center", padding: 20 }}>Sin paquetes para este cliente</p>}
            </div>
          </>;
        })()}
      </>}

      {/* MANIFESTS */}
      {tab === "manifests" && <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: C.tm }}>Documento general de carga por embarque</p>
          <Btn onClick={() => setModal({ type: "add_manifest" })}>+ Nuevo manifiesto</Btn>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {manifests.map(m => {
            const mPkgs = packages.filter(p => p.manifest_id === m.id);
            return <Card key={m.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.tx, fontFamily: D }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: C.td, marginTop: 2 }}>
                    {m.shipment_date && `📅 ${m.shipment_date} · `}{mPkgs.length} paquetes · {mPkgs.reduce((s, p) => s + (parseFloat(p.weight) || 0), 0).toFixed(1)} lb
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Badge label={m.status} color={m.status === "abierto" ? C.w : C.g} />
                  {m.document_url && <a href={m.document_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: C.bl, textDecoration: "none", padding: "5px 10px", background: C.blBg, borderRadius: 8, border: `1px solid ${C.bl}30` }}>📄 Ver documento</a>}
                </div>
              </div>
            </Card>;
          })}
          {manifests.length === 0 && <Card style={{ textAlign: "center", padding: 32 }}><p style={{ color: C.td }}>Sin manifiestos. Click "+ Nuevo manifiesto"</p></Card>}
        </div>
      </>}

      {/* MODALS */}
      {modal?.type === "warehouse" && <WarehouseModal onClose={() => setModal(null)} />}
      {modal?.type === "add_client" && <ClientModal onClose={() => setModal(null)} onSave={addClient} />}
      {modal?.type === "add_package" && <PackageModal clients={clients} manifests={manifests} defaultClient={modal.clientId} onClose={() => setModal(null)} onSave={addPackage} showToast={showToast} />}
      {modal?.type === "add_manifest" && <ManifestModal onClose={() => setModal(null)} onSave={addManifest} showToast={showToast} />}
    </div>
  );
}

function Stat({ label, value, icon, color, sub }) {
  return <div style={{ background: `${C.s}e8`, borderRadius: 14, border: `1px solid ${C.b}80`, padding: "18px 20px", flex: "1 1 130px", minWidth: 120 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><span style={{ fontSize: 11, fontWeight: 600, color: C.tm }}>{label}</span><span style={{ fontSize: 18 }}>{icon}</span></div>
    <div style={{ fontFamily: D, fontSize: 26, fontWeight: 800, color: color || C.tx, letterSpacing: "-.02em" }}>{value}</div>
    {sub && <div style={{ fontSize: 10, color: C.td, marginTop: 4 }}>{sub}</div>}
  </div>;
}

function ModalWrap({ title, onClose, children, w = 480 }) {
  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(16px)" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div style={{ background: `linear-gradient(160deg,${C.s}f5,${C.bg}f0)`, borderRadius: 20, border: `1px solid ${C.b}`, width: "92%", maxWidth: w, maxHeight: "88vh", overflow: "auto", animation: "modalIn .25s", boxShadow: "0 24px 80px rgba(0,0,0,.5)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: `1px solid ${C.b}60`, position: "sticky", top: 0, background: `${C.s}f5`, zIndex: 1 }}>
        <h3 style={{ fontFamily: D, fontSize: 17, fontWeight: 600, color: C.tx }}>{title}</h3>
        <button onClick={onClose} style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 10, width: 30, height: 30, color: C.tm, cursor: "pointer", fontSize: 13 }}>✕</button>
      </div>
      <div style={{ padding: 22 }}>{children}</div>
    </div>
  </div>;
}

function WarehouseModal({ onClose }) {
  const [name, setName] = useState("");
  const text = `MYCARGO / ${name || "[Nombre y apellido del cliente]"}
📍 6315 NW 99TH AVENUE
DORAL, FL 33178
📞 +1 (786) 317-6760

Especificaciones:
• Entregar de Lun-Vie de 9am a 5pm
• Send proof of delivery
• No enviar en feriados`;
  return <ModalWrap title="📍 Dirección de bodega Miami" onClose={onClose} w={520}>
    <Inp label="Nombre del cliente (para personalizar)" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Juan Pérez" />
    <div style={{ background: C.bg, borderRadius: 12, padding: 16, border: `1px solid ${C.b}`, marginTop: 14, whiteSpace: "pre-wrap", fontSize: 13, color: C.tx, lineHeight: 1.7, fontFamily: F }}>{text}</div>
    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
      <Btn onClick={() => { navigator.clipboard.writeText(text); }} style={{ flex: 1, justifyContent: "center" }}>📋 Copiar dirección</Btn>
    </div>
  </ModalWrap>;
}

function ClientModal({ onClose, onSave }) {
  const [f, setF] = useState({ first_name: "", last_name: "", cedula: "", phone: "", email: "", address: "", city: "" });
  return <ModalWrap title="Nuevo cliente My Cargo" onClose={onClose}>
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Inp label="Nombres *" value={f.first_name} onChange={e => setF({ ...f, first_name: e.target.value })} />
        <Inp label="Apellidos" value={f.last_name} onChange={e => setF({ ...f, last_name: e.target.value })} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Inp label="Cédula" value={f.cedula} onChange={e => setF({ ...f, cedula: e.target.value })} />
        <Inp label="Teléfono" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
      </div>
      <Inp label="Email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
        <Inp label="Dirección de domicilio" value={f.address} onChange={e => setF({ ...f, address: e.target.value })} />
        <Inp label="Ciudad" value={f.city} onChange={e => setF({ ...f, city: e.target.value })} />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn onClick={onClose} v="ghost">Cancelar</Btn>
        <Btn onClick={() => { if (!f.first_name) return; onSave(f); }} disabled={!f.first_name}>Crear cliente</Btn>
      </div>
    </div>
  </ModalWrap>;
}

function PackageModal({ clients, manifests, defaultClient, onClose, onSave, showToast }) {
  const [f, setF] = useState({ cargo_client_id: defaultClient || "", manifest_id: "", tracking_number: "", description: "", weight: "", invoice_value: "", invoice_url: "", invoice_name: "", rate_type: "libra", boxes_full: 0, boxes_half: 0, arancel: 0, status: "bodega", estimated_delivery: "" });
  const [uploading, setUploading] = useState(false);
  const preview = calcShipping(f);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `cargo/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("wauya-files").upload(path, file);
      if (error) { showToast(error.message, "error"); setUploading(false); return; }
      const { data } = supabase.storage.from("wauya-files").getPublicUrl(path);
      setF(prev => ({ ...prev, invoice_url: data?.publicUrl || "", invoice_name: file.name }));
      showToast("Factura subida");
    } catch (e) { showToast("Error subiendo", "error"); }
    setUploading(false);
  };

  return <ModalWrap title="Nuevo paquete" onClose={onClose} w={560}>
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Sel label="Cliente *" value={f.cargo_client_id} onChange={e => setF({ ...f, cargo_client_id: e.target.value })} options={[{ value: "", label: "— Selecciona —" }, ...clients.map(c => ({ value: c.id, label: `${c.first_name} ${c.last_name}` }))]} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Inp label="Tracking number" value={f.tracking_number} onChange={e => setF({ ...f, tracking_number: e.target.value })} />
        <Inp label="Fecha estimada entrega" type="date" value={f.estimated_delivery} onChange={e => setF({ ...f, estimated_delivery: e.target.value })} />
      </div>
      <Inp label="Descripción del contenido" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder="Ej: Zapatos Nike, 2 pares" />
      <Inp label="Valor de la factura ($)" type="number" value={f.invoice_value} onChange={e => setF({ ...f, invoice_value: e.target.value })} />
      {/* Invoice upload */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: C.tm, fontFamily: F }}>Factura (archivo)</label>
        <div style={{ marginTop: 6 }}>
          {f.invoice_url ? <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: C.g + "10", borderRadius: 10, border: `1px solid ${C.g}30` }}><span style={{ fontSize: 12, color: C.g }}>✓ {f.invoice_name}</span><button onClick={() => setF({ ...f, invoice_url: "", invoice_name: "" })} style={{ background: "none", border: "none", color: C.r, cursor: "pointer", marginLeft: "auto" }}>✕</button></div>
            : <label style={{ display: "block", padding: "10px 14px", background: C.bg, border: `1px dashed ${C.b}`, borderRadius: 10, cursor: "pointer", fontSize: 12, color: C.tm, textAlign: "center" }}>{uploading ? "Subiendo..." : "📎 Subir factura (PDF/imagen)"}<input type="file" accept="image/*,.pdf" onChange={e => handleUpload(e.target.files[0])} style={{ display: "none" }} /></label>}
        </div>
      </div>
      {/* Rate type selector */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: C.tm, fontFamily: F, display: "block", marginBottom: 6 }}>Tipo de tarifa</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {RATE_TYPES.map(rt => (
            <button key={rt.value} onClick={() => setF({ ...f, rate_type: rt.value })} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: `1px solid ${f.rate_type === rt.value ? C.acc : C.b}`, background: f.rate_type === rt.value ? C.acc + "12" : "transparent", cursor: "pointer", textAlign: "left" }}>
              <div style={{ width: 16, height: 16, borderRadius: 8, border: `2px solid ${f.rate_type === rt.value ? C.acc : C.b}`, background: f.rate_type === rt.value ? C.acc : "transparent", flexShrink: 0 }} />
              <div><div style={{ fontSize: 13, fontWeight: 600, color: f.rate_type === rt.value ? C.acc : C.tx }}>{rt.label}</div><div style={{ fontSize: 10, color: C.td }}>{rt.desc}</div></div>
            </button>
          ))}
        </div>
      </div>
      {/* Conditional inputs by rate type */}
      {f.rate_type === "libra" && <Inp label="Peso (libras)" type="number" step="0.1" value={f.weight} onChange={e => setF({ ...f, weight: e.target.value })} placeholder="Ej: 2.5" />}
      {f.rate_type === "categoria_c" && <Inp label="Peso (libras)" type="number" step="0.1" value={f.weight} onChange={e => setF({ ...f, weight: e.target.value })} placeholder="Ej: 10" />}
      {f.rate_type === "cuatroxcuatro" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <Inp label="4x4 completos ($75)" type="number" value={f.boxes_full} onChange={e => setF({ ...f, boxes_full: e.target.value })} />
        <Inp label="Medios 4x4 ($38)" type="number" value={f.boxes_half} onChange={e => setF({ ...f, boxes_half: e.target.value })} />
        <Inp label="Peso ref (lb)" type="number" step="0.1" value={f.weight} onChange={e => setF({ ...f, weight: e.target.value })} />
      </div>}
      <Inp label="Aranceles Ecuador ($)" type="number" value={f.arancel} onChange={e => setF({ ...f, arancel: e.target.value })} placeholder="Ingresa manualmente" />
      {manifests.length > 0 && <Sel label="Manifiesto (opcional)" value={f.manifest_id} onChange={e => setF({ ...f, manifest_id: e.target.value })} options={[{ value: "", label: "— Ninguno —" }, ...manifests.map(m => ({ value: m.id, label: m.name }))]} />}
      {/* PRICE PREVIEW */}
      <div style={{ background: `linear-gradient(135deg,${C.g}12,${C.g}05)`, border: `1px solid ${C.g}30`, borderRadius: 12, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, color: C.tm }}>Total a cobrar</div>
          <div style={{ fontSize: 9, color: C.td }}>
            {f.rate_type === "libra" && `$${RATE_PER_LB}/lb (mín $${MIN_CHARGE})`}
            {f.rate_type === "cuatroxcuatro" && `${f.boxes_full || 0}×$75 + ${f.boxes_half || 0}×$38`}
            {f.rate_type === "categoria_c" && `$6/lb + $50 + $10 + bodegaje`}
            {parseFloat(f.arancel) > 0 && ` + $${f.arancel} arancel`}
          </div>
        </div>
        <div style={{ fontFamily: D, fontSize: 30, fontWeight: 800, color: C.g }}>${preview.toFixed(2)}</div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn onClick={onClose} v="ghost">Cancelar</Btn>
        <Btn onClick={() => { if (!f.cargo_client_id) { showToast("Selecciona un cliente", "error"); return; } onSave(f); }} disabled={!f.cargo_client_id}>Registrar paquete</Btn>
      </div>
    </div>
  </ModalWrap>;
}

function ManifestModal({ onClose, onSave, showToast }) {
  const [f, setF] = useState({ name: "", shipment_date: "", status: "abierto", document_url: "", document_name: "", notes: "" });
  const [uploading, setUploading] = useState(false);
  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `manifests/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("wauya-files").upload(path, file);
      if (error) { showToast(error.message, "error"); setUploading(false); return; }
      const { data } = supabase.storage.from("wauya-files").getPublicUrl(path);
      setF(prev => ({ ...prev, document_url: data?.publicUrl || "", document_name: file.name }));
      showToast("Documento subido");
    } catch { showToast("Error", "error"); }
    setUploading(false);
  };
  return <ModalWrap title="Nuevo manifiesto" onClose={onClose}>
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Inp label="Nombre del embarque *" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Ej: Embarque #12 - Junio" />
      <Inp label="Fecha de embarque" type="date" value={f.shipment_date} onChange={e => setF({ ...f, shipment_date: e.target.value })} />
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: C.tm, fontFamily: F }}>Documento del manifiesto</label>
        <div style={{ marginTop: 6 }}>
          {f.document_url ? <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: C.g + "10", borderRadius: 10, border: `1px solid ${C.g}30` }}><span style={{ fontSize: 12, color: C.g }}>✓ {f.document_name}</span></div>
            : <label style={{ display: "block", padding: "10px 14px", background: C.bg, border: `1px dashed ${C.b}`, borderRadius: 10, cursor: "pointer", fontSize: 12, color: C.tm, textAlign: "center" }}>{uploading ? "Subiendo..." : "📄 Subir manifiesto (PDF/Excel)"}<input type="file" onChange={e => handleUpload(e.target.files[0])} style={{ display: "none" }} /></label>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn onClick={onClose} v="ghost">Cancelar</Btn>
        <Btn onClick={() => { if (!f.name) return; onSave(f); }} disabled={!f.name}>Crear manifiesto</Btn>
      </div>
    </div>
  </ModalWrap>;
}
