import { serve } from "bun";
import { renderToString } from "react-dom/server";
import index from "./index.html";
import { App } from "./App";
import { ServerRouter, SimpleCache, CacheProvider } from "./simple-router";

const server = serve({
  routes: {
    "/ssr": async (req) => {
      // 1. Create a fresh cache for this request
      const cache = new SimpleCache();
      const url = new URL(req.url);

      // 2. Pre-fetch data based on route (Server-Side Data Routing)
      if (url.pathname === "/" || url.pathname === "/ssr") {
        await cache.fetch("pokemon-list", async () => {
          const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=5");
          return res.json();
        });
      } else if (url.pathname === "/pokemon") {
        const id = url.searchParams.get("id");
        if (id) {
          await cache.fetch(`pokemon-${id}`, async () => {
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
            return res.json();
          });
        }
      }

      // 3. Render with the populated cache
      const appHtml = renderToString(
        <CacheProvider cache={cache}>
          <ServerRouter url={req.url}>
            <App />
          </ServerRouter>
        </CacheProvider>
      );
      
      const origin = new URL(req.url).origin;
      const response = await fetch(origin);
      const html = await response.text();

      // 4. Inject HTML and Data Snapshot
      let ssrHtml = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
      
      // Inject the cache state for client hydration
      const snapshot = cache.snapshot();
      const hydrationScript = `<script>window.__INITIAL_DATA__ = ${JSON.stringify(snapshot)}</script>`;
      ssrHtml = ssrHtml.replace("</body>", `${hydrationScript}</body>`);

      return new Response(ssrHtml, {
        headers: { "Content-Type": "text/html" },
      });
    },

    "/api/hello": {
      async GET(_req) {
        return Response.json({ message: "Hello, world!", method: "GET" });
      },
      async PUT(_req) {
        return Response.json({ message: "Hello, world!", method: "PUT" });
      },
    },

    "/api/hello/:name": async (req) => {
      const name = req.params.name;
      return Response.json({ message: `Hello, ${name}!` });
    },

    "/src/:file": async (req) => {
      const fileName = req.params.file;
      const filePath = import.meta.dir + "/" + fileName;
      const file = Bun.file(filePath);

      if (await file.exists()) {
        return new Response(file);
      }

      return new Response("Not Found", { status: 404 });
    },

    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
console.log(`🔗 SSR available at ${server.url}ssr`);
