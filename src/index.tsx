import { serve } from "bun";
import index from "@/index.html";

const server = serve({
  routes: {
    "/api/hello": {
      async GET(_req: Request) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(_req: Request) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },
    "/users/:id": (req: Bun.BunRequest<"/users/:id">) => {
      return new Response(`Hello user ${req.params.id}`);
    },
    // Serve the SPA for all unmatched routes.
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development.
    hmr: true,

    // Echo browser console logs in the server process.
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
console.log(
  `🧭 Server mode: spa (${process.env.NODE_ENV === "production" ? "production" : "development"})`,
);
