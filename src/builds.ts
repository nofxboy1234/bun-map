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
