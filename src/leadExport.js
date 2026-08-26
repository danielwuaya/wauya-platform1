const EXCEL_COLUMNS = [
  ["Empresa", "company"],
  ["Industria", "industry"],
  ["País", "country"],
  ["Ciudad", "city"],
  ["Dirección", "address"],
  ["Google Maps Link", "maps_url"],
  ["Teléfono", "phone"],
  ["Email", "email"],
  ["Instagram", "instagram"],
  ["Facebook", "facebook"],
  ["LinkedIn empresa", "linkedin"],
  ["Propietario/Gerente", "owner_name"],
  ["Cargo", "owner_role"],
  ["Estado de la página", "website_status"],
  ["Problema detectado", "problem"],
  ["Oportunidad", "opportunity"],
  ["Solución web", "recommended_solution"],
  ["Prioridad", "priority"],
  ["Lead Score", "lead_score"],
  ["Mensaje inicial", "initial_message"],
  ["Observaciones", "observations"],
  ["Asunto de email", "email_subject"],
  ["Email inicial", "email_body"],
  ["Seguimiento 1", "followup_1"],
  ["Seguimiento 2", "followup_2"],
  ["Send Status", "send_status"],
  ["AI Decision", "ai_decision"],
  ["AI Reason", "ai_reason"],
  ["AI Sales Angle", "ai_sales_angle"],
  ["Final Subject", "final_subject"],
  ["Final Email", "final_email"],
  ["Sent Date", "sent_at"],
  ["Reply Status", "reply_status"],
  ["Source Base", "source_base"],
];

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function excelValue(value) {
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return value ?? "";
}

export function buildLeadsExcelXml(leads, employees = []) {
  const sellerNames = new Map(employees.map(employee => [String(employee.id), employee.name]));
  const rows = leads.map(lead => ({
    ...lead,
    seller_name: lead.assigned_seller ? sellerNames.get(String(lead.assigned_seller)) || lead.assigned_seller : "",
  }));
  const cell = value => `<Cell><Data ss:Type="String">${xmlEscape(excelValue(value))}</Data></Cell>`;
  const header = EXCEL_COLUMNS.map(([label]) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${xmlEscape(label)}</Data></Cell>`).join("");
  const body = rows.map(row => `<Row>${EXCEL_COLUMNS.map(([, key]) => cell(row[key])).join("")}</Row>`).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default"><Alignment ss:Vertical="Top"/><Font ss:FontName="Arial" ss:Size="10"/></Style>
  <Style ss:ID="Header"><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0F1D38" ss:Pattern="Solid"/></Style>
 </Styles>
 <Worksheet ss:Name="Leads"><Table><Row>${header}</Row>${body}</Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><FilterOn/></WorksheetOptions>
 </Worksheet>
</Workbook>`;
}

export function downloadLeadsExcel(leads, employees = []) {
  const xml = buildLeadsExcelXml(leads, employees);
  const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `leads-wuaya-${date}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
