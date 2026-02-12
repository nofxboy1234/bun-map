import { serve } from "bun";
import { renderToString } from "react-dom/server";
import { App } from "@/components/App";
import { ServerRouter } from "@/router";
import { SimpleCache, CacheProvider } from "@/cache";
import { matchRoute } from "@/router/routes";
import { buildDynamicFrontend } from "./builds";

async function buildFrontend() {
  const build = await buildDynamicFrontend();

  return {
    js: build.outputs.find((o) => o.kind === "entry-point"),
    css: build.outputs.find((o) => o.kind === "asset" && o.path?.endsWith(".css")),
  };
}

let prodAssets: { js: any; css: any } | null = null;
if (process.env.NODE_ENV === "production") {
  prodAssets = await buildFrontend();
}

async function renderSSR(req: Bun.BunRequest) {
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

  const baseHtml = await Bun.file(import.meta.dir + "/index.html").text();
  let ssrHtml = baseHtml
    .replaceAll('"./', '"/')
    .replaceAll(".tsx", ".js")
    .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

  const snapshot = cache.snapshot();
  const hydrationScript = `
  <script>
    window.__INITIAL_DATA__ = ${JSON.stringify(snapshot)};
    window.__SSR_URL__ = "${req.url}";
  </script>`;
  ssrHtml = ssrHtml.replace("</body>", `${hydrationScript}</body>`);

  return new Response(ssrHtml, {
    headers: { "Content-Type": "text/html" },
  });
}

const testRoutes = {
  "/users/:id": (req: Bun.BunRequest<"/users/:id">) => {
    return new Response(`Hello user ${req.params.id}`);
  },
};

const server = serve({
  routes: {
    "/favicon.ico": Bun.file(import.meta.dir + "/assets/logo.svg"),

    "/index.css": async () => {
      const assets = process.env.NODE_ENV === "production" ? prodAssets : await buildFrontend();
      return new Response(assets?.css, {
        headers: { "Content-Type": "text/css" },
      });
    },

    "/frontend.js": async () => {
      const assets = process.env.NODE_ENV === "production" ? prodAssets : await buildFrontend();
      return new Response(assets?.js, {
        headers: { "Content-Type": "text/javascript" },
      });
    },

    "/assets/:file": async (req) => {
      const fileName = req.params.file;
      const filePath = import.meta.dir + "/assets/" + fileName;
      const file = Bun.file(filePath);

      if (await file.exists()) {
        return new Response(file);
      }

      return new Response("Not Found", { status: 404 });
    },

    "/api/hello": {
      async GET(_req) {
        return Response.json(
          {
            message: "Hello, world!",
            method: "GET",
          },
          {
            headers: {
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      },
      async PUT(_req) {
        return Response.json(
          {
            message: "Hello, world!",
            method: "PUT",
          },
          {
            headers: {
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      },
      async OPTIONS(_req) {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      },
    },

    "/*": async (req) => {
      const ssrResponse = await renderSSR(req);
      if (ssrResponse) return ssrResponse;

      return new Response("Not Found", { status: 404 });
    },

    ...testRoutes,
  },
});

console.log(`🚀 Server running at ${server.url}`);
