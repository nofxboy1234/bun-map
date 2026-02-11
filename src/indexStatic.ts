const server = Bun.serve({
  routes: {
    "/": new Response(Bun.file("./dist/index.html")),
  },

  async fetch(req) {
    const path = new URL(req.url).pathname;
    const file = Bun.file("./dist" + path);

    if (!(await file.exists())) {
      // Check if it's a direct file request (has extension) or should fallback to index.html for SPA
      if (req.headers.get("Accept")?.includes("text/html")) {
        const index = Bun.file("./dist/index.html");
        if (await index.exists()) {
          return new Response(index);
        }
      }
      return new Response("Not Found", { status: 404 });
    }

    return new Response(file);
  },

  port: 5000,
  development: false,
});

console.log(`🚀 Static Server running at ${server.url}`);
