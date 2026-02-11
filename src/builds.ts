export async function buildDynamicFrontend() {
  return await Bun.build({
    entrypoints: ["./src/frontend.tsx"],
    target: "browser",
    splitting: false,
    sourcemap: process.env.NODE_ENV === "production" ? "none" : "inline",
    minify: process.env.NODE_ENV === "production",
    naming: {
      asset: "assets/[name].[ext]",
    },
    publicPath: "/",
    env: "BUN_PUBLIC_*",
  });
}

export async function buildStaticFrontend() {
  return await Bun.build({
    entrypoints: ["./src/index.html"],
    target: "browser",
    splitting: false,
    sourcemap: "none",
    minify: true,
    naming: {
      asset: "assets/[name].[ext]",
    },
    publicPath: "/",
    outdir: "dist",
    env: "BUN_PUBLIC_*",
  });
}
