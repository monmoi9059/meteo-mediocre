#!/usr/bin/env node
/**
 * Génère l'édition ultra-légère « info terminable MArtine - Lite.html »
 * optimisée pour les PC lents / anciens (GPU intégré Intel HD, Celeron/i3, Citrix/RDP, 4–8 Go RAM),
 * tout en conservant 100 % des fonctions opérationnelles (Météo réelle, Marées Lauzon #03250,
 * Navires en direct 86 & 87, Manœuvres automatiques ETA/ETD des remorqueurs, Calculateurs,
 * Timer Chiksan/Universel et Template Quart de Travail intact).
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const srcPath = path.join(repoRoot, "info terminable MArtine.html");
const outPath = path.join(repoRoot, "info terminable MArtine - Lite.html");

const srcHtml = fs.readFileSync(srcPath, "utf8");
let html = srcHtml;

function replaceExact(target, replacement, label) {
  const idx = html.indexOf(target);
  if (idx === -1) {
    throw new Error(`[Lite Builder] Target not found for: ${label}`);
  }
  const secondIdx = html.indexOf(target, idx + target.length);
  if (secondIdx !== -1) {
    throw new Error(`[Lite Builder] Target matched multiple times for: ${label}`);
  }
  html = html.slice(0, idx) + replacement + html.slice(idx + target.length);
}

// Extract #template-modal before edits to assert 100% byte-for-byte preservation at the end
const extractTemplateModal = (s) => {
  const start = s.indexOf('<div id="template-modal"');
  const end = s.indexOf('<div id="image-modal"', start);
  assert.ok(start > 0 && end > start, "Could not locate #template-modal boundaries");
  return s.slice(start, end);
};
const origTemplateModal = extractTemplateModal(srcHtml);

// 1. Titre, Polices allégées (2 familles au lieu de 12 / ~42 fichiers WOFF2) & Bootstrap Édition Lite + Chart.js sans animation
replaceExact(
  "<title>Monitoring Terminal Maritime St-Romuald (Lévis) — Command Center PRO</title>",
  "<title>Monitoring Terminal Maritime St-Romuald (Lévis) — Édition LITE (PC Léger)</title>",
  "Document <title>"
);

replaceExact(
  `    <link
      href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Cinzel:wght@600;700;800;900&family=Crimson+Pro:ital,wght@0,400;0,600;0,700;1,600&family=Exo+2:ital,wght@0,600;0,700;0,800;1,700;1,800&family=IBM+Plex+Mono:wght@400;600;700&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&family=Orbitron:wght@500;700;800;900&family=Share+Tech+Mono&family=Space+Grotesk:wght@500;600;700&family=Space+Mono:wght@400;700&family=VT323&display=swap"
      rel="stylesheet"
    />`,
  `    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;800&family=JetBrains+Mono:wght@600;800&display=swap"
      rel="stylesheet"
    />`,
  "Google Fonts slimming"
);

replaceExact(
  `<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>`,
  `<script>
      window.__LITE_PC_EDITION = true;
      window.__litePerfMode = localStorage.getItem("stromuald_lite_perf_mode") || "3d_lite"; // "3d_lite" | "2d_eco" | "paused"
      window.__liteViewportPaused = window.__litePerfMode === "paused";
      window.__liteAnimInView = true;
      document.documentElement.classList.add("lite-pc-edition");
    </script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
      if (typeof Chart !== "undefined" && Chart.defaults) {
        Chart.defaults.animation = false;
        Chart.defaults.responsiveAnimationDuration = 0;
        if (Chart.defaults.transitions && Chart.defaults.transitions.active) {
          Chart.defaults.transitions.active.animation = { duration: 0 };
        }
      }
    </script>`,
  "Lite head bootstrap & Chart.js zero-animation"
);

// 2. Suppression de tous les backdrop-filter: blur(...) dans le <style> principal + CSS Lite
const mainHeadEndIdx = html.indexOf("  </head>\n  <body>");
assert.ok(mainHeadEndIdx > 0, "Could not locate main </head>");
html =
  html.slice(0, mainHeadEndIdx).replace(/(?:-webkit-)?backdrop-filter\s*:\s*[^;]+;/gi, "/* lite: no-blur */") +
  html.slice(mainHeadEndIdx);

const liteCssBlock = `
      /* ==========================================================================
         OPTIMISATIONS COMPOSITEUR — ÉDITION LITE (PC LENT / GPU INTÉGRÉ / RDP)
         ========================================================================== */
      html.lite-pc-edition *,
      html.lite-pc-edition *::before,
      html.lite-pc-edition *::after {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
      html.lite-pc-edition #dynamic-bg,
      html.lite-pc-edition .telemetry-dot,
      html.lite-pc-edition .status-dot {
        animation: none !important;
      }
      html.lite-pc-edition .universe-crt-overlay,
      html.lite-pc-edition #universe-hud-frame {
        display: none !important;
      }
      /* Surfaces opaques nettes pour remplacer le flou gaussien GPU (s'adapte à Jour, Nuit & 6 Univers!) */
      html.lite-pc-edition .card {
        background: var(--card-bg-solid) !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.26) !important;
      }
      html.lite-pc-edition .viewport-telemetry,
      html.lite-pc-edition .hud-pill-btn,
      html.lite-pc-edition .weather-minimap-hud,
      html.lite-pc-edition .tug-maneuver-hud,
      html.lite-pc-edition .temp-simulation-hud,
      html.lite-pc-edition .inspect-3d-popup {
        background: rgba(7, 15, 28, 0.94) !important;
        box-shadow: none !important;
      }
      /* En mode 2D Éco, couper les animations SVG infinies secondaires pour tomber à ~1 % CPU */
      html.lite-pc-edition #shore-layer svg * {
        animation: none !important;
      }
      .lite-edition-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.22rem;
        margin-left: 0.4rem;
        padding: 0.08rem 0.42rem;
        border-radius: 999px;
        font-size: 0.62rem;
        font-weight: 800;
        letter-spacing: 0.04em;
        background: rgba(16, 185, 129, 0.16);
        border: 1px solid #10b981;
        color: #10b981;
        vertical-align: middle;
      }
      #lite-perf-mode-btn {
        border-color: #10b981 !important;
        color: #10b981 !important;
        font-weight: 800 !important;
      }
      #lite-perf-mode-btn[data-mode="2d_eco"] {
        border-color: #38bdf8 !important;
        color: #38bdf8 !important;
      }
      #lite-perf-mode-btn[data-mode="paused"] {
        border-color: #f59e0b !important;
        color: #fbbf24 !important;
      }
      .lite-paused-banner {
        position: absolute;
        inset: auto 0 0 0;
        z-index: 35;
        display: none;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.38rem 0.65rem;
        background: rgba(6, 14, 26, 0.92);
        border-top: 1px solid rgba(245, 158, 11, 0.55);
        color: #fde68a;
        font-size: 0.68rem;
        font-weight: 700;
      }
      .lite-paused-banner.visible {
        display: flex;
      }
      .lite-map-standby {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 0.55rem;
        padding: 1rem;
        flex: 1;
        width: 100%;
        height: 100%;
        background: var(--card-bg-solid);
        color: var(--text);
      }
      .lite-map-standby-btns {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.4rem;
        margin-top: 0.2rem;
      }
    </style>
  </head>
  <body>`;

replaceExact("    </style>\n  </head>\n  <body>", liteCssBlock, "Inject Lite CSS block");

// 3. Badge LITE dans l'en-tête + Lien retour vers Version Complète HD + Sélecteur 1-clic de mode performance Aperçu
replaceExact(
  `<span id="header-main-title-span">&#x2693; Terminal St-Romuald (L&eacute;vis)</span>`,
  `<span id="header-main-title-span">&#x2693; Terminal St-Romuald (L&eacute;vis)</span><span class="lite-edition-badge" title="Édition allégée pour PC lent : 0 flou GPU, 0 PointLight GLSL, 0 ombre portée, eau 3D 15x plus légère, cartes externes à la demande">&#x26A1; LITE</span>`,
  "Header LITE badge"
);

replaceExact(
  `        <a id="lite-edition-link" href="./info%20terminable%20MArtine%20-%20Lite.html" class="theme-toggle" style="border-color: #38bdf8; color: #38bdf8; font-weight: 800; text-decoration: none; display: inline-flex; align-items: center; gap: 0.3rem" title="Ouvrir la Version Lite ultra-légère pour PC lent / sans carte graphique dédiée">
          ⚡ Version Lite (PC Lent)
        </a>`,
  `        <a id="full-edition-link" href="./info%20terminable%20MArtine.html" class="theme-toggle" style="border-color: #f59e0b; color: #fbbf24; font-weight: 800; text-decoration: none; display: inline-flex; align-items: center; gap: 0.3rem" title="Ouvrir la Version Complète HD / Ultra (pour PC récent avec carte graphique)">
          🖥️ Version Complète HD
        </a>`,
  "Header link to Full HD edition"
);

replaceExact(
  `              <button id="stars-mode-toggle" class="theme-toggle" title="Afficher les étoiles et constellations même de jour">`,
  `              <button type="button" id="lite-perf-mode-btn" class="theme-toggle" data-mode="3d_lite" title="Basculer le niveau d'économie CPU/GPU : 3D Lite (24 FPS) → 2D Sans WebGL (15 FPS) → Pause Aperçu (0% CPU)">
                ⚡ 3D Lite (24fps)
              </button>
              <button id="stars-mode-toggle" class="theme-toggle" title="Afficher les étoiles et constellations même de jour">`,
  "Apercu header #lite-perf-mode-btn"
);

replaceExact(
  `                <button type="button" class="hud-pill-btn" id="hud-toggle-quality" title="Qualit&eacute; &amp; R&eacute;solution 3D — Basculer HD (1.65x) &rarr; Ultra (2.0x + Ombres 2K) &rarr; &Eacute;co (0.75x)">
                  &#x1F5A5;&#xFE0F; Qualit&eacute;: HD
                </button>`,
  `                <button type="button" class="hud-pill-btn active" id="hud-toggle-quality" title="R&eacute;solution 3D Lite — Basculer Lite (0.70x) &rarr; Ultra-&Eacute;co (0.50x) &rarr; Net (1.0x)">
                  &#x26A1; Qualit&eacute;: Lite
                </button>`,
  "HUD initial quality button label"
);

// Ajouter la bannière d'aperçu en pause dans #animation-window
replaceExact(
  `            <div id="universe-hud-frame" class="universe-hud-frame" aria-hidden="true"></div>`,
  `            <div id="universe-hud-frame" class="universe-hud-frame" aria-hidden="true"></div>
            <div id="lite-paused-banner" class="lite-paused-banner">
              <span>⏸️ Aperçu en pause (0 % CPU / GPU) — Toutes les données météo, marées et navires 86/87 restent en direct</span>
              <button type="button" id="lite-resume-view-btn" class="theme-toggle" style="border-color:#10b981;color:#10b981;font-weight:800;padding:0.1rem 0.45rem;">▶️ Reprendre</button>
            </div>`,
  "Lite paused banner inside #animation-window"
);

// 4. Cartes externes AIS / Windy / Blitzortung en chargement à la demande (Click-to-Load = -300 Mo RAM au démarrage!)
replaceExact(
  `              <button
                id="map-fullscreen-btn"`,
  `              <button
                id="btn-map-standby"
                class="theme-toggle"
                style="padding: 0.2rem 0.45rem; font-size: 0.68rem; display: none; border-color: #f59e0b; color: #fbbf24"
                title="Décharger la carte externe pour libérer la mémoire RAM et le processeur"
              >
                ⏹️ Veille RAM
              </button>
              <button
                id="map-fullscreen-btn"`,
  "Map standby RAM button"
);

replaceExact(
  `            <!-- Iframe AIS -->
            <iframe
              id="ais-map"
              src="https://www.marinetraffic.com/en/ais/embed/zoom:13/centery:46.7600/centerx:-71.2300/maptype:4/shownames:true/mmsi:0/shipid:0/fleet:/fleet_id:/vtypes:/showmenu:/remember:false"
              width="100%"
              style="border: none; flex: 1; height: 100%"
              loading="lazy"
            ></iframe>
            <!-- Iframe Météo (Windy) -->
            <iframe
              id="meteo-map"
              src="https://embed.windy.com/embed2.html?lat=46.760&lon=-71.230&detailLat=46.760&detailLon=-71.230&width=650&height=450&zoom=11&level=surface&overlay=wind&product=ecmwf&menu=&message=true&marker=&calendar=now&pressure=true&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1"
              width="100%"
              style="border: none; flex: 1; height: 100%; display: none"
              loading="lazy"
            ></iframe>
            <!-- Iframe Foudre (Blitzortung) -->
            <iframe
              id="foudre-map"
              src="https://map.blitzortung.org/#7/46.76/-71.23"
              width="100%"
              style="border: none; flex: 1; height: 100%; display: none"
              loading="lazy"
            ></iframe>`,
  `            <!-- Panneau Veille RAM (Édition Lite : 0 Mo RAM tant qu'une carte externe n'est pas demandée) -->
            <div id="lite-map-standby-panel" class="lite-map-standby">
              <div style="font-size: 0.82rem; font-weight: 800; color: #10b981;">⚡ Mode PC Léger — Carte externe en veille (0 Mo RAM)</div>
              <div style="font-size: 0.68rem; color: var(--text-light); max-width: 420px; line-height: 1.38;">
                Les cartes lourdes tierces (MarineTraffic / Windy) ne sont chargées qu'au clic pour garder l'ordinateur fluide.
                <em>(Les navires des Postes 86 &amp; 87 et le radar local restent actifs en temps réel.)</em>
              </div>
              <div class="lite-map-standby-btns">
                <button type="button" class="theme-toggle" data-load-ext-map="ais" style="border-color:#38bdf8;color:#38bdf8;font-weight:800;padding:0.28rem 0.6rem;">🚢 Charger AIS MarineTraffic</button>
                <button type="button" class="theme-toggle" data-load-ext-map="meteo" style="border-color:#10b981;color:#10b981;font-weight:700;padding:0.28rem 0.6rem;">💨 Charger Windy</button>
                <button type="button" class="theme-toggle" data-load-ext-map="foudre" style="border-color:#f59e0b;color:#fbbf24;font-weight:700;padding:0.28rem 0.6rem;">⚡ Charger Foudre</button>
              </div>
            </div>
            <!-- Iframe AIS (Chargement à la demande) -->
            <iframe
              id="ais-map"
              src="about:blank"
              data-lazy-src="https://www.marinetraffic.com/en/ais/embed/zoom:13/centery:46.7600/centerx:-71.2300/maptype:4/shownames:true/mmsi:0/shipid:0/fleet:/fleet_id:/vtypes:/showmenu:/remember:false"
              width="100%"
              style="border: none; flex: 1; height: 100%; display: none"
              loading="lazy"
            ></iframe>
            <!-- Iframe Météo (Windy — Chargement à la demande) -->
            <iframe
              id="meteo-map"
              src="about:blank"
              data-lazy-src="https://embed.windy.com/embed2.html?lat=46.760&lon=-71.230&detailLat=46.760&detailLon=-71.230&width=650&height=450&zoom=11&level=surface&overlay=wind&product=ecmwf&menu=&message=true&marker=&calendar=now&pressure=true&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1"
              width="100%"
              style="border: none; flex: 1; height: 100%; display: none"
              loading="lazy"
            ></iframe>
            <!-- Iframe Foudre (Blitzortung — Chargement à la demande) -->
            <iframe
              id="foudre-map"
              src="about:blank"
              data-lazy-src="https://map.blitzortung.org/#7/46.76/-71.23"
              width="100%"
              style="border: none; flex: 1; height: 100%; display: none"
              loading="lazy"
            ></iframe>`,
  "Click-to-Load external map iframes"
);

replaceExact(
  `      function resetMaps() {
        aisMap.style.display = "none";
        meteoMap.style.display = "none";
        foudreMap.style.display = "none";
        [btnMapAis, btnMapMeteo, btnMapFoudre].forEach((b) =>
          b.classList.remove("active")
        );
      }

      btnMapAis.addEventListener("click", () => {
        resetMaps();
        aisMap.style.display = "block";
        mapTitle.textContent = (UNIVERSE_CONFIGS[currentUniverse] || UNIVERSE_CONFIGS.classic).titles.mapAis;
        btnMapAis.classList.add("active");
      });

      btnMapMeteo.addEventListener("click", () => {
        resetMaps();
        meteoMap.style.display = "block";
        mapTitle.textContent = "🌬️ Radar Météo & Vents (Windy)";
        btnMapMeteo.classList.add("active");
      });

      btnMapFoudre.addEventListener("click", () => {
        resetMaps();
        foudreMap.style.display = "block";
        mapTitle.textContent = "⚡ Carte de Foudre en Direct (Blitzortung)";
        btnMapFoudre.classList.add("active");
      });`,
  `      const liteMapStandbyPanel = document.getElementById("lite-map-standby-panel");
      const btnMapStandby = document.getElementById("btn-map-standby");
      btnMapAis.classList.remove("active");

      function ensureLazyIframeLoaded(iframeEl) {
        if (!iframeEl) return;
        const targetUrl = iframeEl.getAttribute("data-lazy-src");
        if (targetUrl && (!iframeEl.src || iframeEl.src === "about:blank" || iframeEl.getAttribute("src") === "about:blank")) {
          iframeEl.src = targetUrl;
        }
        if (liteMapStandbyPanel) liteMapStandbyPanel.style.display = "none";
        if (btnMapStandby) btnMapStandby.style.display = "inline-flex";
      }

      function unloadAllExternalMapsToStandby() {
        [aisMap, meteoMap, foudreMap].forEach((ifr) => {
          if (!ifr) return;
          ifr.style.display = "none";
          ifr.src = "about:blank";
        });
        [btnMapAis, btnMapMeteo, btnMapFoudre].forEach((b) => b?.classList.remove("active"));
        if (liteMapStandbyPanel) liteMapStandbyPanel.style.display = "flex";
        if (btnMapStandby) btnMapStandby.style.display = "none";
        mapTitle.textContent = (UNIVERSE_CONFIGS[currentUniverse] || UNIVERSE_CONFIGS.classic).titles.mapAis;
      }

      function resetMaps() {
        aisMap.style.display = "none";
        meteoMap.style.display = "none";
        foudreMap.style.display = "none";
        [btnMapAis, btnMapMeteo, btnMapFoudre].forEach((b) =>
          b.classList.remove("active")
        );
      }

      function activateLiteExternalMap(kind) {
        resetMaps();
        if (kind === "ais") {
          ensureLazyIframeLoaded(aisMap);
          aisMap.style.display = "block";
          mapTitle.textContent = (UNIVERSE_CONFIGS[currentUniverse] || UNIVERSE_CONFIGS.classic).titles.mapAis;
          btnMapAis.classList.add("active");
        } else if (kind === "meteo") {
          ensureLazyIframeLoaded(meteoMap);
          meteoMap.style.display = "block";
          mapTitle.textContent = "🌬️ Radar Météo & Vents (Windy)";
          btnMapMeteo.classList.add("active");
        } else if (kind === "foudre") {
          ensureLazyIframeLoaded(foudreMap);
          foudreMap.style.display = "block";
          mapTitle.textContent = "⚡ Carte de Foudre en Direct (Blitzortung)";
          btnMapFoudre.classList.add("active");
        }
      }

      btnMapAis.addEventListener("click", () => activateLiteExternalMap("ais"));
      btnMapMeteo.addEventListener("click", () => activateLiteExternalMap("meteo"));
      btnMapFoudre.addEventListener("click", () => activateLiteExternalMap("foudre"));
      btnMapStandby?.addEventListener("click", () => unloadAllExternalMapsToStandby());
      document.querySelectorAll("[data-load-ext-map]").forEach((btn) => {
        btn.addEventListener("click", () => activateLiteExternalMap(btn.getAttribute("data-load-ext-map")));
      });`,
  "Lazy external map JS handlers"
);

// 5. Élagage astronomique de starCatalog (~5 040 étoiles -> ~450 étoiles brillantes visibles à 46.76°N : dec >= -44° & mag <= 4.35)
const starStartMarker = "      const starCatalog = [\n";
const starEndMarker = "      ];\n      const planetConfig = [";
const starStartIdx = html.indexOf(starStartMarker);
const starEndIdx = html.indexOf(starEndMarker, starStartIdx);
assert.ok(starStartIdx > 0 && starEndIdx > starStartIdx, "Could not locate starCatalog block");
const rawStarBody = html.slice(starStartIdx + starStartMarker.length, starEndIdx);
const keptStarLines = [];
let totalStars = 0;
for (const line of rawStarBody.split("\n")) {
  const m = line.match(/ra:\s*([-\d.]+),\s*dec:\s*([-\d.]+),\s*mag:\s*([-\d.]+)/);
  if (!m) continue;
  totalStars++;
  const dec = parseFloat(m[2]);
  const mag = parseFloat(m[3]);
  if (dec >= -44 && mag <= 4.35) {
    keptStarLines.push(line);
  }
}
assert.ok(keptStarLines.length >= 300 && keptStarLines.length <= 900, `Unexpected kept stars count: ${keptStarLines.length}`);
html =
  html.slice(0, starStartIdx) +
  starStartMarker +
  keptStarLines.join("\n") +
  "\n" +
  html.slice(starEndIdx);
console.log(`[Lite Builder] Pruned starCatalog from ${totalStars} -> ${keptStarLines.length} visible northern stars`);

// 6. Mise en veille intelligente des 4 boucles 2D (drawSkyFX, animateBoatAndWaves, drawWeatherFX, updateDebrisFX)
replaceExact(
  `        if (window.mode3DActive && !starsModeActive) {
          requestAnimationFrame(drawSkyFX);
          return;
        }`,
  `        if (document.hidden || window.__liteViewportPaused || !window.__liteAnimInView || (window.mode3DActive && !starsModeActive)) {
          setTimeout(drawSkyFX, 360);
          return;
        }`,
  "drawSkyFX idle sleep"
);

replaceExact(
  `        requestAnimationFrame(drawSkyFX);
      }
      drawSkyFX();`,
  `        setTimeout(() => requestAnimationFrame(drawSkyFX), 50);
      }
      drawSkyFX();`,
  "drawSkyFX 20fps pacing"
);

replaceExact(
  `      function animateBoatAndWaves() {`,
  `      function animateBoatAndWaves() {
        if (document.hidden || window.__liteViewportPaused || !window.__liteAnimInView) {
          setTimeout(animateBoatAndWaves, 360);
          return;
        }`,
  "animateBoatAndWaves pause guard"
);

replaceExact(
  `        requestAnimationFrame(animateBoatAndWaves);
      }
      requestAnimationFrame(animateBoatAndWaves);`,
  `        setTimeout(animateBoatAndWaves, window.mode3DActive ? 90 : 50);
      }
      requestAnimationFrame(animateBoatAndWaves);`,
  "animateBoatAndWaves low-CPU pacing"
);

replaceExact(
  `      function drawWeatherFX() {
        wCtx.clearRect(0, 0, W, H);`,
  `      function drawWeatherFX() {
        if (document.hidden || window.__liteViewportPaused || !window.__liteAnimInView || window.mode3DActive) {
          if (lensWetAlpha3D > 0) {
            lensWetAlpha3D = 0;
            wCtx.clearRect(0, 0, W, H);
          }
          setTimeout(drawWeatherFX, 450);
          return;
        }
        wCtx.clearRect(0, 0, W, H);`,
  "drawWeatherFX 3D/pause zero-CPU sleep"
);

replaceExact(
  `        requestAnimationFrame(drawWeatherFX);
      }
      drawWeatherFX();`,
  `        setTimeout(() => requestAnimationFrame(drawWeatherFX), 55);
      }
      drawWeatherFX();`,
  "drawWeatherFX 18fps pacing in 2D"
);

replaceExact(
  `      function updateDebrisFX() {
        if (window.mode3DActive) {
          requestAnimationFrame(updateDebrisFX);
          return;
        }`,
  `      function updateDebrisFX() {
        if (document.hidden || window.__liteViewportPaused || !window.__liteAnimInView || window.mode3DActive) {
          setTimeout(updateDebrisFX, 600);
          return;
        }`,
  "updateDebrisFX sleep in 3D/pause"
);

replaceExact(
  `        requestAnimationFrame(updateDebrisFX);
      }
      requestAnimationFrame(updateDebrisFX);`,
  `        setTimeout(() => requestAnimationFrame(updateDebrisFX), 60);
      }
      requestAnimationFrame(updateDebrisFX);`,
  "updateDebrisFX 16fps pacing in 2D"
);

// 7. Pipeline WebGL 3D Lite (0 MSAA, low-power, 0.70x DPR, 0 shadowMap, 0 toneMapping, 0 envMap IBL, repli 2D gracieux si pas de WebGL!)
replaceExact(
  `      (function init3DMaritimeWorld() {
        const canvas3D = document.getElementById("webgl-3d-canvas");
        if (!canvas3D || typeof THREE === "undefined") return;

        const renderer = new THREE.WebGLRenderer({
          canvas: canvas3D,
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        });

        let qualityTier3D = "hd"; // "hd" (1.65x) | "ultra" (2.0x + ombres 2048) | "eco" (0.75x)
        function getTargetPixelRatio() {
          const dpr = window.devicePixelRatio || 1;
          if (qualityTier3D === "eco") return Math.min(dpr * 0.75, 0.75);
          if (qualityTier3D === "ultra") return Math.min(dpr, 2.0);
          return Math.min(dpr, 1.65);
        }
        renderer.setPixelRatio(getTargetPixelRatio());
        renderer.setSize(getAnimW(), getAnimH());
        renderer.shadowMap.enabled = true;
        if (typeof THREE.PCFSoftShadowMap !== "undefined") {
          renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        if (typeof THREE.ACESFilmicToneMapping !== "undefined") {
          renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 1.18;
        }`,
  `      (function init3DMaritimeWorld() {
        const canvas3D = document.getElementById("webgl-3d-canvas");
        const litePerfBtn = document.getElementById("lite-perf-mode-btn");
        const litePausedBanner = document.getElementById("lite-paused-banner");
        const liteResumeBtn = document.getElementById("lite-resume-view-btn");
        let webglAvailable = false;

        function applyLitePerfMode(mode, save = true) {
          if (mode === "3d_lite" && !webglAvailable) mode = "2d_eco";
          window.__litePerfMode = mode;
          window.__liteViewportPaused = mode === "paused";
          if (save) {
            try { localStorage.setItem("stromuald_lite_perf_mode", mode); } catch (e) {}
          }
          const use3D = mode === "3d_lite" && webglAvailable;
          window.mode3DActive = use3D;
          if (animWinEl) animWinEl.classList.toggle("mode-3d-active", use3D);
          if (canvas3D) canvas3D.style.display = use3D ? "block" : "none";
          const t3dBtn = document.getElementById("hud-toggle-3d");
          if (t3dBtn) {
            t3dBtn.textContent = use3D ? "🌐 3D: ON" : "🖼️ Mode: 2D";
            t3dBtn.classList.toggle("active-cam", use3D);
          }
          if (litePausedBanner) litePausedBanner.classList.toggle("visible", mode === "paused");
          if (litePerfBtn) {
            litePerfBtn.setAttribute("data-mode", mode);
            if (mode === "3d_lite") litePerfBtn.textContent = "⚡ 3D Lite (24fps)";
            else if (mode === "2d_eco") litePerfBtn.textContent = "🔋 2D Sans WebGL";
            else litePerfBtn.textContent = "⏸️ Pause (0% CPU)";
          }
          if (typeof window.syncLandmarkButtonsMode === "function") window.syncLandmarkButtonsMode();
        }
        window.applyLitePerfMode = applyLitePerfMode;

        if (litePerfBtn) {
          litePerfBtn.addEventListener("click", () => {
            const order = webglAvailable ? ["3d_lite", "2d_eco", "paused"] : ["2d_eco", "paused"];
            const next = order[(order.indexOf(window.__litePerfMode) + 1) % order.length];
            applyLitePerfMode(next, true);
          });
        }
        liteResumeBtn?.addEventListener("click", () => {
          applyLitePerfMode(webglAvailable ? "3d_lite" : "2d_eco", true);
        });

        if (typeof IntersectionObserver !== "undefined" && animWinEl) {
          const ioLite = new IntersectionObserver((entries) => {
            if (entries && entries[0]) window.__liteAnimInView = entries[0].isIntersecting;
          }, { threshold: 0.02 });
          ioLite.observe(animWinEl);
        }

        if (!canvas3D || typeof THREE === "undefined") {
          applyLitePerfMode("2d_eco", false);
          return;
        }

        let renderer = null;
        try {
          renderer = new THREE.WebGLRenderer({
            canvas: canvas3D,
            antialias: false,
            alpha: true,
            stencil: false,
            powerPreference: "low-power",
          });
          webglAvailable = true;
        } catch (webglErr) {
          console.warn("[Lite Edition] WebGL unavailable on this PC — switching cleanly to 2D Sans WebGL mode:", webglErr);
          applyLitePerfMode("2d_eco", false);
          return;
        }

        function createLiteDummyPointLight(colorHex, intensity = 0, distance = 0) {
          const obj = new THREE.Object3D();
          obj.color = new THREE.Color(colorHex || 0xffffff);
          obj.intensity = intensity;
          obj.distance = distance;
          return obj;
        }

        let qualityTier3D = "eco"; // "eco" (0.70x Lite) | "ultra" (0.50x Ultra-Éco) | "hd" (1.0x Net)
        function getTargetPixelRatio() {
          const dpr = window.devicePixelRatio || 1;
          if (qualityTier3D === "ultra") return 0.50;
          if (qualityTier3D === "eco") return Math.min(dpr, 0.70);
          return Math.min(dpr, 1.0);
        }
        renderer.setPixelRatio(getTargetPixelRatio());
        renderer.setSize(getAnimW(), getAnimH());
        renderer.shadowMap.enabled = false;
        if (typeof THREE.NoToneMapping !== "undefined") {
          renderer.toneMapping = THREE.NoToneMapping;
        }
        applyLitePerfMode(window.__litePerfMode || "3d_lite", false);`,
  "WebGLRenderer Lite initialization & 3-mode perf switcher"
);

// Couper scene.environment PBR CubeMap IBL et les ombres directionnelles
replaceExact(
  `        let activeEnvKey = "day";
        scene.environment = envCubeMaps.day;`,
  `        let activeEnvKey = "day";
        scene.environment = null;`,
  "Disable scene.environment PBR IBL"
);

replaceExact(
  `        const ambientLight = new THREE.AmbientLight(0xffffff, 0.42);
        scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x0c4a6e, 0.88);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.32);
        dirLight.position.set(180, 260, 140);
        dirLight.castShadow = true;`,
  `        const ambientLight = new THREE.AmbientLight(0xffffff, 0.56);
        scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x0c4a6e, 0.96);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.28);
        dirLight.position.set(180, 260, 140);
        dirLight.castShadow = false;`,
  "Disable dirLight shadow casting & boost base ambient/hemi"
);

// Remplacer les 10 THREE.PointLight par des nœuds Object3D à coût shader nul (0 PointLight GLSL!)
const pointLightBeforeCount = (html.match(/new THREE\.PointLight\(/g) || []).length;
assert.equal(pointLightBeforeCount, 10, `Expected 10 PointLights, found ${pointLightBeforeCount}`);
html = html.replace(/new THREE\.PointLight\(/g, "createLiteDummyPointLight(");

// 8. Allègement géométrique ciblé (Eau 44x44 au lieu de 172x172 = -93% sommets CPU, arbres /4, particules /4)
replaceExact(
  `        const skyDomeGeo = new THREE.SphereGeometry(7900, 48, 28);`,
  `        const skyDomeGeo = new THREE.SphereGeometry(7900, 24, 14);`,
  "SkyDome segments"
);
replaceExact(
  `        const STAR_COUNT_3D = 650;`,
  `        const STAR_COUNT_3D = 260;`,
  "3D star count"
);
replaceExact(
  `        const overcastDomeGeo = new THREE.SphereGeometry(3200, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.48);`,
  `        const overcastDomeGeo = new THREE.SphereGeometry(3200, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.48);`,
  "Overcast dome segments"
);
replaceExact(
  `        for (let cIdx = 0; cIdx < 52; cIdx++) {
          const isMidLayer = cIdx >= 32;
          const cGroup = new THREE.Group();
          const puffSprites = [];
          const puffCount = isMidLayer ? (5 + (cIdx % 4)) : (6 + (cIdx % 5));
          const baseScale = isMidLayer ? (155 + (cIdx % 4) * 34) : (118 + (cIdx % 5) * 28);`,
  `        for (let cIdx = 0; cIdx < 52; cIdx += 2) {
          const isMidLayer = cIdx >= 32;
          const cGroup = new THREE.Group();
          const puffSprites = [];
          const puffCount = 2 + (cIdx % 2);
          const baseScale = (isMidLayer ? (155 + (cIdx % 4) * 34) : (118 + (cIdx % 5) * 28)) * 1.28;`,
  "3D cloud sprite draw calls & overdraw reduction (~390 -> ~65 sprites)"
);
replaceExact(
  `        for (let k = 0; k < 24; k++) {`,
  `        for (let k = 0; k < 24; k += 2) {`,
  "3D cirrus band reduction (24 -> 12)"
);
replaceExact(
  `        const WATER_SIZE = 8800;
        const WATER_SEGS = 172;`,
  `        const WATER_SIZE = 8800;
        const WATER_SEGS = 44;`,
  "Water mesh segments (29,929 -> 2,025 vertices)"
);
replaceExact(
  `        function createWaterNormalTexture() {
          const sz = 256;`,
  `        function createWaterNormalTexture() {
          const sz = 128;`,
  "Water normal map texture size"
);
replaceExact(
  `        const SNOW_COUNT_3D = 2400;`,
  `        const SNOW_COUNT_3D = 550;`,
  "3D snow particle count"
);
replaceExact(
  `        for (let sm = 0; sm < 36; sm++) {`,
  `        for (let sm = 0; sm < 36; sm += 3) {`,
  "Sea smoke sprite count"
);
replaceExact(
  `        const RAIN_STREAK_MAX = 2600;`,
  `        const RAIN_STREAK_MAX = 600;`,
  "3D rain streak count"
);
replaceExact(
  `        const RAIN_RIPPLE_COUNT = 84;`,
  `        const RAIN_RIPPLE_COUNT = 24;`,
  "3D rain ripple count"
);
replaceExact(
  `        const SPUME_MAX_3D = 900;`,
  `        const SPUME_MAX_3D = 180;`,
  "3D sea spray spume count"
);

// Forêts GPU-instanciées : pas de 4 (même couverture 360° exacte avec 75 % de triangles en moins)
replaceExact(`for (let tIdx = 0; tIdx < 720; tIdx++) {`, `for (let tIdx = 0; tIdx < 720; tIdx += 4) {`, "South shore trees /4");
replaceExact(`for (let tIdx = 0; tIdx < 220; tIdx++) {`, `for (let tIdx = 0; tIdx < 220; tIdx += 4) {`, "Lauzon trees /4");
replaceExact(`for (let tIdx = 0; tIdx < 520; tIdx++) {`, `for (let tIdx = 0; tIdx < 520; tIdx += 4) {`, "North shore trees /4");
replaceExact(`for (let tIdx = 0; tIdx < 260; tIdx++) {`, `for (let tIdx = 0; tIdx < 260; tIdx += 4) {`, "Ile d'Orleans trees /4");

// Synchroniser #hud-toggle-3d avec applyLitePerfMode
replaceExact(
  `        const toggle3DBtn = document.getElementById("hud-toggle-3d");
        if (toggle3DBtn) {
          toggle3DBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            window.mode3DActive = !window.mode3DActive;
            if (animWinEl) {
              animWinEl.classList.toggle("mode-3d-active", window.mode3DActive);
            }
            canvas3D.style.display = window.mode3DActive ? "block" : "none";
            toggle3DBtn.textContent = window.mode3DActive
              ? "🌐 3D: ON"
              : "🖼️ Mode: 2D";
            toggle3DBtn.classList.toggle("active-cam", window.mode3DActive);
            if (typeof window.syncLandmarkButtonsMode === "function") {
              window.syncLandmarkButtonsMode();
            }
          });
        }`,
  `        const toggle3DBtn = document.getElementById("hud-toggle-3d");
        if (toggle3DBtn) {
          toggle3DBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            applyLitePerfMode(window.mode3DActive ? "2d_eco" : "3d_lite", true);
          });
        }`,
  "Sync #hud-toggle-3d with applyLitePerfMode"
);

// Adapter #hud-toggle-quality aux 3 paliers Lite (0.70x -> 0.50x Ultra-Éco -> 1.0x Net, zéro shadowMap)
replaceExact(
  `        const qualityToggleBtn = document.getElementById("hud-toggle-quality");
        if (qualityToggleBtn) {
          const qOrder = ["hd", "ultra", "eco"];
          qualityToggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const nextIdx = (qOrder.indexOf(qualityTier3D) + 1) % qOrder.length;
            qualityTier3D = qOrder[nextIdx];
            const shadowSz = qualityTier3D === "ultra" ? 2048 : (qualityTier3D === "eco" ? 512 : 1024);
            if (dirLight && dirLight.shadow && dirLight.shadow.mapSize.width !== shadowSz) {
              dirLight.shadow.mapSize.width = shadowSz;
              dirLight.shadow.mapSize.height = shadowSz;
              if (dirLight.shadow.map) {
                dirLight.shadow.map.dispose();
                dirLight.shadow.map = null;
              }
            }
            if (qualityTier3D === "ultra") {
              qualityToggleBtn.innerHTML = "&#x1F48E; Qualit&eacute;: Ultra";
              qualityToggleBtn.classList.add("active-cam");
              qualityToggleBtn.classList.remove("active");
              qualityToggleBtn.title = "Mode ULTRA ACTIF (2.0x Retina + Ombres 2048px) — Cliquer pour passer en Mode Éco (0.75x)";
            } else if (qualityTier3D === "eco") {
              qualityToggleBtn.innerHTML = "&#x26A1; Qualit&eacute;: &Eacute;co";
              qualityToggleBtn.classList.add("active");
              qualityToggleBtn.classList.remove("active-cam");
              qualityToggleBtn.title = "Mode ÉCO ACTIF (0.75x + Ombres allégées) — Cliquer pour repasser en Qualité HD (1.65x)";
            } else {
              qualityToggleBtn.innerHTML = "&#x1F5A5;&#xFE0F; Qualit&eacute;: HD";
              qualityToggleBtn.classList.remove("active", "active-cam");
              qualityToggleBtn.title = "Mode HD (1.65x HiDPI + Ombres 1024px) — Cliquer pour passer en Mode Ultra (2.0x + Ombres 2K)";
            }
            handleResize3D();
          });
        }`,
  `        const qualityToggleBtn = document.getElementById("hud-toggle-quality");
        if (qualityToggleBtn) {
          const qOrder = ["eco", "ultra", "hd"];
          qualityToggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const nextIdx = (qOrder.indexOf(qualityTier3D) + 1) % qOrder.length;
            qualityTier3D = qOrder[nextIdx];
            if (qualityTier3D === "ultra") {
              qualityToggleBtn.innerHTML = "&#x1F50B; Qualit&eacute;: Ultra-&Eacute;co";
              qualityToggleBtn.classList.add("active-cam");
              qualityToggleBtn.classList.remove("active");
              qualityToggleBtn.title = "Mode ULTRA-ÉCO (0.50x — Idéal vieux PC / RDP) — Cliquer pour passer en Net (1.0x)";
            } else if (qualityTier3D === "eco") {
              qualityToggleBtn.innerHTML = "&#x26A1; Qualit&eacute;: Lite";
              qualityToggleBtn.classList.add("active");
              qualityToggleBtn.classList.remove("active-cam");
              qualityToggleBtn.title = "Mode LITE (0.70x sans ombres ni MSAA) — Cliquer pour passer en Ultra-Éco (0.50x)";
            } else {
              qualityToggleBtn.innerHTML = "&#x1F5A5;&#xFE0F; Qualit&eacute;: Net 1x";
              qualityToggleBtn.classList.remove("active", "active-cam");
              qualityToggleBtn.title = "Mode NET (1.0x sans ombres) — Cliquer pour revenir en Lite (0.70x)";
            }
            handleResize3D();
          });
        }`,
  "Lite 3-tier resolution toggle"
);

// Désactiver le parcours d'ombres portées et d'envMap Phong sur les navires et le quai
replaceExact(
  `        [tankerGroup, vessel86Group, dockGroup, tugBow.group, tugStern.group, seawayCargoGroup, ferryGroup].forEach((grp) => {
          if (!grp) return;
          grp.traverse((obj) => {
            if (obj.isMesh) {
              obj.castShadow = true;
              obj.receiveShadow = true;
              if (obj.material && !obj.material.envMap && obj.material.type === "MeshPhongMaterial") {
                obj.material.envMap = envCubeMaps.day;
                obj.material.reflectivity = 0.34;
                obj.material.needsUpdate = true;
              }
            }
          });
        });`,
  `        // Édition Lite : zéro ombre portée et zéro envMap cubemap sur les 55 matériaux Phong (gain massif GPU intégré)`,
  "Skip shadow & envMap mesh traversal"
);

// Cadencer la Minimap Radar 2D à 8 FPS (125 ms) au lieu de chaque frame 3D
replaceExact(
  `        function renderWeatherMinimap(effMs, c, windKnots, tideM, flowSign, curTimeMs) {
          const nowFrame = typeof curTimeMs === "number" ? curTimeMs : performance.now();`,
  `        let lastLiteMinimapMs = 0;
        function renderWeatherMinimap(effMs, c, windKnots, tideM, flowSign, curTimeMs) {
          const nowFrame = typeof curTimeMs === "number" ? curTimeMs : performance.now();
          if (nowFrame - lastLiteMinimapMs < 125) return;
          lastLiteMinimapMs = nowFrame;`,
  "Throttle 3D radar minimap to 8 FPS"
);

// 9. Cadencement intelligent de render3DLoop à 24 FPS (~41 ms) + sommeil hors-écran / onglet caché + normales d'eau 1 frame sur 4
replaceExact(
  `        function render3DLoop(nowMs) {
          requestAnimationFrame(render3DLoop);
          const curTimeMs = typeof nowMs === "number" ? nowMs : performance.now();
          const dt3D = Math.min(0.1, Math.max(0.004, (curTimeMs - prevRender3DMs) / 1000));
          const dt60 = dt3D * 60;
          prevRender3DMs = curTimeMs;

          // Avancer le temps simule si le lecteur Time-Lapse Meteo est actif
          if (window.timeLapseCtrl && window.timeLapseCtrl.playing) {
            window.timeLapseCtrl.tick(curTimeMs);
          }

          if (!window.mode3DActive) return;`,
  `        let lastLite3DRenderMs = 0;
        let lite3DFrameCounter = 0;
        function render3DLoop(nowMs) {
          const curTimeMs = typeof nowMs === "number" ? nowMs : performance.now();

          // Avancer le lecteur Time-Lapse même si l'aperçu est en mode 2D ou en pause
          if (window.timeLapseCtrl && window.timeLapseCtrl.playing) {
            window.timeLapseCtrl.tick(curTimeMs);
          }

          // Sommeil profond (0 % GPU) si onglet masqué, aperçu hors-écran, mode Pause ou mode 2D Sans WebGL
          if (document.hidden || window.__liteViewportPaused || !window.__liteAnimInView || !window.mode3DActive) {
            prevRender3DMs = curTimeMs;
            setTimeout(() => requestAnimationFrame(render3DLoop), 250);
            return;
          }

          requestAnimationFrame(render3DLoop);
          // Cadencement fluide 24 FPS (~40 ms) sauf si un test accélère speedMultiplier > 4
          const fastSim = Boolean(window.tugManeuver && window.tugManeuver.speedMultiplier > 4);
          if (!fastSim && curTimeMs - lastLite3DRenderMs < 40) return;
          const dt3D = Math.min(0.12, Math.max(0.004, (curTimeMs - prevRender3DMs) / 1000));
          const dt60 = dt3D * 60;
          prevRender3DMs = curTimeMs;
          lastLite3DRenderMs = curTimeMs;
          lite3DFrameCounter++;`,
  "render3DLoop 24 FPS cap & deep sleep"
);

replaceExact(
  `          const targetEnvKey = isNight ? "night" : isGolden ? "golden" : "day";
          if (targetEnvKey !== activeEnvKey) {
            activeEnvKey = targetEnvKey;
            const envMapNow = envCubeMaps[activeEnvKey];
            scene.environment = envMapNow;
            waterMat.envMap = envMapNow;
            waterMat.needsUpdate = true;
            concreteMat.envMap = envMapNow;
            concreteDarkMat.envMap = envMapNow;
            caissonCapMat.envMap = envMapNow;
            steelGalvMat.envMap = envMapNow;
            concreteMat.needsUpdate = true;
            concreteDarkMat.needsUpdate = true;
            caissonCapMat.needsUpdate = true;
            steelGalvMat.needsUpdate = true;
          }`,
  `          activeEnvKey = isNight ? "night" : isGolden ? "golden" : "day";`,
  "Skip runtime CubeMap env swaps"
);

replaceExact(
  `          if (Math.floor(curTimeMs / 16) % 2 === 0) {
            waterGeo.computeVertexNormals();
          }`,
  `          if (lite3DFrameCounter % 4 === 0) {
            waterGeo.computeVertexNormals();
          }`,
  "Compute water vertex normals every 4th Lite frame"
);

// Vérifications strictes d'intégrité
assert.equal(
  extractTemplateModal(html),
  origTemplateModal,
  "CRITICAL: #template-modal must remain 100% untouched!"
);

const purpleMatches = html.match(/#(8b5cf6|a855f7|7c3aed|9333ea|c084fc|6d28d9|d8b4fe|e9d5ff)\b/gi) || [];
assert.equal(purpleMatches.length, 0, `Expected 0 purple hex codes, got: ${purpleMatches}`);

let scriptCount = 0;
for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
  new vm.Script(m[1]);
  scriptCount++;
}

fs.writeFileSync(outPath, html, "utf8");

const srcKb = Math.round(Buffer.byteLength(srcHtml, "utf8") / 1024);
const outKb = Math.round(Buffer.byteLength(html, "utf8") / 1024);
const srcLines = srcHtml.split("\n").length;
const outLines = html.split("\n").length;
console.log(
  `[Lite Builder] OK! Wrote "${path.basename(outPath)}" — ${outKb} KB (down from ${srcKb} KB), ${outLines} lines (down from ${srcLines} lines), ${scriptCount} inline <script> blocks syntax-verified.`
);
