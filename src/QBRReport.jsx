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
      kpiRows += `<tr><td style="padding:10px 14px;border-bottom:1px solid #eee;font-weight:600">${row[0]}</td><td style="padding:10px 14px;border-bottom:1px solid #eee;font-size:18px;font-weight:700">${fmt(cur)}</td><td style="padding:10px 14px;border-bottom:1px solid #eee">${fmt(prev)}</td><td style="padding:10px 14px;border-bottom:1px solid #eee">${target}</td><td style="padding:10px 14px;border-bottom:1px solid #eee;color:${isUp ? "#059669" : "#DC2626"};font-weight:600">${isUp ? "↑" : "↓"} ${Math.abs(change)}%</td></tr>`;
    });
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QBR - ${name}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;color:#1a1a2e;background:#fff;padding:40px 50px}
@media print{body{padding:20px 30px}@page{margin:1.5cm}}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #1a1a2e}
.logo{font-size:32px;font-weight:800;letter-spacing:-1px}
.logo span{color:#CDFF50;background:#1a1a2e;padding:2px 6px;border-radius:4px}
.meta{text-align:right;font-size:13px;color:#666}
.meta strong{display:block;font-size:18px;color:#1a1a2e}
h2{font-size:18px;font-weight:700;margin:28px 0 14px;color:#1a1a2e;border-left:4px solid #CDFF50;padding-left:12px}
table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px}
th{background:#f7f7f8;padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#666;border-bottom:2px solid #ddd}
.summary{display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap}
.summary-card{flex:1;min-width:140px;background:#f7f7f8;border-radius:10px;padding:16px;text-align:center}
.summary-card .val{font-size:28px;font-weight:800;color:#1a1a2e}
.summary-card .label{font-size:11px;color:#888;margin-top:4px;text-transform:uppercase;letter-spacing:.05em}
.footer{margin-top:40px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#999;text-align:center}
.status{display:inline-block;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:600}
</style></head><body>
<div class="header">
  <div><div class="logo">W<span>.</span></div><div style="font-size:12px;color:#888;margin-top:4px">WAUYA MARKETING</div></div>
  <div class="meta"><strong>${name}</strong>Reporte QBR · ${date}</div>
</div>

<h2>Resumen ejecutivo</h2>
<div class="summary">
  <div class="summary-card"><div class="val" style="color:#1a1a2e">📊</div><div class="label">Reporte mensual</div></div>
  <div class="summary-card"><div class="val">${client.status === "entregado" ? "✅" : client.status === "aprobado" ? "👍" : "⚡"}</div><div class="label">Estado: ${client.status || "En progreso"}</div></div>
  <div class="summary-card"><div class="val">${kpiData ? kpiData.length - 1 : 0}</div><div class="label">KPIs rastreados</div></div>
</div>

<h2>Métricas clave</h2>
${kpiRows ? `<table><thead><tr><th>Métrica</th><th>Actual</th><th>Anterior</th><th>Meta</th><th>Cambio</th></tr></thead><tbody>${kpiRows}</tbody></table>` : "<p style='color:#888;font-size:13px'>No hay datos de KPIs vinculados</p>"}

<h2>Servicios contratados</h2>
<p style="font-size:14px;line-height:1.7;margin-bottom:8px">${client.services || "No especificados"}</p>

${client.notes ? `<h2>Notas del proyecto</h2><p style="font-size:13px;line-height:1.7;color:#444">${client.notes}</p>` : ""}

<div class="footer">
  Generado por Wauya Platform · ${new Date().toLocaleDateString("es")} · mywuaya.com
</div>
</body></html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 600);
}
