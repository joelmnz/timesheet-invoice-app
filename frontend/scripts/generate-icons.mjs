/**
 * How to use (one-off icon generation)
 *
 * Prereqs:
 * - From the frontend folder, install the generator once:
 *   bun add -D pwa-asset-generator
 *
 * Quick start (recommended):
 * - Place your source logo at ./public/logo.svg (SVG preferred), or pass --src
 * - Run:
 *   bun run generate:icons
 *   # or directly
 *   bun scripts/generate-icons.mjs --src ./public/logo.svg
 *
 * What this does:
 * - Calls pwa-asset-generator to create PWA icons into ./public
 * - Picks 192x192 and 512x512 and saves them as:
 *   ./public/icon-192.png
 *   ./public/icon-512.png
 * - If the source logo is missing and --no-fallback is not provided,
 *   it creates a simple placeholder SVG using the theme color (#228be6).
 *
 * Options:
 *   --src <path>         Path to source logo (SVG/PNG). Default: ./public/logo.svg
 *   --out <dir>          Output directory. Default: ./public
 *   --padding <value>    Padding around the icon (e.g., "12%" ). Default: 12%
 *   --background <hex>   Background color (e.g., #228be6). Default: #228be6
 *   --no-fallback        Do not auto-create a placeholder if src is missing
 *
 * Notes:
 * - Your manifest already references /icon-192.png and /icon-512.png
 * - After running, reload the app and verify in DevTools → Application → Manifest
 */

import { existsSync, mkdirSync, readdirSync, writeFileSync, copyFileSync } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";

function parseArgs(argv) {
  const args = {
    src: "./public/logo.svg",
    out: "./public",
    padding: "12%",
    background: "#228be6",
    noFallback: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--src" && argv[i + 1]) args.src = argv[++i];
    else if (a === "--out" && argv[i + 1]) args.out = argv[++i];
    else if (a === "--padding" && argv[i + 1]) args.padding = argv[++i];
    else if (a === "--background" && argv[i + 1]) args.background = argv[++i];
    else if (a === "--no-fallback") args.noFallback = true;
  }
  return args;
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function createPlaceholderSVG(svgPath, bg) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <clipPath id="squircle">
      <rect x="32" y="32" width="448" height="448" rx="96" ry="96" />
    </clipPath>
  </defs>
  <rect width="100%" height="100%" fill="${bg}"/>
  <g clip-path="url(#squircle)">
    <rect x="32" y="32" width="448" height="448" fill="${bg}"/>
  </g>
  <g font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Segoe UI Emoji'" font-size="200" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="central">
    <text x="256" y="268" style="letter-spacing:2px">TS</text>
  </g>
</svg>`;
  ensureDir(dirname(svgPath));
  writeFileSync(svgPath, svg, "utf8");
}

function findLocalBin(binName) {
  const binPath = resolve(process.cwd(), "node_modules/.bin/" + binName);
  return existsSync(binPath) ? binPath : null;
}

function runPwaAssetGenerator(src, out, padding, background) {
  const bin = findLocalBin("pwa-asset-generator");
  if (!bin) {
    console.error("\nERROR: pwa-asset-generator is not installed.\nInstall it with:\n  bun add -D pwa-asset-generator\n");
    process.exit(1);
  }

  const args = [
    src,
    out,
    "--padding",
    padding,
    "--background",
    background,
    "--path",
    "/",
    "--favicon",
    // Generate icons and other assets; we'll pick files we need afterwards.
    // If your version supports it, you may add: "--icon-only"
  ];

  const res = spawnSync(bin, args, { stdio: "inherit" });
  if (res.status !== 0) {
    console.error("\nERROR: pwa-asset-generator failed.");
    process.exit(res.status ?? 1);
  }
}

function copySizedIcons(outDir) {
  const files = readdirSync(outDir);
  const map = {};
  for (const f of files) {
    const lower = f.toLowerCase();
    // Common patterns from pwa-asset-generator
    if (lower.includes("manifest-icon-192") && lower.endsWith(".png")) {
      // prefer maskable if multiple
      if (!map["192"] || lower.includes("maskable")) map["192"] = f;
    }
    if (lower.includes("manifest-icon-512") && lower.endsWith(".png")) {
      if (!map["512"] || lower.includes("maskable")) map["512"] = f;
    }
    // Fallback patterns
    if (lower.endsWith("192x192.png")) map["192"] = f;
    if (lower.endsWith("512x512.png")) map["512"] = f;
  }

  if (!map["192"] || !map["512"]) {
    console.warn("\nWARN: Could not find generated 192 or 512 icons automatically.");
    console.warn("Look for manifest-icon-192*.png and manifest-icon-512*.png in:", outDir);
    return false;
  }

  const target192 = join(outDir, "icon-192.png");
  const target512 = join(outDir, "icon-512.png");
  copyFileSync(join(outDir, map["192"]), target192);
  copyFileSync(join(outDir, map["512"]), target512);
  console.log(`\nSaved: ${relative(process.cwd(), target192)} and ${relative(process.cwd(), target512)}`);
  return true;
}

function ensureAppleTouchIcon(outDir) {
  const applePath = join(outDir, "apple-touch-icon.png");
  if (existsSync(applePath)) return true;
  const files = readdirSync(outDir);
  // Try to find a 180x180 icon and copy it
  const candidate = files.find((f) => f.toLowerCase().includes("180x180") && f.toLowerCase().endsWith(".png"));
  if (candidate) {
    copyFileSync(join(outDir, candidate), applePath);
    console.log(`Saved: ${relative(process.cwd(), applePath)}`);
    return true;
  }
  // Try typical generated name
  const appleGenerated = files.find((f) => f.toLowerCase().includes("apple") && f.toLowerCase().endsWith(".png"));
  if (appleGenerated) {
    copyFileSync(join(outDir, appleGenerated), applePath);
    console.log(`Saved: ${relative(process.cwd(), applePath)}`);
    return true;
  }
  console.warn("\nWARN: Could not ensure apple-touch-icon.png; please check generated files.");
  return false;
}

function checkFavicon(outDir) {
  const ico = join(outDir, "favicon.ico");
  if (existsSync(ico)) {
    console.log(`Found favicon: ${relative(process.cwd(), ico)}`);
    return true;
  }
  console.warn("\nWARN: favicon.ico not found. The generator may have failed to create it. You can re-run with a different source or generate favicons with RealFaviconGenerator.");
  return false;
}

(function main() {
  const cwd = process.cwd();
  const args = parseArgs(process.argv.slice(2));
  const srcPath = resolve(cwd, args.src);
  const outDir = resolve(cwd, args.out);

  ensureDir(outDir);

  if (!existsSync(srcPath)) {
    if (args.noFallback) {
      console.error(`\nERROR: Source not found: ${args.src}`);
      process.exit(1);
    }
    console.log(`Source not found at ${args.src}. Creating a placeholder SVG...`);
    createPlaceholderSVG(srcPath, args.background);
  }

  console.log("\nGenerating icons with pwa-asset-generator...");
  runPwaAssetGenerator(srcPath, outDir, args.padding, args.background);

  const ok = copySizedIcons(outDir);
  if (!ok) {
    console.log("\nYou may manually rename the generated files to icon-192.png and icon-512.png.");
  }

  ensureAppleTouchIcon(outDir);
  checkFavicon(outDir);

  console.log("\nDone.");
})();
