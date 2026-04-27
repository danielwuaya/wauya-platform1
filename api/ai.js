export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
 
  const KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!KEY) return res.status(200).json({ text: "Agrega GEMINI_API_KEY en Vercel.\n\nEs gratis: ve a aistudio.google.com → Get API Key → Create." });
 
  const { prompt, mode } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "Falta prompt" });
 
  try {
    // IMAGE ONLY (Pollinations - 100% free, no key)
    if (mode === "image") {
      const encodedPrompt = encodeURIComponent(prompt);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&model=flux`;
      return res.json({ imageUrl, text: "" });
    }
 
    // TEXT + IMAGE COMBO
    if (mode === "text_and_image") {
      // Step 1: Generate text with Gemini
      const textR = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 1500 },
          }),
        }
      );
      const textData = await textR.json();
      if (textData.error) return res.json({ error: textData.error.message });
      const text = textData.candidates?.[0]?.content?.parts?.[0]?.text || "";
 
      // Step 2: Generate image with Pollinations (free)
      const imgDesc = text.slice(0, 200).replace(/[#@\n]/g, " ");
      const imgPrompt = `Professional social media post graphic, clean modern design, about: ${imgDesc}. Style: minimalist, navy blue and gold colors, brand-friendly, no text overlay`;
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imgPrompt)}?width=1024&height=1024&nologo=true&model=flux`;
 
      return res.json({ text, imageUrl });
    }
 
    // TEXT ONLY (Gemini - free)
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2000 },
        }),
      }
    );
    const data = await r.json();
    if (data.error) return res.json({ error: data.error.message });
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta";
    return res.json({ text });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
 
