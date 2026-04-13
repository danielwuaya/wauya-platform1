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
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetRange)}?key=${KEY}`;
    const r = await fetch(url);
    const data = await r.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    return res.json(data.values || []);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
