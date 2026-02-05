import { serve } from "bun";
import { renderToString } from "react-dom/server";
import { App } from "@/components/App";
import { ServerRouter } from "@/router";
import { SimpleCache, CacheProvider } from "@/cache";
import { matchRoute } from "@/router/routes";

const indexHtmlFile = Bun.file(import.meta.dir + "/index.html");

// 1. Bundle the frontend into memory
const build = await Bun.build({
  entrypoints: ["./src/frontend.tsx"],
  target: "browser",
  splitting: false,
  sourcemap: "inline",
  minify: true,
});

const frontendBundle = build.outputs.find((o) => o.kind === "entry-point");
const frontendCss = build.outputs.find((o) => o.kind === "asset" && o.path?.endsWith(".css"));

async function renderSSR(req: Request) {
  const cache = new SimpleCache();
  const url = new URL(req.url);

  const route = matchRoute(url.pathname);
  if (!route) return null;

  if (route.loadData) {
    await route.loadData(cache, url);
  }

  const appHtml = renderToString(
    <CacheProvider cache={cache}>
      <ServerRouter url={req.url}>
        <App />
      </ServerRouter>
    </CacheProvider>,
  );

  const html = await indexHtmlFile.text();

  // Inject HTML, Data Snapshot, and fix the script tag to point to our bundle
  let ssrHtml = html
    .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
    .replace(
      '<script type="module" src="./frontend.tsx"></script>',
      '<script type="module" src="/frontend.js"></script>',
    );

  // Inject the CSS link
  ssrHtml = ssrHtml.replace("</head>", '  <link rel="stylesheet" href="/index.css" />\n  </head>');

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
    "/favicon.ico": Bun.file(import.meta.dir + "/assets/logo.svg"),
    "/frontend.js": new Response(frontendBundle, {
      headers: { "Content-Type": "text/javascript" },
    }),

    "/index.css": new Response(frontendCss, {
      headers: { "Content-Type": "text/css" },
    }),

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

    "/assets/:file": async (req) => {
      const fileName = req.params.file;
      const filePath = import.meta.dir + "/assets/" + fileName;
      const file = Bun.file(filePath);

      if (await file.exists()) {
        return new Response(file);
      }

      return new Response("Not Found", { status: 404 });
    },

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

console.log(`🚀 Server running at ${server.url}`);
