const EXCEL_COLUMNS = [
  ["ID", "id"],
  ["Empresa", "company"],
  ["Prioridad", "priority"],
  ["Score", "lead_score"],
  ["Estado", "outbound_status"],
  ["Industria", "industry"],
  ["Ciudad", "city"],
  ["Dirección", "address"],
  ["Contacto", "owner_name"],
  ["Cargo", "owner_role"],
  ["Email", "email"],
  ["Teléfono", "phone"],
  ["WhatsApp", "whatsapp"],
  ["Instagram", "instagram"],
  ["Facebook", "facebook"],
  ["Sitio web", "website"],
  ["Estado web", "website_status"],
  ["Problema detectado", "problem"],
  ["Oportunidad", "opportunity"],
  ["Solución recomendada", "recommended_solution"],
  ["Vendedor", "seller_name"],
  ["Lote", "batch"],
  ["Sistema de origen", "source_system"],
  ["ID de origen", "source_external_id"],
  ["URL de origen", "source_url"],
  ["Enriquecimiento", "enrichment_status"],
  ["Notas", "notes"],
  ["No contactar", "do_not_contact"],
  ["Fecha de creación", "created_at"],
  ["Última actualización", "updated_at"],
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

