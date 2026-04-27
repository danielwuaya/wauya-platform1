export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const KEY = process.env.OPENAI_API_KEY;
  if (!KEY) return res.status(200).json({ text: "Para usar el asistente AI, agrega OPENAI_API_KEY en Vercel → Settings → Environment Variables.\n\nPuedes obtener tu key en: https://platform.openai.com/api-keys" });

  const { prompt, mode } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "Falta prompt" });

  try {
    // IMAGE GENERATION
    if (mode === "image") {
      const r = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${KEY}` },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: prompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
        }),
      });
      const data = await r.json();
      if (data.error) return res.json({ error: data.error.message });
      const imageUrl = data.data?.[0]?.url || "";
      const revised = data.data?.[0]?.revised_prompt || "";
      return res.json({ imageUrl, revised });
    }

    // TEXT + IMAGE COMBO (generate caption then image)
    if (mode === "text_and_image") {
      // Step 1: Generate text
      const textR = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${KEY}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1000,
        }),
      });
      const textData = await textR.json();
      const text = textData.choices?.[0]?.message?.content || "";

      // Step 2: Generate image based on the caption
      const imgPrompt = `Professional social media post graphic for a marketing agency. Clean, modern design with bold typography. The post is about: ${text.slice(0, 300)}. Style: professional, minimalist, brand-friendly, no text in image, suitable for Instagram.`;
      const imgR = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${KEY}` },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: imgPrompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
        }),
      });
      const imgData = await imgR.json();
      const imageUrl = imgData.data?.[0]?.url || "";

      return res.json({ text, imageUrl });
    }

    // TEXT ONLY (default)
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1500,
      }),
    });
    const data = await r.json();
    if (data.error) return res.json({ error: data.error.message });
    const text = data.choices?.[0]?.message?.content || "Sin respuesta";
    return res.json({ text });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
