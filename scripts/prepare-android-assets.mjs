#!/usr/bin/env node
/**
 * Prépare les ressources embarquées de l'application native Android (APK) :
 *  - Copie `info terminable MArtine.html` -> `android-app/app/src/main/assets/index.html`
 *  - Copie `live-vessels-86-87.json` -> `android-app/app/src/main/assets/live-vessels-86-87.json`
 *  - Télécharge et embarque en local (--bundle-vendor) Chart.js, Astronomy Engine et Three.js r128
 *    afin que le moteur 3D 360°, les marées et les éphémérides démarrent instantanément même hors-ligne.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const srcHtmlPath = path.join(repoRoot, "info terminable MArtine.html");
const srcVesselsPath = path.join(repoRoot, "live-vessels-86-87.json");
const assetsDir = path.join(repoRoot, "android-app", "app", "src", "main", "assets");
const vendorDir = path.join(assetsDir, "vendor");

const bundleVendor = process.argv.includes("--bundle-vendor");

fs.mkdirSync(vendorDir, { recursive: true });

const VENDOR_LIBS = [
  {
    originalTag: '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>',
    url: "https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js",
    fallbackUrl: "https://cdn.jsdelivr.net/npm/chart.js",
    file: "chart.umd.min.js",
  },
  {
    originalTag: '<script src="https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js"></script>',
    url: "https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js",
    fallbackUrl: "https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js",
    file: "astronomy.browser.min.js",
  },
  {
    originalTag: '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>',
    url: "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
    fallbackUrl: "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
    file: "three.min.js",
  },
];

let html = fs.readFileSync(srcHtmlPath, "utf8");

// Injecter le marqueur d'édition APK Android native dès <head>
const apkHeadBootstrap = `    <script>
      window.__FORCE_ANDROID_HUD = true;
      window.__IS_ANDROID_APK = true;
    </script>\n`;
html = html.replace("<head>\n", "<head>\n" + apkHeadBootstrap);

if (bundleVendor) {
  for (const lib of VENDOR_LIBS) {
    const destFile = path.join(vendorDir, lib.file);
    let ok = false;
    for (const candidateUrl of [lib.url, lib.fallbackUrl]) {
      try {
        execFileSync("curl", ["-fsSL", "--retry", "3", "--max-time", "25", "-o", destFile, candidateUrl], {
          stdio: "inherit",
        });
        const stat = fs.statSync(destFile);
        if (stat.size > 10000) {
          ok = true;
          console.log(`[APK Assets] Bundled ${lib.file} (${Math.round(stat.size / 1024)} KB)`);
          break;
        }
      } catch (err) {
        console.warn(`[APK Assets] Retry download failed for ${candidateUrl}: ${err.message}`);
      }
    }
    if (ok && html.includes(lib.originalTag)) {
      const replacement = `<script src="./vendor/${lib.file}" onerror="var s=document.createElement('script');s.src='${lib.fallbackUrl}';document.head.appendChild(s);"></script>`;
      html = html.replace(lib.originalTag, replacement);
    }
  }
}

const outHtmlPath = path.join(assetsDir, "index.html");
fs.writeFileSync(outHtmlPath, html, "utf8");
console.log(`[APK Assets] Wrote ${outHtmlPath} (${Math.round(Buffer.byteLength(html) / 1024)} KB)`);

if (fs.existsSync(srcVesselsPath)) {
  const outVesselsPath = path.join(assetsDir, "live-vessels-86-87.json");
  fs.copyFileSync(srcVesselsPath, outVesselsPath);
  console.log(`[APK Assets] Copied live-vessels-86-87.json`);
}
