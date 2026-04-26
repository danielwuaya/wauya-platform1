export default function generateQBR(client, kpiData, monthlyData) {
  const name = client.company || client.name || "Cliente";
  const date = new Date().toLocaleDateString("es", { year: "numeric", month: "long" });

  let kpiRows = "";
  if (kpiData && kpiData.length > 1) {
    kpiData.slice(1).forEach(row => {
      if (!row[0]) return;
      const cur = row[1] || "0", prev = row[2] || "0", target = row[3] || "-", type = row[4] || "";
      const c = parseFloat(String(cur).replace(/[,%$]/g, "")) || 0;
      const p = parseFloat(String(prev).replace(/[,%$]/g, "")) || 0;
      const change = p ? (((c - p) / p) * 100).toFixed(1) : "N/A";
      const isUp = parseFloat(change) >= 0;
      const fmt = (v) => { const n = parseFloat(String(v).replace(/[,%$]/g, "")); if (type.includes("%") || type.includes("porcentaje")) return n.toFixed(1) + "%"; if (type.includes("$") || type.includes("moneda")) return "$" + n.toLocaleString(); return n.toLocaleString(); };
      kpiRows += `<tr><td style="padding:10px 14px;border-bottom:1px solid #e0e7f0;font-weight:600">${row[0]}</td><td style="padding:10px 14px;border-bottom:1px solid #e0e7f0;font-size:18px;font-weight:700;color:#012762">${fmt(cur)}</td><td style="padding:10px 14px;border-bottom:1px solid #e0e7f0">${fmt(prev)}</td><td style="padding:10px 14px;border-bottom:1px solid #e0e7f0">${target}</td><td style="padding:10px 14px;border-bottom:1px solid #e0e7f0;color:${isUp ? "#36DE67" : "#DC2626"};font-weight:600">${isUp ? "↑" : "↓"} ${Math.abs(change)}%</td></tr>`;
    });
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QBR - ${name}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&family=Poppins:wght@300;400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Poppins',sans-serif;color:#1a2744;background:#fff;padding:40px 50px}
@media print{body{padding:20px 30px}@page{margin:1.5cm}}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #012762}
.logo{font-family:'Playfair Display',serif;font-size:32px;font-weight:800;color:#012762;letter-spacing:-1px}
.logo span{color:#F8BA10}
.meta{text-align:right;font-size:13px;color:#666}
.meta strong{display:block;font-size:18px;color:#012762;font-family:'Playfair Display',serif}
h2{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;margin:28px 0 14px;color:#012762;border-left:4px solid #F8BA10;padding-left:12px}
table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px}
th{background:#012762;color:#fff;padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
.summary{display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap}
.summary-card{flex:1;min-width:140px;background:#f0f4fa;border-radius:10px;padding:16px;text-align:center;border-left:3px solid #F8BA10}
.summary-card .val{font-size:28px;font-weight:800;color:#012762;font-family:'Playfair Display',serif}
.summary-card .label{font-size:11px;color:#888;margin-top:4px;text-transform:uppercase;letter-spacing:.05em}
.footer{margin-top:40px;padding-top:16px;border-top:2px solid #012762;font-size:11px;color:#999;text-align:center}
</style></head><body>
<div class="header">
  <div><div class="logo">W<span>uaya</span></div><div style="font-size:11px;color:#888;margin-top:4px;text-transform:uppercase;letter-spacing:.08em">Marketing & Communications</div></div>
  <div class="meta"><strong>${name}</strong>Reporte QBR · ${date}</div>
</div>

<h2>Resumen ejecutivo</h2>
<div class="summary">
  <div class="summary-card"><div class="val">📊</div><div class="label">Reporte mensual</div></div>
  <div class="summary-card"><div class="val">${client.status === "entregado" ? "✅" : client.status === "aprobado" ? "👍" : "⚡"}</div><div class="label">Estado: ${client.status || "En progreso"}</div></div>
  <div class="summary-card"><div class="val">${kpiData ? kpiData.length - 1 : 0}</div><div class="label">KPIs rastreados</div></div>
</div>

<h2>Métricas clave</h2>
${kpiRows ? `<table><thead><tr><th>Métrica</th><th>Actual</th><th>Anterior</th><th>Meta</th><th>Cambio</th></tr></thead><tbody>${kpiRows}</tbody></table>` : "<p style='color:#888;font-size:13px'>No hay datos de KPIs vinculados</p>"}

<h2>Servicios contratados</h2>
<p style="font-size:14px;line-height:1.7;margin-bottom:8px">${client.services || "No especificados"}</p>

${client.notes ? `<h2>Notas del proyecto</h2><p style="font-size:13px;line-height:1.7;color:#444">${client.notes}</p>` : ""}

<div class="footer">
  Generado por Wuaya Platform · ${new Date().toLocaleDateString("es")} · mywuaya.com
</div>
</body></html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 600);
}
