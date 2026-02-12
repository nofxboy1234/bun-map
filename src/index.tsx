import { serve } from "bun";
import index from "@/index.html";

const testRoutes = {
  "/users/:id": (req: Bun.BunRequest<"/users/:id">) => {
    return new Response(`Hello user ${req.params.id}`);
  },
};

const server = serve({
  routes: {
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

    ...testRoutes,

    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
