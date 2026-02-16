import { serve } from "bun";

const distRoot = new URL("../dist/", import.meta.url);
const indexFile = Bun.file(new URL("index.html", distRoot));
const port = Number(process.env.PORT || 3000);

const server = serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const requestPath = decodeURIComponent(url.pathname);
    const relativePath = requestPath === "/" ? "index.html" : requestPath.slice(1);
    const file = Bun.file(new URL(relativePath, distRoot));

    if (await file.exists()) {
      return new Response(file, {
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });
    }

    // SPA fallback for client-side routes
    return new Response(indexFile, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  },
});

console.log(`📦 Static preview running at ${server.url}`);
