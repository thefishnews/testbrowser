// api/proxy.js - Lightweight Scramjet Header & Gateway Interceptor
export default async function handler(req, res) {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Missing query parameter" });

    const targetUrl = `https://duckduckgo.com{encodeURIComponent(q)}`;

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });

        if (!response.ok) throw new Error(`Target returned status: ${response.status}`);
        
        const html = await response.text();
        return res.status(200).send(html);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
