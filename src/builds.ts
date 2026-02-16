import { cp, mkdir } from "node:fs/promises";

export async function buildStaticFrontend() {
  const result = await Bun.build({
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

  if (!result.success) {
    return result;
  }

  await mkdir("./dist/assets", { recursive: true });
  await cp("./src/assets", "./dist/assets", { recursive: true, force: true });

  return result;
}
