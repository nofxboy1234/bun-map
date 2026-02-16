import { serve } from "bun";
import { renderToString } from "react-dom/server";
import index from "@/index.html";
import { App } from "@/components/App";
import { SimpleCache } from "@/cache";
import { matchRoute } from "@/router/routes";

type ClientAsset = {
  filePath: string;
  type: string;
};

const isProd = process.env.NODE_ENV === "production";
const requestedMode = process.env.SERVER_MODE?.toLowerCase();
const serverMode =
  requestedMode === "spa" || requestedMode === "ssr" ? requestedMode : isProd ? "ssr" : "spa";
const isSSRMode = serverMode === "ssr";
const clientOutdir = "/tmp/bun-map-ssr-client";

let clientHtmlTemplate = "";
const clientAssets = new Map<string, ClientAsset>();

if (isProd && isSSRMode) {
  const clientBuild = await Bun.build({
    entrypoints: ["./src/index.html"],
    target: "browser",
    splitting: false,
    sourcemap: "none",
    minify: true,
    publicPath: "/",
    naming: {
      asset: "assets/[name].[ext]",
    },
    outdir: clientOutdir,
    env: "BUN_PUBLIC_*",
  });

  if (!clientBuild.success) {
    for (const log of clientBuild.logs) {
      console.error(log);
    }
    throw new Error("Client build failed.");
  }

  const normalizedOutdir = clientOutdir.replaceAll("\\", "/");

  for (const output of clientBuild.outputs) {
    const normalizedBuildPath = output.path.replaceAll("\\", "/");
    const normalizedPath = normalizedBuildPath.startsWith(normalizedOutdir)
      ? normalizedBuildPath.slice(normalizedOutdir.length)
      : normalizedBuildPath.startsWith("./")
        ? normalizedBuildPath.slice(1)
        : normalizedBuildPath.startsWith("/")
          ? normalizedBuildPath
          : `/${normalizedBuildPath}`;

    if (normalizedPath === "/index.html") {
      clientHtmlTemplate = await Bun.file(output.path).text();
      continue;
    }

    clientAssets.set(normalizedPath, {
      filePath: output.path,
      type: Bun.file(output.path).type || "application/octet-stream",
    });
  }

  if (!clientHtmlTemplate) {
    throw new Error("Missing index.html in client build output.");
  }
}

const logoFile = Bun.file(new URL("./assets/logo.svg", import.meta.url));
const reactLogoFile = Bun.file(new URL("./assets/react.svg", import.meta.url));
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
};

function serializeForInlineScript(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

async function renderSSRPage(req: Request, routeMatch = matchRoute(new URL(req.url).pathname)) {
  if (!clientHtmlTemplate) {
    throw new Error("SSR template is missing. This handler should only run in production.");
  }

  const url = new URL(req.url);
  const initialPath = `${url.pathname}${url.search}`;
  const cache = new SimpleCache();

  if (routeMatch?.route.loadData) {
    try {
      await routeMatch.route.loadData(cache, routeMatch.params, url);
    } catch (err) {
      console.error("SSR route data load failed", err);
    }
  }

  const appHtml = renderToString(<App cache={cache} initialPath={initialPath} staticMode />);
  const cacheStateScript = `<script>window.__INITIAL_CACHE__=${serializeForInlineScript(cache.dehydrate())};</script>`;
  const htmlWithRoot = clientHtmlTemplate.replace(
    '<div id="root"></div>',
    `<div id="root">${appHtml}</div>`,
  );
  const html = htmlWithRoot.includes("</body>")
    ? htmlWithRoot.replace("</body>", `${cacheStateScript}</body>`)
    : `${htmlWithRoot}${cacheStateScript}`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

const routes: Record<string, any> = {
  "/api/hello": {
    async GET(_req: Request) {
      return Response.json(
        {
          message: "Hello, world!",
          method: "GET",
        },
        {
          headers: corsHeaders,
        },
      );
    },
    async PUT(_req: Request) {
      return Response.json(
        {
          message: "Hello, world!",
          method: "PUT",
        },
        {
          headers: corsHeaders,
        },
      );
    },
    async OPTIONS(_req: Request) {
      return new Response(null, {
        headers: {
          ...corsHeaders,
          "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    },
  },
  "/users/:id": (req: Bun.BunRequest<"/users/:id">) => {
    return new Response(`Hello user ${req.params.id}`);
  },
  "/assets/react.svg": () => {
    return new Response(reactLogoFile);
  },
  "/assets/logo.svg": () => {
    return new Response(logoFile);
  },
};

if (isProd && isSSRMode) {
  for (const [path, asset] of clientAssets) {
    routes[path] = () =>
      new Response(Bun.file(asset.filePath), {
        headers: {
          "Content-Type": asset.type,
        },
      });
  }

  routes["/*"] = async (req: Request) => {
    const path = new URL(req.url).pathname;
    const routeMatch = matchRoute(path);
    if (routeMatch) {
      return await renderSSRPage(req, routeMatch);
    }

    return new Response("Not Found", { status: 404 });
  };
} else {
  // Preserve Bun's native HTML-bundle SPA behavior (including HMR in development).
  routes["/*"] = index;
}

const server = serve({
  routes,

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
console.log(`🧭 Server mode: ${serverMode} (${isProd ? "production" : "development"})`);
