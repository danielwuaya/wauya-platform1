export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) return res.status(200).json({ text: "Para usar el asistente AI, agrega ANTHROPIC_API_KEY en las variables de entorno de Vercel." });

  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "Falta prompt" });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await r.json();
    const text = data.content?.map(c => c.text || "").join("\n") || "Sin respuesta";
    return res.json({ text });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
