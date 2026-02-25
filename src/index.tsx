import { serve } from "bun";
import index from "@/index.html";

console.log(`backend: ${process.env.BUN_PUBLIC_HELLO}`);
console.log(`backend: ${process.env.GOODBYE}`);

const isDevelopment = process.env.NODE_ENV !== "production";

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

  development: isDevelopment && {
    // Enable browser hot reloading in development.
    hmr: false,

    // Echo browser console logs in the server process.
    console: false,
  },
});

function openInBrowser(url: string) {
  const command =
    process.platform === "darwin"
      ? ["open", url]
      : process.platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : ["xdg-open", url];

  try {
    Bun.spawn(command, {
      stdin: "ignore",
      stdout: "ignore",
      stderr: "ignore",
      detached: true,
    }).unref();
  } catch (err) {
    console.error("Failed to open browser URL", err);
  }
}

if (isDevelopment && process.stdin.isTTY) {
  process.stdin.setEncoding("utf8");
  process.stdin.resume();
  process.stdin.on("data", (chunk: string) => {
    if (chunk.trim().toLowerCase() === "o") {
      openInBrowser(server.url.href);
    }
  });
  console.log("⌨️  Press o + Enter to open in browser.");
}

console.log(`🚀 Server running at ${server.url}`);
console.log(`🧭 Server mode: spa (${isDevelopment ? "development" : "production"})`);
