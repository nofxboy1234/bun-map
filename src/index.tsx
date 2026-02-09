import { serve } from "bun";
import { renderToString } from "react-dom/server";
import { App } from "@/components/App";
import { ServerRouter } from "@/router";
import { SimpleCache, CacheProvider } from "@/cache";
import { matchRoute } from "@/router/routes";
import index from "@/index.html";

const indexBuild = await Bun.build({
  entrypoints: ["./src/index.html"],
  target: "bun",
  splitting: false,
});
console.log(indexBuild);

// const indexHtmlFile = Bun.file(import.meta.dir + "/index.html");

// Bundle the frontend logic
// async function buildFrontend() {
//   const build = await Bun.build({
//     entrypoints: ["./src/frontend.tsx"],
//     target: "browser",
//     splitting: false,
//     sourcemap: process.env.NODE_ENV === "production" ? "none" : "inline",
//     minify: process.env.NODE_ENV === "production",
//   });

//   return {
//     js: build.outputs.find((o) => o.kind === "entry-point"),
//     css: build.outputs.find((o) => o.kind === "asset" && o.path?.endsWith(".css")),
//   };
// }

// In production, cache the build once. In dev, we rebuild on request.
// let prodAssets: { js: any; css: any } | null = null;
// if (process.env.NODE_ENV === "production") {
//   prodAssets = await buildFrontend();
// }

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

  // Inject HTML, Data Snapshot, and fix the script tag to point to our bundle
  let ssrHtml = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
  // .replace(
  //   '<script type="module" src="./frontend.tsx"></script>',
  //   '<script type="module" src="/frontend.js"></script>',
  // );

  // Inject the CSS link
  // ssrHtml = ssrHtml.replace("</head>", '  <link rel="stylesheet" href="/index.css" />\n  </head>');

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
    // "/favicon.ico": Bun.file(import.meta.dir + "/assets/logo.svg"),
    // "/frontend.js": async () => {
    //   const assets = process.env.NODE_ENV === "production" ? prodAssets : await buildFrontend();
    //   return new Response(assets?.js, {
    //     headers: { "Content-Type": "text/javascript" },
    //   });
    // },

    // "/index.css": async () => {
    //   const assets = process.env.NODE_ENV === "production" ? prodAssets : await buildFrontend();
    //   return new Response(assets?.css, {
    //     headers: { "Content-Type": "text/css" },
    //   });
    // },

    // "/api/hello": {
    //   async GET(_req) {
    //     return Response.json({ message: "Hello, world!", method: "GET" });
    //   },
    //   async PUT(_req) {
    //     return Response.json({ message: "Hello, world!", method: "PUT" });
    //   },
    // },

    // "/api/hello/:name": async (req) => {
    //   const name = req.params.name;
    //   return Response.json({ message: `Hello, ${name}.ico": Bun.file(import.meta.dir + "/assets/logo.svg"),

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
  console.log(baseHtml);

  return baseHtml;
}

getBunHTMLBundle();

console.log(`🚀 Server running at ${server.url}`);
