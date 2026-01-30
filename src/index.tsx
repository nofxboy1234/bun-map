import { serve } from "bun";
import { renderToString } from "react-dom/server";
import { App } from "./App";
import React from "react";
import index from "./index.html";

const server = serve({
  routes: {
    "/ssr": async () => {
      const appHtml = renderToString(<App />);

      // Fetch the root HTML from our own server to get the bundled/transformed version
      // which includes the HMR scripts and correct asset paths.
      const response = await fetch(server.url);
      const html = await response.text();

      // Inject the rendered app into the HTML
      let ssrHtml = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

      // During SSR, Bun's server-side loader for assets (like SVGs) returns absolute paths.
      // We rewrite these to be relative to the project root so Bun's dev server
      // can resolve them correctly (it can serve from /src/...).
      const projectSrcPath = import.meta.dir + "/src/";
      ssrHtml = ssrHtml.replaceAll(projectSrcPath, "./src/");
      // Also catch any that might not have the trailing slash or be in the parent dir
      ssrHtml = ssrHtml.replaceAll(import.meta.dir + "/", "./");

      return new Response(ssrHtml, {
        headers: { "Content-Type": "text/html" },
      });
    },

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async (req) => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },

    // Serve the SPA normally. Bun handles HMR and bundling automatically
    // when a route points to an imported HTML file.
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
console.log(`🔗 SSR available at ${server.url}ssr`);
