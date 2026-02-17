import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const SOURCE_HTML_ENTRY = '<script type="module" src="./frontend.tsx"></script>';

export function createProductionBrowserBuildConfig(outdir: string): Bun.BuildConfig {
  return {
    entrypoints: ["./src/frontend.tsx"],
    target: "browser",
    splitting: false,
    sourcemap: "none",
    minify: true,
    naming: {
      asset: "assets/[name].[ext]",
    },
    publicPath: "/",
    outdir,
    env: "BUN_PUBLIC_*",
    conditions: ["production", "browser", "module"],
    define: {
      "process.env.NODE_ENV": '"production"',
      "import.meta.env.DEV": "false",
      "import.meta.env.PROD": "true",
    },
    jsx: {
      development: false,
    },
  };
}

export function toNormalizedOutputPath(buildPath: string, normalizedOutdir: string) {
  const normalizedBuildPath = buildPath.replaceAll("\\", "/");

  if (normalizedBuildPath.startsWith(normalizedOutdir)) {
    return normalizedBuildPath.slice(normalizedOutdir.length);
  }

  if (normalizedBuildPath.startsWith("./")) {
    return normalizedBuildPath.slice(1);
  }

  if (normalizedBuildPath.startsWith("/")) {
    return normalizedBuildPath;
  }

  return `/${normalizedBuildPath}`;
}

export function resolveClientBundlePaths(outputs: Bun.BuildArtifact[], outdir: string) {
  const normalizedOutdir = resolve(outdir).replaceAll("\\", "/");
  const scriptArtifact =
    outputs.find((artifact) => artifact.kind === "entry-point" && artifact.path.endsWith(".js")) ??
    outputs.find((artifact) => artifact.path.endsWith(".js"));
  const styleArtifact = outputs.find((artifact) => artifact.path.endsWith(".css"));

  if (!scriptArtifact) {
    throw new Error("Missing JavaScript entry output for client bundle.");
  }

  return {
    scriptPath: toNormalizedOutputPath(scriptArtifact.path, normalizedOutdir),
    stylePath: styleArtifact ? toNormalizedOutputPath(styleArtifact.path, normalizedOutdir) : null,
  };
}

export async function createClientHtmlTemplate(scriptPath: string, stylePath: string | null) {
  const sourceHtml = await Bun.file("./src/index.html").text();
  const normalizedSourceHtml = sourceHtml.replace('href="./assets/logo.svg"', 'href="/assets/logo.svg"');
  const scriptTag = `<script type="module" src="${scriptPath}"></script>`;
  const styleTag = stylePath ? `<link rel="stylesheet" href="${stylePath}" />` : null;

  let html = normalizedSourceHtml.includes(SOURCE_HTML_ENTRY)
    ? normalizedSourceHtml.replace(SOURCE_HTML_ENTRY, scriptTag)
    : normalizedSourceHtml.includes("</body>")
      ? normalizedSourceHtml.replace("</body>", `    ${scriptTag}\n  </body>`)
      : `${normalizedSourceHtml}\n${scriptTag}\n`;

  if (styleTag) {
    html = html.includes("</head>")
      ? html.replace(/\s*<\/head>/, `\n    ${styleTag}\n  </head>`)
      : `${styleTag}\n${html}`;
  }

  return html;
}

export async function buildStaticFrontend() {
  const result = await Bun.build(createProductionBrowserBuildConfig("dist"));

  if (!result.success) {
    return result;
  }

  const { scriptPath, stylePath } = resolveClientBundlePaths(result.outputs, "dist");
  const html = await createClientHtmlTemplate(scriptPath, stylePath);
  await Bun.write("./dist/index.html", html);

  await mkdir("./dist/assets", { recursive: true });
  await cp("./src/assets", "./dist/assets", { recursive: true, force: true });

  return result;
}
