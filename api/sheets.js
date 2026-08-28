export function recoverSpreadsheetErrors(formattedRows = [], formulaRows = []) {
  const phoneFormula = value => {
    const text = String(value ?? "").replace(/^=/, "").trim();
    return /^\+?[\d\s().-]{7,}$/.test(text) ? text : null;
  };
  return formattedRows.map((row, rowIndex) => row.map((value, columnIndex) => {
    if (!/^#(?:NAME\?|ERROR!|REF!|VALUE!|N\/A|DIV\/0!)$/i.test(String(value ?? "").trim())) return value;
    return phoneFormula(formulaRows?.[rowIndex]?.[columnIndex]) || value;
  }));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { sheetId, range } = req.query;
  const KEY = process.env.GOOGLE_API_KEY;

  if (!KEY) return res.status(500).json({ error: "Google API Key no configurada" });
  if (!sheetId) return res.status(400).json({ error: "Falta sheetId" });

  try {
    const sheetRange = range || "KPIs!A1:Z100";
    const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetRange)}`;
    const [formattedResponse, formulaResponse] = await Promise.all([
      fetch(`${baseUrl}?key=${KEY}&valueRenderOption=FORMATTED_VALUE`),
      fetch(`${baseUrl}?key=${KEY}&valueRenderOption=FORMULA`),
    ]);
    const [formatted, formulas] = await Promise.all([formattedResponse.json(), formulaResponse.json()]);
    if (formatted.error) return res.status(400).json({ error: formatted.error.message });

    const values = recoverSpreadsheetErrors(formatted.values || [], formulas.values || []);
    return res.json(values);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
