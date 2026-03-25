import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "./supabase.js";
import DriveFiles from "./DriveFiles.jsx";

const MASTER = { email: "admin@wauya.com", password: "wauya2024", role: "master", name: "Admin Wauya" };
const STATUS_OPTS = [
  { value: "briefing", label: "Briefing", color: "#6B7280", icon: "📋" },
  { value: "en_progreso", label: "En Progreso", color: "#F59E0B", icon: "⚡" },
  { value: "revision", label: "En Revisión", color: "#8B5CF6", icon: "🔍" },
  { value: "aprobado", label: "Aprobado", color: "#10B981", icon: "✅" },
  { value: "entregado", label: "Entregado", color: "#3B82F6", icon: "📦" },
];
const DEL_TYPES = [
  { value: "imagen", label: "Imagen", icon: "🖼️" },
  { value: "video", label: "Video", icon: "🎬" },
  { value: "manual_marca", label: "Manual de Marca", icon: "📖" },
  { value: "presentacion", label: "Presentación", icon: "📊" },
  { value: "documento", label: "Documento", icon: "📄" },
  { value: "otro", label: "Otro", icon: "📎" },
];
const PROSP_TYPES = [
  { value: "propuesta_visual", label: "Propuesta Visual", icon: "🎨" },
  { value: "propuesta_economica", label: "Propuesta Económica", icon: "💰" },
  { value: "pagina_web", label: "Página Web", icon: "🌐" },
  { value: "otro", label: "Otro", icon: "📎" },
];
const PRIOS = [
  { value: "baja", label: "Baja", color: "#6B7280" },
  { value: "media", label: "Media", color: "#F59E0B" },
  { value: "alta", label: "Alta", color: "#EF4444" },
  { value: "urgente", label: "Urgente", color: "#DC2626" },
];
const TSTAT = [
  { value: "pendiente", label: "Pendiente", color: "#6B7280" },
  { value: "en_progreso", label: "En Progreso", color: "#F59E0B" },
  { value: "completado", label: "Completado", color: "#10B981" },
];
const todayStr = () => new Date().toISOString().split("T")[0];

// Theme
const F = "'DM Sans', sans-serif", D = "'Sora', sans-serif";
const C = { bg:"#08080A",s:"#111115",s2:"#18181E",b:"#222230",tx:"#F0F0F4",tm:"#9898A8",td:"#5A5A6E",acc:"#CDFF50",accD:"#A8D93A",r:"#FF4D6A",rBg:"#1A0810",g:"#34D399",w:"#FBBF24",p:"#A78BFA",pBg:"#120E1A",bl:"#60A5FA",blBg:"#0A1220" };
const CSS = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@400;500;600;700;800&display=swap');
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes modalIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
*{box-sizing:border-box;margin:0;padding:0}body{font-family:${F};background:${C.bg};color:${C.tx}}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.b};border-radius:3px}
select option{background:${C.s};color:${C.tx}}`;

// ─── ICONS ───
function Ic({n,sz=18}){const d={dash:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,prosp:<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,cli:<><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></>,usr:<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,emp:<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></>,cal:<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,out:<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>,plus:<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,file:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></>,dl:<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></>,tr:<><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,back:<><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/></>,srch:<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,lock:<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,check:<><polyline points="20,6 9,17 4,12"/></>,todo:<><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,edit:<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>};return<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{d[n]}</svg>}

// ─── UI ATOMS ───
function Btn({children,onClick,v="primary",sz="md",icon,disabled,style:sx}){const b={display:"inline-flex",alignItems:"center",gap:6,border:"none",cursor:disabled?"not-allowed":"pointer",fontFamily:F,fontWeight:600,borderRadius:8,transition:"all .15s",opacity:disabled?.4:1,whiteSpace:"nowrap",fontSize:sz==="sm"?11:sz==="lg"?14:12,padding:sz==="sm"?"5px 10px":sz==="lg"?"12px 24px":"7px 14px"};const vs={primary:{background:C.acc,color:"#0A0A0B"},secondary:{background:C.s2,color:C.tx,border:`1px solid ${C.b}`},danger:{background:C.rBg,color:C.r,border:"1px solid #3D1525"},ghost:{background:"transparent",color:C.tm}};return<button onClick={onClick} disabled={disabled} style={{...b,...vs[v],...sx}}>{icon&&<Ic n={icon} sz={sz==="sm"?13:15}/>}{children}</button>}
function Inp({label,...p}){return<div style={{display:"flex",flexDirection:"column",gap:5}}>{label&&<label style={{fontSize:11,fontWeight:600,color:C.tm,fontFamily:F,textTransform:"uppercase",letterSpacing:".06em"}}>{label}</label>}<input {...p} style={{background:C.bg,border:`1px solid ${C.b}`,borderRadius:8,padding:"9px 12px",color:C.tx,fontSize:13,fontFamily:F,outline:"none",width:"100%",...p.style}} onFocus={e=>e.target.style.borderColor=C.acc} onBlur={e=>e.target.style.borderColor=C.b}/></div>}
function Sel({label,options,...p}){return<div style={{display:"flex",flexDirection:"column",gap:5}}>{label&&<label style={{fontSize:11,fontWeight:600,color:C.tm,fontFamily:F,textTransform:"uppercase",letterSpacing:".06em"}}>{label}</label>}<select {...p} style={{background:C.bg,border:`1px solid ${C.b}`,borderRadius:8,padding:"9px 12px",color:C.tx,fontSize:13,fontFamily:F,outline:"none",cursor:"pointer",...p.style}}>{options.map(o=><option key={o.value} value={o.value}>{o.label||o.value}</option>)}</select></div>}
function Txt({label,...p}){return<div style={{display:"flex",flexDirection:"column",gap:5}}>{label&&<label style={{fontSize:11,fontWeight:600,color:C.tm,fontFamily:F,textTransform:"uppercase",letterSpacing:".06em"}}>{label}</label>}<textarea {...p} style={{background:C.bg,border:`1px solid ${C.b}`,borderRadius:8,padding:"9px 12px",color:C.tx,fontSize:13,fontFamily:F,outline:"none",resize:"vertical",minHeight:70,width:"100%",...p.style}} onFocus={e=>e.target.style.borderColor=C.acc} onBlur={e=>e.target.style.borderColor=C.b}/></div>}
function Mod({title,onClose,children,w=520}){return<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(8px)"}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}><div style={{background:C.s,borderRadius:16,border:`1px solid ${C.b}`,width:"92%",maxWidth:w,maxHeight:"88vh",overflow:"auto",animation:"modalIn .2s ease"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:`1px solid ${C.b}`,position:"sticky",top:0,background:C.s,zIndex:1}}><h3 style={{fontFamily:D,fontSize:16,fontWeight:600,color:C.tx}}>{title}</h3><button onClick={onClose} style={{background:"none",border:"none",color:C.tm,cursor:"pointer",fontSize:18}}>✕</button></div><div style={{padding:20}}>{children}</div></div></div>}
function Badge({label,color}){return<span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:20,fontSize:10,fontWeight:700,background:color+"18",color,fontFamily:F}}>{label}</span>}
function SBadge({status}){const s=STATUS_OPTS.find(o=>o.value===status)||STATUS_OPTS[0];return<Badge label={`${s.icon} ${s.label}`} color={s.color}/>}
function Empty({icon,title,sub}){return<div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"48px 20px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:12,opacity:.4}}>{icon}</div><div style={{fontFamily:D,fontSize:15,fontWeight:600,color:C.tm,marginBottom:4}}>{title}</div><div style={{fontSize:12,color:C.td,maxWidth:280}}>{sub}</div></div>}
function Stat({label,value,icon,color}){return<div style={{background:C.s,borderRadius:14,border:`1px solid ${C.b}`,padding:"18px 20px",flex:"1 1 160px",minWidth:150}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:10,fontWeight:700,color:C.tm,textTransform:"uppercase",letterSpacing:".08em"}}>{label}</span><span style={{fontSize:18}}>{icon}</span></div><div style={{fontFamily:D,fontSize:28,fontWeight:800,color:color||C.tx}}>{value}</div></div>}
function Card({children,style:sx,onClick,hover}){const r=useRef(null);return<div ref={r} onClick={onClick} style={{background:C.s,borderRadius:14,border:`1px solid ${C.b}`,padding:18,cursor:onClick?"pointer":"default",transition:"all .15s",...sx}} onMouseEnter={()=>{if(hover&&r.current){r.current.style.borderColor=C.acc+"40";r.current.style.transform="translateY(-2px)"}}} onMouseLeave={()=>{if(hover&&r.current){r.current.style.borderColor=C.b;r.current.style.transform=""}}}>{children}</div>}

// ─── FILE CARD ───
function FileCard({file,onDelete,showDel=true}){
  const info=[...DEL_TYPES,...PROSP_TYPES].find(x=>x.value===file.file_type)||{icon:"📎",label:"Archivo"};
  const handleDL=async()=>{
    if(file.url){window.open(file.url,"_blank");return}
    if(file.storage_path){
      const{data}=supabase.storage.from("wauya-files").getPublicUrl(file.storage_path);
      if(data?.publicUrl)window.open(data.publicUrl,"_blank");
    }
  };
  return<div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:C.bg,borderRadius:10,border:`1px solid ${C.b}`}}>
    <span style={{fontSize:20,flexShrink:0}}>{info.icon}</span>
    <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:C.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.name}</div><div style={{fontSize:10,color:C.td}}>{info.label} · {file.size||"—"}</div></div>
    <div style={{display:"flex",gap:4,flexShrink:0}}>
      <button onClick={handleDL} title="Descargar" style={{background:C.blBg,border:`1px solid ${C.bl}30`,cursor:"pointer",color:C.bl,padding:"5px 10px",borderRadius:6,display:"flex",alignItems:"center",gap:4,fontSize:10,fontFamily:F,fontWeight:600}}><Ic n="dl" sz={13}/> Descargar</button>
      {showDel&&onDelete&&<button onClick={()=>onDelete(file.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.r,padding:4}}><Ic n="tr" sz={14}/></button>}
    </div>
  </div>;
}

// ─── CHARTS ───
function MiniBar({data,height=130}){const max=Math.max(...data.map(d=>d.value),1);return<div style={{display:"flex",alignItems:"flex-end",gap:8,height,padding:"0 4px"}}>{data.map((d,i)=><div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><span style={{fontSize:11,fontWeight:700,color:C.tx}}>{d.value}</span><div style={{width:"100%",maxWidth:44,height:`${(d.value/max)*(height-40)}px`,minHeight:4,background:`linear-gradient(180deg,${d.color},${d.color}88)`,borderRadius:"5px 5px 2px 2px",transition:"height .4s"}}/><span style={{fontSize:9,color:C.td,textAlign:"center",lineHeight:1.2}}>{d.label}</span></div>)}</div>}
function Donut({data,size=110}){const total=data.reduce((a,d)=>a+d.value,0)||1;let cum=0;const r=size/2-10,cx=size/2,cy=size/2;return<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{data.filter(d=>d.value>0).map((d,i)=>{const s0=cum/total*360;cum+=d.value;const e0=cum/total*360;const g=2,s=(s0+g/2)*Math.PI/180,e=(e0-g/2)*Math.PI/180;if(e0-s0<1)return null;const la=e0-s0>180?1:0;const path=`M ${cx+r*Math.cos(s)} ${cy+r*Math.sin(s)} A ${r} ${r} 0 ${la} 1 ${cx+r*Math.cos(e)} ${cy+r*Math.sin(e)}`;return<path key={i} d={path} fill="none" stroke={d.color} strokeWidth={12} strokeLinecap="round"/>})}<text x={cx} y={cy-3} textAnchor="middle" fill={C.tx} fontFamily={D} fontWeight="800" fontSize="18">{total}</text><text x={cx} y={cy+11} textAnchor="middle" fill={C.td} fontFamily={F} fontSize="8">TOTAL</text></svg>}

// ─── TIMELINE ───
function Timeline({tasks,employees}){
  const dated=tasks.filter(t=>t.start_date);if(!dated.length)return<Empty icon="📅" title="Sin fechas" sub="Asigna fechas"/>;
  const sorted=[...dated].sort((a,b)=>a.start_date.localeCompare(b.start_date));
  const allD=sorted.flatMap(t=>[t.start_date,t.end_date].filter(Boolean));
  const minD=new Date(Math.min(...allD.map(d=>new Date(d)))),maxD=new Date(Math.max(...allD.map(d=>new Date(d))));
  const diff=Math.max(Math.ceil((maxD-minD)/864e5),1),dW=Math.max(30,700/diff);
  const getP=d=>((new Date(d)-minD)/864e5)*dW;
  const days=[];for(let d=new Date(minD);d<=maxD;d.setDate(d.getDate()+1))days.push(new Date(d));
  return<div style={{overflowX:"auto",borderRadius:10,border:`1px solid ${C.b}`}}><div style={{minWidth:days.length*dW+200}}>
    <div style={{display:"flex",borderBottom:`1px solid ${C.b}`,position:"sticky",top:0,background:C.s,zIndex:2}}>
      <div style={{width:200,flexShrink:0,padding:"7px 12px",fontSize:10,fontWeight:700,color:C.tm,textTransform:"uppercase",borderRight:`1px solid ${C.b}`}}>Tarea</div>
      <div style={{display:"flex",flex:1}}>{days.map((d,i)=>{const isT=d.toDateString()===new Date().toDateString();return<div key={i} style={{width:dW,flexShrink:0,padding:"5px 2px",textAlign:"center",fontSize:9,fontWeight:isT?700:400,color:isT?C.acc:C.td,borderRight:`1px solid ${C.b}10`,background:isT?C.acc+"08":"transparent"}}><div>{d.toLocaleDateString("es",{weekday:"short"}).slice(0,2)}</div><div style={{fontSize:10,fontWeight:700}}>{d.getDate()}</div></div>})}</div>
    </div>
    {sorted.map((task,i)=>{const emp=employees.find(e=>e.id===task.assigned_to);const st=TSTAT.find(s=>s.value===task.status);const start=getP(task.start_date);const width=task.end_date?Math.max(getP(task.end_date)-start+dW,dW):dW;return<div key={task.id||i} style={{display:"flex",borderBottom:`1px solid ${C.b}10`,minHeight:40,alignItems:"center"}}><div style={{width:200,flexShrink:0,padding:"5px 12px",borderRight:`1px solid ${C.b}`}}><div style={{fontSize:11,fontWeight:600,color:C.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.title}</div><div style={{fontSize:9,color:C.td}}>{emp?.name||"Sin asignar"}</div></div><div style={{flex:1,position:"relative",height:40,display:"flex",alignItems:"center"}}><div style={{position:"absolute",left:start,width,height:20,borderRadius:5,background:`linear-gradient(90deg,${st?.color||C.bl}50,${st?.color||C.bl}25)`,border:`1px solid ${st?.color||C.bl}35`,display:"flex",alignItems:"center",padding:"0 6px"}}><span style={{fontSize:9,fontWeight:600,color:st?.color||C.bl,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.title}</span></div></div></div>})}
  </div></div>;
}

// ═══ MAIN APP ═══
export default function App(){
  const[loading,setLoading]=useState(true);
  const[user,setUser]=useState(null);
  const[view,setView]=useState("dashboard");
  const[prospects,setProspects]=useState([]);
  const[clients,setClients]=useState([]);
  const[employees,setEmployees]=useState([]);
  const[clientUsers,setCU]=useState([]);
  const[todos,setTodos]=useState([]);
  const[files,setFiles]=useState([]);
  const[selId,setSelId]=useState(null);
  const[modal,setModal]=useState(null);
  const[search,setSearch]=useState("");
  const[loginForm,setLF]=useState({email:"",password:""});
  const[loginErr,setLE]=useState("");
  const[saving,setSaving]=useState(false);

  // ─── LOAD ALL DATA ───
  const loadAll=useCallback(async()=>{
    const[p,cl,em,cu,td,fl]=await Promise.all([
      supabase.from("prospects").select("*").order("created_at",{ascending:false}),
      supabase.from("clients").select("*").order("created_at",{ascending:false}),
      supabase.from("employees").select("*").order("created_at",{ascending:false}),
      supabase.from("client_users").select("*"),
      supabase.from("todos").select("*").order("created_at",{ascending:false}),
      supabase.from("files").select("*").order("created_at",{ascending:false}),
    ]);
    if(p.data)setProspects(p.data);
    if(cl.data)setClients(cl.data);
    if(em.data)setEmployees(em.data);
    if(cu.data)setCU(cu.data);
    if(td.data)setTodos(td.data);
    if(fl.data)setFiles(fl.data);
  },[]);

  useEffect(()=>{
    const sess=localStorage.getItem("wauya_user");
    if(sess)try{setUser(JSON.parse(sess))}catch{}
    loadAll().finally(()=>setLoading(false));
  },[loadAll]);

  // ─── AUTH ───
  const login=async()=>{
    setLE("");
    if(loginForm.email===MASTER.email&&loginForm.password===MASTER.password){
      const u={...MASTER};delete u.password;setUser(u);localStorage.setItem("wauya_user",JSON.stringify(u));setView("dashboard");return;
    }
    const{data:cu}=await supabase.from("client_users").select("*").eq("email",loginForm.email).eq("password",loginForm.password).single();
    if(cu){const u={...cu,role:"client"};setUser(u);localStorage.setItem("wauya_user",JSON.stringify(u));setView("client_portal");return}
    const{data:emp}=await supabase.from("employees").select("*").eq("email",loginForm.email).eq("password",loginForm.password).single();
    if(emp){const u={...emp,role:"employee"};setUser(u);localStorage.setItem("wauya_user",JSON.stringify(u));setView("emp_portal");return}
    setLE("Credenciales incorrectas");
  };
  const logout=()=>{setUser(null);setView("dashboard");setSelId(null);localStorage.removeItem("wauya_user")};

  // ─── CRUD HELPERS ───
  const dbAdd=async(table,row)=>{setSaving(true);const{data,error}=await supabase.from(table).insert(row).select().single();setSaving(false);if(error){alert("Error: "+error.message);return null}await loadAll();return data};
  const dbUpd=async(table,id,upd)=>{setSaving(true);await supabase.from(table).update(upd).eq("id",id);setSaving(false);await loadAll()};
  const dbDel=async(table,id)=>{setSaving(true);await supabase.from(table).delete().eq("id",id);setSaving(false);await loadAll()};

  // ─── FILE UPLOAD TO SUPABASE STORAGE ───
  const uploadFile=async(file,ownerType,ownerId,fileType)=>{
    setSaving(true);
    const ext=file.name.split(".").pop();
    const path=`${ownerType}/${ownerId}/${Date.now()}.${ext}`;
    const{error:upErr}=await supabase.storage.from("wauya-files").upload(path,file);
    if(upErr){setSaving(false);alert("Error subiendo: "+upErr.message);return}
    const{data:urlData}=supabase.storage.from("wauya-files").getPublicUrl(path);
    await supabase.from("files").insert({owner_type:ownerType,owner_id:ownerId,name:file.name,file_type:fileType,size:(file.size/1024).toFixed(1)+" KB",storage_path:path,url:urlData?.publicUrl||""});
    setSaving(false);await loadAll();setModal(null);
  };

  const deleteFile=async(fileId)=>{
    const f=files.find(x=>x.id===fileId);
    if(f?.storage_path)await supabase.storage.from("wauya-files").remove([f.storage_path]);
    await dbDel("files",fileId);
  };

  // ─── SPECIFIC ACTIONS ───
  const addProspect=async(p)=>{await dbAdd("prospects",p);setModal(null)};
  const updProspect=async(id,u)=>dbUpd("prospects",id,u);
  const delProspect=async(id)=>{if(!confirm("¿Eliminar?"))return;await dbDel("prospects",id);if(selId===id)setSelId(null)};
  const convertProspect=async(id)=>{
    const p=prospects.find(x=>x.id===id);if(!p)return;
    await dbAdd("clients",{name:p.name,company:p.company,email:p.email,phone:p.phone,services:p.services,notes:p.notes,status:"briefing"});
    await dbDel("prospects",id);setSelId(null);setView("clients");
  };
  const addClient=async(cl)=>{await dbAdd("clients",cl);setModal(null)};
  const updClient=async(id,u)=>dbUpd("clients",id,u);
  const delClient=async(id)=>{if(!confirm("¿Eliminar?"))return;await dbDel("clients",id);if(selId===id)setSelId(null)};
  const addCU=async(cid,u)=>{await dbAdd("client_users",{client_id:cid,...u});setModal(null)};
  const delCU=async(uid)=>{if(!confirm("¿Eliminar?"))return;await dbDel("client_users",uid)};
  const addEmp=async(e)=>{await dbAdd("employees",e);setModal(null)};
  const delEmp=async(id)=>{if(!confirm("¿Eliminar?"))return;await dbDel("employees",id)};
  const addTodo=async(td)=>{await dbAdd("todos",td);setModal(null)};
  const updTodo=async(id,u)=>dbUpd("todos",id,u);
  const delTodo=async(id)=>{if(!confirm("¿Eliminar?"))return;await dbDel("todos",id)};

  const prospFiles=(pid)=>files.filter(f=>f.owner_type==="prospect"&&f.owner_id===pid);
  const clientFiles=(cid)=>files.filter(f=>f.owner_type==="client"&&f.owner_id===cid);

  const stats=useMemo(()=>{
    const tt=todos.length,ct=todos.filter(x=>x.status==="completado").length,pt=todos.filter(x=>x.status==="pendiente").length,ip=todos.filter(x=>x.status==="en_progreso").length;
    const sc=STATUS_OPTS.map(s=>({...s,count:clients.filter(x=>x.status===s.value).length}));
    const el=employees.map(e=>({...e,tc:todos.filter(td=>td.assigned_to===e.id&&td.status!=="completado").length}));
    return{tt,ct,pt,ip,sc,el};
  },[todos,clients,employees]);

  // ─── LOGIN SCREEN ───
  if(!user&&!loading)return<div style={{fontFamily:F,background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><style>{CSS}</style>
    <div style={{animation:"fadeUp .5s ease",textAlign:"center",width:"90%",maxWidth:380}}>
      <div style={{marginBottom:36}}><div style={{fontFamily:D,fontSize:44,fontWeight:800,color:C.tx}}>W<span style={{color:C.acc}}>.</span></div><div style={{fontFamily:D,fontSize:12,fontWeight:500,color:C.tm,letterSpacing:".15em",textTransform:"uppercase"}}>Wauya Platform</div></div>
      <div style={{background:C.s,borderRadius:18,border:`1px solid ${C.b}`,padding:28,textAlign:"left"}}>
        <h2 style={{fontFamily:D,fontSize:18,fontWeight:700,color:C.tx,marginBottom:22}}>Iniciar Sesión</h2>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Inp label="Email" type="email" value={loginForm.email} onChange={e=>setLF({...loginForm,email:e.target.value})} placeholder="tu@email.com" onKeyDown={e=>e.key==="Enter"&&login()}/>
          <Inp label="Contraseña" type="password" value={loginForm.password} onChange={e=>setLF({...loginForm,password:e.target.value})} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&login()}/>
          {loginErr&&<div style={{color:C.r,fontSize:12}}>{loginErr}</div>}
          <Btn onClick={login} sz="lg" style={{width:"100%",justifyContent:"center",marginTop:6}}>Ingresar</Btn>
        </div>
      </div>
    </div>
  </div>;

  if(loading)return<div style={{fontFamily:F,background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><style>{CSS}</style><div style={{fontFamily:D,fontSize:28,color:C.acc,animation:"pulse 1.2s infinite"}}>W.</div></div>;

  // ─── EMPLOYEE PORTAL ───
  if(user?.role==="employee"){
    const myTodos=todos.filter(td=>td.assigned_to===user.id);
    const grouped={};myTodos.forEach(td=>{const cl=clients.find(x=>x.id===td.client_id);const k=cl?.id||"x";if(!grouped[k])grouped[k]={client:cl,todos:[]};grouped[k].todos.push(td)});
    return<div style={{fontFamily:F,background:C.bg,minHeight:"100vh"}}><style>{CSS}</style>
      <div style={{borderBottom:`1px solid ${C.b}`,padding:"14px 28px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:14}}><span style={{fontFamily:D,fontSize:22,fontWeight:800,color:C.tx}}>W<span style={{color:C.acc}}>.</span></span><span style={{color:C.td}}>|</span><span style={{fontSize:13,color:C.tm}}>Portal Empleado</span></div><div style={{display:"flex",alignItems:"center",gap:14}}><span style={{fontSize:12,color:C.tm}}>{user.name}</span><Btn onClick={logout} v="ghost" icon="out" sz="sm">Salir</Btn></div></div>
      <div style={{maxWidth:900,margin:"0 auto",padding:"32px 20px",animation:"fadeUp .4s ease"}}>
        <h1 style={{fontFamily:D,fontSize:24,fontWeight:700,color:C.tx,marginBottom:6}}>Hola, {user.name} 👋</h1>
        <p style={{fontSize:13,color:C.tm,marginBottom:28}}>{myTodos.filter(td=>td.status!=="completado").length} tareas pendientes</p>
        {Object.keys(grouped).length===0?<Empty icon="✅" title="Sin tareas" sub="No tienes tareas asignadas"/>:
          Object.entries(grouped).map(([k,{client:cl,todos:tds}])=><Card key={k} style={{marginBottom:16}}>
            <h3 style={{fontFamily:D,fontSize:14,fontWeight:700,color:C.acc,marginBottom:14}}>{cl?.company||cl?.name||"Proyecto"} {cl&&<SBadge status={cl.status}/>}</h3>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>{tds.map(td=>{const pr=PRIOS.find(p=>p.value===td.priority);const st=TSTAT.find(s=>s.value===td.status);
              return<div key={td.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:C.bg,borderRadius:10,border:`1px solid ${C.b}`}}>
                <button onClick={async()=>{const nx=td.status==="pendiente"?"en_progreso":td.status==="en_progreso"?"completado":"pendiente";await updTodo(td.id,{status:nx})}} style={{width:22,height:22,borderRadius:6,border:`2px solid ${st?.color}`,background:td.status==="completado"?C.g:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"#fff"}}>{td.status==="completado"&&<Ic n="check" sz={12}/>}</button>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:td.status==="completado"?C.td:C.tx,textDecoration:td.status==="completado"?"line-through":"none"}}>{td.title}</div>{td.description&&<div style={{fontSize:10,color:C.td,marginTop:2}}>{td.description}</div>}</div>
                <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>{td.end_date&&<span style={{fontSize:10,color:C.td}}>📅 {td.end_date}</span>}{pr&&<Badge label={pr.label} color={pr.color}/>}</div>
              </div>})}</div>
          </Card>)}
      </div>
    </div>;
  }

  // ─── CLIENT PORTAL ───
  if(user?.role==="client"){
    const cl=clients.find(x=>x.id===user.client_id);
    if(!cl)return<div style={{fontFamily:F,background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><style>{CSS}</style><div style={{textAlign:"center"}}><div style={{fontSize:48,marginBottom:16}}>🔒</div><h2 style={{fontFamily:D,color:C.tx}}>Sin acceso</h2><Btn onClick={logout} style={{marginTop:16}}>Salir</Btn></div></div>;
    const myFiles=clientFiles(cl.id);
    return<div style={{fontFamily:F,background:C.bg,minHeight:"100vh"}}><style>{CSS}</style>
      <div style={{borderBottom:`1px solid ${C.b}`,padding:"14px 28px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:14}}><span style={{fontFamily:D,fontSize:22,fontWeight:800,color:C.tx}}>W<span style={{color:C.acc}}>.</span></span><span style={{color:C.td}}>|</span><span style={{fontSize:13,color:C.tm}}>Portal Cliente</span></div><div style={{display:"flex",alignItems:"center",gap:14}}><span style={{fontSize:12,color:C.tm}}>{user.name}</span><Btn onClick={logout} v="ghost" icon="out" sz="sm">Salir</Btn></div></div>
      <div style={{maxWidth:900,margin:"0 auto",padding:"36px 20px",animation:"fadeUp .4s ease"}}>
        <h1 style={{fontFamily:D,fontSize:26,fontWeight:700,color:C.tx,marginBottom:6}}>Hola, {user.name} 👋</h1>
        <p style={{fontSize:13,color:C.tm,marginBottom:28}}>Portal de {cl.company||cl.name}</p>
        <Card style={{marginBottom:20}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><h3 style={{fontFamily:D,fontSize:15,fontWeight:600,color:C.tx}}>Estado del Proyecto</h3><SBadge status={cl.status}/></div><div style={{display:"flex",gap:3,borderRadius:6,overflow:"hidden"}}>{STATUS_OPTS.map((s,i)=><div key={s.value} style={{flex:1,height:5,background:i<=STATUS_OPTS.findIndex(x=>x.value===cl.status)?s.color:C.b}}/>)}</div>{cl.notes&&<p style={{fontSize:12,color:C.tm,marginTop:14,lineHeight:1.6}}>{cl.notes}</p>}</Card>
        <Card><h3 style={{fontFamily:D,fontSize:15,fontWeight:600,color:C.tx,marginBottom:16}}>Entregables ({myFiles.length})</h3>{myFiles.length===0?<Empty icon="📦" title="Sin entregables" sub="Pronto tendrás archivos"/>:<div style={{display:"flex",flexDirection:"column",gap:8}}>{myFiles.map(fl=><FileCard key={fl.id} file={fl} showDel={false}/>)}</div>}</Card>
        {cl.drive_folder_id&&<Card style={{marginTop:20}}><h3 style={{fontFamily:D,fontSize:15,fontWeight:600,color:C.tx,marginBottom:14}}>📂 Archivos del Proyecto</h3><DriveFiles ownerType="client" ownerId={cl.id} currentFolderId={cl.drive_folder_id} readOnly/></Card>}
      </div>
    </div>;
  }

  // ═══ ADMIN PANEL ═══
  const nav=[{key:"dashboard",label:"Dashboard",icon:"dash"},{key:"prospects",label:"Prospectos",icon:"prosp",cnt:prospects.length},{key:"clients",label:"Clientes",icon:"cli",cnt:clients.length},{key:"employees",label:"Empleados",icon:"emp",cnt:employees.length},{key:"timeline",label:"Cronograma",icon:"cal"},{key:"users",label:"Usuarios",icon:"usr"}];
  const sp=prospects.find(p=>p.id===selId);
  const sc=clients.find(x=>x.id===selId);
  const filt=(l)=>l.filter(x=>(x.name+(x.company||"")+(x.email||"")).toLowerCase().includes(search.toLowerCase()));

  return<div style={{fontFamily:F,background:C.bg,minHeight:"100vh",display:"flex"}}><style>{CSS}</style>
    {saving&&<div style={{position:"fixed",top:12,right:12,background:C.acc,color:"#000",padding:"6px 14px",borderRadius:8,fontSize:11,fontWeight:700,zIndex:2000,animation:"fadeIn .2s"}}>Guardando...</div>}

    {/* SIDEBAR */}
    <div style={{width:220,borderRight:`1px solid ${C.b}`,display:"flex",flexDirection:"column",flexShrink:0,background:C.s,position:"sticky",top:0,height:"100vh"}}>
      <div style={{padding:"20px 18px 28px",borderBottom:`1px solid ${C.b}`}}><div style={{fontFamily:D,fontSize:26,fontWeight:800,color:C.tx}}>W<span style={{color:C.acc}}>.</span></div><div style={{fontSize:10,color:C.td,marginTop:1,letterSpacing:".1em",textTransform:"uppercase"}}>Project Manager</div></div>
      <nav style={{flex:1,padding:"12px 8px",display:"flex",flexDirection:"column",gap:1}}>{nav.map(i=><button key={i.key} onClick={()=>{setView(i.key);setSelId(null);setSearch("")}} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 10px",border:"none",borderRadius:8,background:view===i.key?C.acc+"12":"transparent",color:view===i.key?C.acc:C.tm,fontFamily:F,fontSize:12,fontWeight:500,cursor:"pointer",textAlign:"left",width:"100%"}}><Ic n={i.icon} sz={17}/>{i.label}{i.cnt>0&&<span style={{marginLeft:"auto",fontSize:10,background:C.bg,padding:"1px 6px",borderRadius:8,color:C.td}}>{i.cnt}</span>}</button>)}</nav>
      <div style={{padding:"14px 10px",borderTop:`1px solid ${C.b}`}}><div style={{display:"flex",alignItems:"center",gap:9,marginBottom:10,padding:"0 4px"}}><div style={{width:28,height:28,borderRadius:7,background:`linear-gradient(135deg,${C.acc},${C.accD})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:C.bg}}>A</div><div><div style={{fontSize:11,fontWeight:600,color:C.tx}}>Admin</div><div style={{fontSize:9,color:C.td}}>Master</div></div></div><Btn onClick={logout} v="ghost" icon="out" sz="sm" style={{width:"100%",justifyContent:"center"}}>Cerrar Sesión</Btn></div>
    </div>

    {/* MAIN */}
    <div style={{flex:1,overflow:"auto"}}><div style={{padding:"24px 32px",animation:"fadeIn .25s ease"}}>

      {/* DASHBOARD */}
      {view==="dashboard"&&<div>
        <h1 style={{fontFamily:D,fontSize:24,fontWeight:700,color:C.tx,marginBottom:4}}>Dashboard</h1><p style={{fontSize:13,color:C.tm,marginBottom:24}}>Vista general de Wauya</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:24}}><Stat label="Prospectos" value={prospects.length} icon="🎯" color={C.w}/><Stat label="Clientes" value={clients.length} icon="💼" color={C.acc}/><Stat label="Empleados" value={employees.length} icon="👤" color={C.p}/><Stat label="Tareas" value={todos.length} icon="📋" color={C.bl}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
          <Card><h3 style={{fontFamily:D,fontSize:13,fontWeight:700,color:C.tx,marginBottom:16}}>Estado de Proyectos</h3><div style={{display:"flex",alignItems:"center",gap:20}}><Donut data={stats.sc.map(s=>({value:s.count,color:s.color}))}/><div style={{display:"flex",flexDirection:"column",gap:5}}>{stats.sc.map(s=><div key={s.value} style={{display:"flex",alignItems:"center",gap:7,fontSize:11}}><div style={{width:8,height:8,borderRadius:2,background:s.color}}/><span style={{color:C.tm}}>{s.label}</span><span style={{color:C.tx,fontWeight:700,marginLeft:"auto"}}>{s.count}</span></div>)}</div></div></Card>
          <Card><h3 style={{fontFamily:D,fontSize:13,fontWeight:700,color:C.tx,marginBottom:16}}>Estado de Tareas</h3><MiniBar data={[{label:"Pendientes",value:stats.pt,color:"#6B7280"},{label:"En Progreso",value:stats.ip,color:C.w},{label:"Completadas",value:stats.ct,color:C.g}]} height={120}/><div style={{marginTop:10,display:"flex",justifyContent:"space-between",padding:"7px 12px",background:C.bg,borderRadius:8}}><span style={{fontSize:11,color:C.tm}}>Completado</span><span style={{fontSize:12,fontWeight:700,color:C.g}}>{stats.tt?Math.round(stats.ct/stats.tt*100):0}%</span></div></Card>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <Card><h3 style={{fontFamily:D,fontSize:13,fontWeight:700,color:C.tx,marginBottom:16}}>Carga por Empleado</h3>{employees.length===0?<p style={{fontSize:12,color:C.td}}>Sin empleados</p>:<MiniBar data={stats.el.map(e=>({label:e.name?.split(" ")[0],value:e.tc,color:C.p}))} height={120}/>}</Card>
          <Card><h3 style={{fontFamily:D,fontSize:13,fontWeight:700,color:C.tx,marginBottom:16}}>Archivos Recientes</h3>{files.length===0?<p style={{fontSize:12,color:C.td}}>Sin archivos</p>:<div style={{display:"flex",flexDirection:"column",gap:5}}>{files.slice(0,4).map(d=><div key={d.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:C.bg,borderRadius:8,fontSize:11}}><span>{([...DEL_TYPES,...PROSP_TYPES].find(x=>x.value===d.file_type)||{icon:"📎"}).icon}</span><div style={{flex:1,minWidth:0}}><div style={{color:C.tx,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</div></div></div>)}</div>}</Card>
        </div>
      </div>}

      {/* PROSPECTS LIST */}
      {view==="prospects"&&!selId&&<div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><h1 style={{fontFamily:D,fontSize:24,fontWeight:700,color:C.tx}}>Prospectos</h1><Btn onClick={()=>setModal("add_prospect")} icon="plus">Nuevo Prospecto</Btn></div>
        <div style={{position:"relative",marginBottom:18}}><div style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:C.td}}><Ic n="srch" sz={15}/></div><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." style={{width:"100%",background:C.bg,border:`1px solid ${C.b}`,borderRadius:10,padding:"9px 12px 9px 34px",color:C.tx,fontSize:12,fontFamily:F,outline:"none"}}/></div>
        {filt(prospects).length===0?<Empty icon="🎯" title="Sin prospectos" sub="Agrega tu primer prospecto"/>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>{filt(prospects).map(p=><Card key={p.id} hover onClick={()=>setSelId(p.id)}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div><div style={{fontFamily:D,fontSize:14,fontWeight:600,color:C.tx}}>{p.company||p.name}</div><div style={{fontSize:11,color:C.tm,marginTop:1}}>{p.name}</div></div></div>{p.email&&<div style={{fontSize:11,color:C.td}}>✉ {p.email}</div>}<div style={{display:"flex",gap:8,marginTop:8,fontSize:10,color:C.td}}><Ic n="file" sz={12}/> {prospFiles(p.id).length} archivos</div></Card>)}</div>}
      </div>}

      {/* PROSPECT DETAIL */}
      {view==="prospects"&&selId&&sp&&<div>
        <button onClick={()=>setSelId(null)} style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"none",color:C.tm,cursor:"pointer",fontSize:12,marginBottom:18,padding:0,fontFamily:F}}><Ic n="back" sz={15}/> Volver</button>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}><div><h1 style={{fontFamily:D,fontSize:24,fontWeight:700,color:C.tx}}>{sp.company||sp.name}</h1><p style={{fontSize:12,color:C.tm,marginTop:2}}>{sp.name} · {sp.email}</p></div><div style={{display:"flex",gap:8}}><Btn onClick={()=>convertProspect(sp.id)} sz="sm">Convertir a Cliente</Btn><Btn onClick={()=>delProspect(sp.id)} v="danger" sz="sm" icon="tr"/></div></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
          <Card><h3 style={{fontFamily:D,fontSize:13,fontWeight:600,color:C.tx,marginBottom:10}}>Info</h3>{sp.phone&&<div style={{fontSize:12,color:C.tm,marginBottom:4}}>📱 {sp.phone}</div>}{sp.services&&<div style={{fontSize:12,color:C.tm}}>🎯 {sp.services}</div>}</Card>
          <Card><h3 style={{fontFamily:D,fontSize:13,fontWeight:600,color:C.tx,marginBottom:10}}>Notas</h3><textarea value={sp.notes||""} onBlur={e=>updProspect(sp.id,{notes:e.target.value})} onChange={e=>{const v=e.target.value;setProspects(pr=>pr.map(x=>x.id===sp.id?{...x,notes:v}:x))}} placeholder="Notas..." style={{width:"100%",background:C.bg,border:`1px solid ${C.b}`,borderRadius:8,padding:8,color:C.tx,fontSize:12,fontFamily:F,outline:"none",resize:"vertical",minHeight:70}}/></Card>
        </div>
        <Card><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><h3 style={{fontFamily:D,fontSize:13,fontWeight:600,color:C.tx}}>Archivos ({prospFiles(sp.id).length})</h3><Btn onClick={()=>setModal("upload_pf")} v="secondary" sz="sm" icon="plus">Subir</Btn></div>{prospFiles(sp.id).length===0?<Empty icon="📁" title="Sin archivos" sub="Sube propuestas"/>:<div style={{display:"flex",flexDirection:"column",gap:6}}>{prospFiles(sp.id).map(fl=><FileCard key={fl.id} file={fl} onDelete={deleteFile}/>)}</div>}</Card>
        <Card style={{marginTop:20}}><h3 style={{fontFamily:D,fontSize:13,fontWeight:600,color:C.tx,marginBottom:14}}>📂 Google Drive</h3><DriveFiles ownerType="prospect" ownerId={sp.id} currentFolderId={sp.drive_folder_id} onUpdate={loadAll}/></Card>
      </div>}

      {/* CLIENTS LIST */}
      {view==="clients"&&!selId&&<div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><h1 style={{fontFamily:D,fontSize:24,fontWeight:700,color:C.tx}}>Clientes</h1><Btn onClick={()=>setModal("add_client")} icon="plus">Nuevo Cliente</Btn></div>
        <div style={{position:"relative",marginBottom:18}}><div style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:C.td}}><Ic n="srch" sz={15}/></div><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." style={{width:"100%",background:C.bg,border:`1px solid ${C.b}`,borderRadius:10,padding:"9px 12px 9px 34px",color:C.tx,fontSize:12,fontFamily:F,outline:"none"}}/></div>
        {filt(clients).length===0?<Empty icon="💼" title="Sin clientes" sub="Agrega o convierte prospectos"/>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>{filt(clients).map(cl=><Card key={cl.id} hover onClick={()=>setSelId(cl.id)}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div><div style={{fontFamily:D,fontSize:14,fontWeight:600,color:C.tx}}>{cl.company||cl.name}</div><div style={{fontSize:11,color:C.tm,marginTop:1}}>{cl.name}</div></div><SBadge status={cl.status}/></div>{cl.services&&<div style={{fontSize:11,color:C.td,marginBottom:6}}>🎯 {cl.services}</div>}<div style={{display:"flex",gap:10,fontSize:10,color:C.td}}><span><Ic n="file" sz={11}/> {clientFiles(cl.id).length}</span><span><Ic n="usr" sz={11}/> {clientUsers.filter(u=>u.client_id===cl.id).length}</span><span><Ic n="todo" sz={11}/> {todos.filter(td=>td.client_id===cl.id).length}</span></div></Card>)}</div>}
      </div>}

      {/* CLIENT DETAIL */}
      {view==="clients"&&selId&&sc&&<div>
        <button onClick={()=>setSelId(null)} style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"none",color:C.tm,cursor:"pointer",fontSize:12,marginBottom:18,padding:0,fontFamily:F}}><Ic n="back" sz={15}/> Volver</button>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}><div><h1 style={{fontFamily:D,fontSize:24,fontWeight:700,color:C.tx}}>{sc.company||sc.name}</h1><p style={{fontSize:12,color:C.tm,marginTop:2}}>{sc.name} · {sc.email}</p></div><div style={{display:"flex",gap:8,alignItems:"center"}}><Sel value={sc.status} onChange={e=>updClient(sc.id,{status:e.target.value})} options={STATUS_OPTS} style={{fontSize:11,padding:"6px 10px"}}/><Btn onClick={()=>delClient(sc.id)} v="danger" sz="sm" icon="tr"/></div></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
          <Card><h3 style={{fontFamily:D,fontSize:13,fontWeight:600,color:C.tx,marginBottom:10}}>Info</h3>{sc.phone&&<div style={{fontSize:12,color:C.tm,marginBottom:4}}>📱 {sc.phone}</div>}{sc.services&&<div style={{fontSize:12,color:C.tm}}>🎯 {sc.services}</div>}</Card>
          <Card><h3 style={{fontFamily:D,fontSize:13,fontWeight:600,color:C.tx,marginBottom:10}}>Notas</h3><textarea value={sc.notes||""} onBlur={e=>updClient(sc.id,{notes:e.target.value})} onChange={e=>{const v=e.target.value;setClients(cl=>cl.map(x=>x.id===sc.id?{...x,notes:v}:x))}} placeholder="Notas..." style={{width:"100%",background:C.bg,border:`1px solid ${C.b}`,borderRadius:8,padding:8,color:C.tx,fontSize:12,fontFamily:F,outline:"none",resize:"vertical",minHeight:70}}/></Card>
        </div>
        <Card style={{marginBottom:20}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h3 style={{fontFamily:D,fontSize:13,fontWeight:600,color:C.tx}}>Usuarios ({clientUsers.filter(u=>u.client_id===sc.id).length})</h3><Btn onClick={()=>setModal("add_cu")} v="secondary" sz="sm" icon="plus">Crear</Btn></div>{clientUsers.filter(u=>u.client_id===sc.id).length===0?<p style={{fontSize:11,color:C.td}}>Sin usuarios</p>:<div style={{display:"flex",flexDirection:"column",gap:6}}>{clientUsers.filter(u=>u.client_id===sc.id).map(u=><div key={u.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:C.bg,borderRadius:8,border:`1px solid ${C.b}`}}><div><div style={{fontSize:12,fontWeight:500,color:C.tx}}>{u.name}</div><div style={{fontSize:10,color:C.td}}>{u.email} · 🔑 {u.password}</div></div><button onClick={()=>delCU(u.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.r,padding:4}}><Ic n="tr" sz={13}/></button></div>)}</div>}</Card>
        <Card style={{marginBottom:20}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h3 style={{fontFamily:D,fontSize:13,fontWeight:600,color:C.tx}}>Tareas ({todos.filter(td=>td.client_id===sc.id).length})</h3><Btn onClick={()=>setModal("add_todo")} v="secondary" sz="sm" icon="plus">Nueva</Btn></div>{todos.filter(td=>td.client_id===sc.id).length===0?<p style={{fontSize:11,color:C.td}}>Sin tareas</p>:<div style={{display:"flex",flexDirection:"column",gap:6}}>{todos.filter(td=>td.client_id===sc.id).map(td=>{const emp=employees.find(e=>e.id===td.assigned_to);const pr=PRIOS.find(p=>p.value===td.priority);const st=TSTAT.find(s=>s.value===td.status);return<div key={td.id} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",background:C.bg,borderRadius:10,border:`1px solid ${C.b}`}}><select value={td.status} onChange={e=>updTodo(td.id,{status:e.target.value})} style={{background:st?.color+"20",border:`1px solid ${st?.color}40`,borderRadius:6,padding:"3px 6px",color:st?.color,fontSize:10,fontWeight:700,fontFamily:F,cursor:"pointer",outline:"none"}}>{TSTAT.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select><div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:td.status==="completado"?C.td:C.tx,textDecoration:td.status==="completado"?"line-through":"none"}}>{td.title}</div><div style={{fontSize:10,color:C.td,display:"flex",gap:8,marginTop:1}}>{emp&&<span>👤 {emp.name}</span>}{td.start_date&&<span>📅 {td.start_date}</span>}{td.end_date&&<span>→ {td.end_date}</span>}</div></div><div style={{display:"flex",gap:3,alignItems:"center",flexShrink:0}}>{pr&&<Badge label={pr.label} color={pr.color}/>}<Btn onClick={()=>setModal({type:"edit_todo",todo:td})} v="ghost" sz="sm" icon="edit"/><button onClick={()=>delTodo(td.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.r,padding:3}}><Ic n="tr" sz={13}/></button></div></div>})}</div>}</Card>
        <Card><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h3 style={{fontFamily:D,fontSize:13,fontWeight:600,color:C.tx}}>Entregables ({clientFiles(sc.id).length})</h3><Btn onClick={()=>setModal("upload_del")} v="secondary" sz="sm" icon="plus">Subir</Btn></div>{clientFiles(sc.id).length===0?<Empty icon="📦" title="Sin entregables" sub="Sube archivos"/>:<div style={{display:"flex",flexDirection:"column",gap:6}}>{clientFiles(sc.id).map(fl=><FileCard key={fl.id} file={fl} onDelete={deleteFile}/>)}</div>}</Card>
        <Card style={{marginTop:20}}><h3 style={{fontFamily:D,fontSize:13,fontWeight:600,color:C.tx,marginBottom:14}}>📂 Google Drive</h3><DriveFiles ownerType="client" ownerId={sc.id} currentFolderId={sc.drive_folder_id} onUpdate={loadAll}/></Card>
      </div>}

      {/* EMPLOYEES */}
      {view==="employees"&&<div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><h1 style={{fontFamily:D,fontSize:24,fontWeight:700,color:C.tx}}>Empleados</h1><Btn onClick={()=>setModal("add_emp")} icon="plus">Nuevo</Btn></div>
        {employees.length===0?<Empty icon="👤" title="Sin empleados" sub="Agrega miembros"/>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>{employees.map(e=>{const tasks=todos.filter(td=>td.assigned_to===e.id);const done=tasks.filter(td=>td.status==="completado").length;return<Card key={e.id}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}><div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${C.p},${C.bl})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff"}}>{e.name?.charAt(0)?.toUpperCase()}</div><div><div style={{fontFamily:D,fontSize:14,fontWeight:600,color:C.tx}}>{e.name}</div><div style={{fontSize:10,color:C.td}}>{e.role||"Empleado"}</div></div></div><button onClick={()=>delEmp(e.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.r,padding:3}}><Ic n="tr" sz={14}/></button></div><div style={{fontSize:11,color:C.tm,marginBottom:8}}>✉ {e.email} · 🔑 {e.password}</div><div style={{display:"flex",gap:8,fontSize:10,color:C.td}}><span>{tasks.length} tareas</span><span>·</span><span style={{color:C.g}}>{done} completadas</span></div>{tasks.length>0&&<div style={{marginTop:6,background:C.bg,borderRadius:6,overflow:"hidden",height:4,display:"flex"}}><div style={{width:`${(done/tasks.length)*100}%`,background:C.g,transition:"width .3s"}}/></div>}</Card>})}</div>}
      </div>}

      {/* TIMELINE */}
      {view==="timeline"&&<div><h1 style={{fontFamily:D,fontSize:24,fontWeight:700,color:C.tx,marginBottom:4}}>Cronograma</h1><p style={{fontSize:12,color:C.tm,marginBottom:20}}>Línea de tiempo por proyecto</p>{clients.length===0?<Empty icon="📅" title="Sin proyectos" sub="Agrega clientes y tareas"/>:clients.map(cl=>{const t=todos.filter(td=>td.client_id===cl.id);if(!t.length)return null;return<div key={cl.id} style={{marginBottom:24}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><h3 style={{fontFamily:D,fontSize:14,fontWeight:700,color:C.acc}}>{cl.company||cl.name}</h3><SBadge status={cl.status}/></div><Timeline tasks={t} employees={employees}/></div>})}</div>}

      {/* USERS */}
      {view==="users"&&<div><h1 style={{fontFamily:D,fontSize:24,fontWeight:700,color:C.tx,marginBottom:20}}>Usuarios</h1>
        <Card style={{marginBottom:16}}><h3 style={{fontFamily:D,fontSize:13,fontWeight:700,color:C.acc,marginBottom:12}}><Ic n="lock" sz={15}/> Master</h3><div style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",background:C.bg,borderRadius:8,border:`1px solid ${C.b}`}}><div style={{width:30,height:30,borderRadius:8,background:`linear-gradient(135deg,${C.acc},${C.accD})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:C.bg}}>A</div><div><div style={{fontSize:12,fontWeight:500,color:C.tx}}>Admin Wauya</div><div style={{fontSize:10,color:C.td}}>{MASTER.email}</div></div><Badge label="MASTER" color={C.acc}/></div></Card>
        <Card style={{marginBottom:16}}><h3 style={{fontFamily:D,fontSize:13,fontWeight:600,color:C.tx,marginBottom:12}}>Empleados ({employees.length})</h3>{employees.length===0?<p style={{fontSize:11,color:C.td}}>Sin empleados</p>:<div style={{display:"flex",flexDirection:"column",gap:6}}>{employees.map(e=><div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:C.bg,borderRadius:8,border:`1px solid ${C.b}`}}><div style={{width:26,height:26,borderRadius:6,background:C.pBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color:C.p}}>{e.name?.charAt(0)?.toUpperCase()}</div><div><div style={{fontSize:12,fontWeight:500,color:C.tx}}>{e.name}</div><div style={{fontSize:10,color:C.td}}>{e.email} · 🔑 {e.password}</div></div><Badge label="EMPLEADO" color={C.p}/></div>)}</div>}</Card>
        <Card><h3 style={{fontFamily:D,fontSize:13,fontWeight:600,color:C.tx,marginBottom:12}}>Clientes ({clientUsers.length})</h3>{clientUsers.length===0?<p style={{fontSize:11,color:C.td}}>Sin usuarios</p>:<div style={{display:"flex",flexDirection:"column",gap:6}}>{clientUsers.map(u=>{const cl=clients.find(x=>x.id===u.client_id);return<div key={u.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:C.bg,borderRadius:8,border:`1px solid ${C.b}`}}><div style={{width:26,height:26,borderRadius:6,background:C.blBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color:C.bl}}>{u.name?.charAt(0)?.toUpperCase()}</div><div><div style={{fontSize:12,fontWeight:500,color:C.tx}}>{u.name}</div><div style={{fontSize:10,color:C.td}}>{u.email} · {cl?.company||"—"} · 🔑 {u.password}</div></div><Badge label="CLIENTE" color={C.bl}/></div>})}</div>}</Card>
      </div>}

    </div></div>

    {/* MODALS */}
    {modal==="add_prospect"&&<Mod title="Nuevo Prospecto" onClose={()=>setModal(null)}><FP onDone={addProspect} onX={()=>setModal(null)}/></Mod>}
    {modal==="add_client"&&<Mod title="Nuevo Cliente" onClose={()=>setModal(null)}><FC onDone={addClient} onX={()=>setModal(null)}/></Mod>}
    {modal==="add_cu"&&sc&&<Mod title={`Usuario - ${sc.company||sc.name}`} onClose={()=>setModal(null)}><FCU onDone={u=>addCU(sc.id,u)} onX={()=>setModal(null)}/></Mod>}
    {modal==="add_emp"&&<Mod title="Nuevo Empleado" onClose={()=>setModal(null)}><FE onDone={addEmp} onX={()=>setModal(null)}/></Mod>}
    {modal==="add_todo"&&sc&&<Mod title={`Tarea - ${sc.company||sc.name}`} onClose={()=>setModal(null)} w={560}><FT cid={sc.id} emps={employees} onDone={addTodo} onX={()=>setModal(null)}/></Mod>}
    {modal?.type==="edit_todo"&&<Mod title="Editar Tarea" onClose={()=>setModal(null)} w={560}><FT cid={modal.todo.client_id} emps={employees} init={modal.todo} onDone={async u=>{await updTodo(modal.todo.id,u);setModal(null)}} onX={()=>setModal(null)} isEdit/></Mod>}
    {modal==="upload_pf"&&sp&&<Mod title="Subir Archivo" onClose={()=>setModal(null)}><FU types={PROSP_TYPES} onDone={(file,type)=>uploadFile(file,"prospect",sp.id,type)} onX={()=>setModal(null)}/></Mod>}
    {modal==="upload_del"&&sc&&<Mod title="Subir Entregable" onClose={()=>setModal(null)}><FU types={DEL_TYPES} onDone={(file,type)=>uploadFile(file,"client",sc.id,type)} onX={()=>setModal(null)}/></Mod>}
  </div>;
}

// ═══ FORMS ═══
function FP({onDone,onX}){const[f,s]=useState({name:"",company:"",email:"",phone:"",services:""});return<div style={{display:"flex",flexDirection:"column",gap:14}}><Inp label="Nombre" value={f.name} onChange={e=>s({...f,name:e.target.value})} placeholder="Juan Pérez"/><Inp label="Empresa" value={f.company} onChange={e=>s({...f,company:e.target.value})} placeholder="Empresa S.A."/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Inp label="Email" type="email" value={f.email} onChange={e=>s({...f,email:e.target.value})} placeholder="juan@empresa.com"/><Inp label="Teléfono" value={f.phone} onChange={e=>s({...f,phone:e.target.value})} placeholder="+593 999..."/></div><Inp label="Servicios" value={f.services} onChange={e=>s({...f,services:e.target.value})} placeholder="Branding, Social Media..."/><div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6}}><Btn onClick={onX} v="ghost">Cancelar</Btn><Btn onClick={()=>{if(f.name)onDone(f)}} disabled={!f.name}>Crear</Btn></div></div>}
function FC({onDone,onX}){const[f,s]=useState({name:"",company:"",email:"",phone:"",services:"",notes:""});return<div style={{display:"flex",flexDirection:"column",gap:14}}><Inp label="Nombre" value={f.name} onChange={e=>s({...f,name:e.target.value})} placeholder="Juan Pérez"/><Inp label="Empresa" value={f.company} onChange={e=>s({...f,company:e.target.value})} placeholder="Empresa S.A."/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Inp label="Email" type="email" value={f.email} onChange={e=>s({...f,email:e.target.value})} placeholder="juan@empresa.com"/><Inp label="Teléfono" value={f.phone} onChange={e=>s({...f,phone:e.target.value})} placeholder="+593 999..."/></div><Inp label="Servicios" value={f.services} onChange={e=>s({...f,services:e.target.value})} placeholder="Branding, Social Media..."/><Txt label="Notas" value={f.notes} onChange={e=>s({...f,notes:e.target.value})} placeholder="Detalles..."/><div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6}}><Btn onClick={onX} v="ghost">Cancelar</Btn><Btn onClick={()=>{if(f.name)onDone(f)}} disabled={!f.name}>Crear</Btn></div></div>}
function FCU({onDone,onX}){const[f,s]=useState({name:"",email:"",password:""});const gen=()=>{let p="";const c="abcdefghijkmnpqrstuvwxyz23456789";for(let i=0;i<8;i++)p+=c[Math.floor(Math.random()*c.length)];s({...f,password:p})};return<div style={{display:"flex",flexDirection:"column",gap:14}}><Inp label="Nombre" value={f.name} onChange={e=>s({...f,name:e.target.value})} placeholder="Nombre"/><Inp label="Email" type="email" value={f.email} onChange={e=>s({...f,email:e.target.value})} placeholder="usuario@empresa.com"/><div><Inp label="Contraseña" value={f.password} onChange={e=>s({...f,password:e.target.value})} placeholder="Contraseña"/><button onClick={gen} style={{background:"none",border:"none",color:C.acc,fontSize:10,cursor:"pointer",fontFamily:F,marginTop:4}}>Generar automática</button></div><div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6}}><Btn onClick={onX} v="ghost">Cancelar</Btn><Btn onClick={()=>{if(f.name&&f.email&&f.password)onDone(f)}} disabled={!f.name||!f.email||!f.password}>Crear</Btn></div></div>}
function FE({onDone,onX}){const[f,s]=useState({name:"",email:"",password:"",role:""});const gen=()=>{let p="";const c="abcdefghijkmnpqrstuvwxyz23456789";for(let i=0;i<8;i++)p+=c[Math.floor(Math.random()*c.length)];s({...f,password:p})};return<div style={{display:"flex",flexDirection:"column",gap:14}}><Inp label="Nombre" value={f.name} onChange={e=>s({...f,name:e.target.value})} placeholder="María García"/><Inp label="Cargo" value={f.role} onChange={e=>s({...f,role:e.target.value})} placeholder="Diseñador, CM..."/><Inp label="Email" type="email" value={f.email} onChange={e=>s({...f,email:e.target.value})} placeholder="maria@wauya.com"/><div><Inp label="Contraseña" value={f.password} onChange={e=>s({...f,password:e.target.value})} placeholder="Contraseña"/><button onClick={gen} style={{background:"none",border:"none",color:C.acc,fontSize:10,cursor:"pointer",fontFamily:F,marginTop:4}}>Generar automática</button></div><div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6}}><Btn onClick={onX} v="ghost">Cancelar</Btn><Btn onClick={()=>{if(f.name&&f.email&&f.password)onDone(f)}} disabled={!f.name||!f.email||!f.password}>Crear</Btn></div></div>}
function FT({cid,emps,onDone,onX,init,isEdit}){const[f,s]=useState(init?{title:init.title,description:init.description,priority:init.priority,status:init.status,assigned_to:init.assigned_to||"",start_date:init.start_date||todayStr(),end_date:init.end_date||""}:{title:"",description:"",priority:"media",status:"pendiente",assigned_to:"",start_date:todayStr(),end_date:""});return<div style={{display:"flex",flexDirection:"column",gap:14}}><Inp label="Título" value={f.title} onChange={e=>s({...f,title:e.target.value})} placeholder="Diseñar logo..."/><Txt label="Descripción" value={f.description} onChange={e=>s({...f,description:e.target.value})} placeholder="Detalles..."/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Sel label="Prioridad" value={f.priority} onChange={e=>s({...f,priority:e.target.value})} options={PRIOS}/><Sel label="Estado" value={f.status} onChange={e=>s({...f,status:e.target.value})} options={TSTAT}/></div><Sel label="Asignar a" value={f.assigned_to||""} onChange={e=>s({...f,assigned_to:e.target.value||null})} options={[{value:"",label:"Sin asignar"},...emps.map(e=>({value:e.id,label:e.name}))]}/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Inp label="Inicio" type="date" value={f.start_date||""} onChange={e=>s({...f,start_date:e.target.value})}/><Inp label="Fin" type="date" value={f.end_date||""} onChange={e=>s({...f,end_date:e.target.value})}/></div><div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6}}><Btn onClick={onX} v="ghost">Cancelar</Btn><Btn onClick={()=>{if(f.title)onDone({...f,client_id:cid})}} disabled={!f.title}>{isEdit?"Guardar":"Crear"}</Btn></div></div>}
function FU({types,onDone,onX}){const[tp,sTp]=useState(types[0].value);const[sel,sSel]=useState(null);const ref=useRef(null);return<div style={{display:"flex",flexDirection:"column",gap:14}}><Sel label="Tipo" value={tp} onChange={e=>sTp(e.target.value)} options={types}/><div><label style={{fontSize:11,fontWeight:600,color:C.tm,fontFamily:F,textTransform:"uppercase",letterSpacing:".06em",marginBottom:5,display:"block"}}>Archivo</label><div onClick={()=>ref.current?.click()} style={{border:`2px dashed ${C.b}`,borderRadius:12,padding:28,textAlign:"center",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.acc} onMouseLeave={e=>e.currentTarget.style.borderColor=C.b}><input ref={ref} type="file" style={{display:"none"}} onChange={e=>{if(e.target.files[0])sSel(e.target.files[0])}}/>{sel?<div style={{fontSize:12,color:C.tx}}>📎 {sel.name} ({(sel.size/1024).toFixed(1)} KB)</div>:<div><div style={{fontSize:24,marginBottom:6}}>📁</div><div style={{fontSize:12,color:C.tm}}>Click para seleccionar</div></div>}</div></div><div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6}}><Btn onClick={onX} v="ghost">Cancelar</Btn><Btn onClick={()=>{if(sel)onDone(sel,tp)}} disabled={!sel}>Subir</Btn></div></div>}
