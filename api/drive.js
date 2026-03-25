export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { folderId, action } = req.query;
  const KEY = process.env.GOOGLE_API_KEY;

  if (!KEY) return res.status(500).json({ error: "Google API Key no configurada" });

  try {
    if (action === "list" && folderId) {
      const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
      const fields = encodeURIComponent("files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink)");
      const url = `https://www.googleapis.com/drive/v3/files?q=${q}&key=${KEY}&fields=${fields}&orderBy=folder,name&pageSize=100`;
      const r = await fetch(url);
      const data = await r.json();
      if (data.error) return res.status(400).json({ error: data.error.message });
      return res.json(data.files || []);
    }
    return res.status(400).json({ error: "Usa ?action=list&folderId=ID" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
