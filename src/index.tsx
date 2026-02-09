import { serve } from "bun";
import { renderToString } from "react-dom/server";
import { App } from "@/components/App";
import { ServerRouter } from "@/router";
import { SimpleCache, CacheProvider } from "@/cache";
import { matchRoute } from "@/router/routes";
import index from "@/index.html";

async function renderSSR(req: Request) {
  const cache = new SimpleCache();
  const url = new URL(req.url);

  const match = matchRoute(url.pathname);
  if (!match) return null;

  if (match.route.loadData) {
    await match.route.loadData(cache, match.params, url);
  }

  const appHtml = renderToString(
    <CacheProvider cache={cache}>
      <ServerRouter url={req.url}>
        <App />
      </ServerRouter>
    </CacheProvider>,
  );

  const html = baseHtml;
  let ssrHtml = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

  const snapshot = cache.snapshot();
  const hydrationScript = `<script>
    window.__INITIAL_DATA__ = ${JSON.stringify(snapshot)};
    window.__SSR_URL__ = "${req.url}";
  </script>`;
  ssrHtml = ssrHtml.replace("</body>", `${hydrationScript}</body>`);

  return new Response(ssrHtml, {
    headers: { "Content-Type": "text/html" },
  });
}

const server = serve({
  routes: {
    "/assets/:file": async (req) => {
      const fileName = req.params.file;
      const filePath = import.meta.dir + "/assets/" + fileName;
      const file = Bun.file(filePath);

      if (await file.exists()) {
        return new Response(file);
      }

      return new Response("Not Found", { status: 404 });
    },

    "/spa": index,

    "/*": async (req) => {
      const ssrResponse = await renderSSR(req);
      if (ssrResponse) return ssrResponse;

      return new Response("Not Found", { status: 404 });
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

let baseHtml: string;

async function getBunHTMLBundle() {
  const spaURL = URL.parse("/spa", server.url)!;
  const res = await fetch(spaURL);
  baseHtml = await res.text();
}

getBunHTMLBundle();

console.log(`🚀 Server running at ${server.url}`);
