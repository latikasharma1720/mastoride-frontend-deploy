// api/[...proxy].js
// Vercel serverless function that proxies requests to the Railway backend
const API_BASE = "https://mastoride-web-dev-production-d469.up.railway.app";

export default async function handler(req, res) {
  try {
    // Example: /api/auth/signup  -> proxy = ['auth', 'signup']
    const { proxy = [] } = req.query;
    const path = "/" + proxy.join("/"); // "/auth/signup", "/booking", etc.
    const targetUrl = API_BASE + path;

    // Copy headers but remove host
    const headers = { ...req.headers };
    delete headers.host;

    // Read body (for POST/PUT/PATCH)
    let body = undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = await new Promise((resolve, reject) => {
        let data = "";
        req.on("data", (chunk) => {
          data += chunk;
        });
        req.on("end", () => resolve(data));
        req.on("error", reject);
      });
    }

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: {
        ...headers,
        // make sure content-type is present for JSON
        "content-type": headers["content-type"] || "application/json",
      },
      body,
    });

    const text = await upstream.text();
    res.status(upstream.status).send(text);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Proxy error contacting backend" });
  }
}
