import { serve } from "bun";
import { renderToString } from "react-dom/server";
import index from "./index.html";
import { App } from "./App";

const server = serve({
  routes: {
    "/ssr": async (req) => {
      const appHtml = renderToString(<App />);
      const origin = new URL(req.url).origin;
      const response = await fetch(origin);
      const html = await response.text();

      let ssrHtml = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
      ssrHtml = ssrHtml.replaceAll(import.meta.dir + "/", "/src/");

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
