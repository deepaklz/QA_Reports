// api/insights.js — Vercel Serverless Function
// Proxies requests to Gemini API with the key stored securely in Vercel env vars.
// The API key is NEVER exposed to the browser.

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: "Server misconfiguration: API key not set." });
    }

    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: "Missing prompt in request body." });
    }

    try {
        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }
        );

        const data = await geminiRes.json();

        if (!geminiRes.ok) {
            return res.status(geminiRes.status).json({ error: data?.error?.message || "Gemini API error" });
        }

        // Return only the text to the client
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return res.status(200).json({ text });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
