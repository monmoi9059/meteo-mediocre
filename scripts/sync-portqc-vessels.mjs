#!/usr/bin/env node
/**
 * Synchronisation serveur automatisée — Horaire des navires du Port de Québec (Postes 86 & 87 Valero)
 * S'exécute via GitHub Actions (zéro blocage CORS navigateur) et génère `live-vessels-86-87.json`.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const OUTPUT_JSON_PATH = path.join(REPO_ROOT, "live-vessels-86-87.json");

const PORTQC_FR_URL = "https://www.portquebec.ca/affaires-et-operations/horaire-des-navires/";
const PORTQC_EN_URL = "https://www.portquebec.ca/en/business-and-operations/ship-schedule/";

const PORTQC_FLAG_MAP = {
  CA: "Canada", CAN: "Canada", CANADA: "Canada",
  GR: "Grèce", GRC: "Grèce", GREECE: "Grèce", GRECE: "Grèce",
  MT: "Malte", MLT: "Malte", MALTA: "Malte", MALTE: "Malte",
  MH: "Îles Marshall", MHL: "Îles Marshall", MARSHALL: "Îles Marshall",
  LR: "Libéria", LBR: "Libéria", LIBERIA: "Libéria",
  PA: "Panama", PAN: "Panama", PANAMA: "Panama",
  BS: "Bahamas", BHS: "Bahamas", BAHAMAS: "Bahamas",
  CY: "Chypre", CYP: "Chypre", CYPRUS: "Chypre", CHYPRE: "Chypre",
  NO: "Norvège", NOR: "Norvège", NORWAY: "Norvège", NORVEGE: "Norvège",
  SG: "Singapour", SGP: "Singapour", SINGAPORE: "Singapour", SINGAPOUR: "Singapour",
  HK: "Hong Kong", HKG: "Hong Kong", "HONG KONG": "Hong Kong",
  DK: "Danemark", DNK: "Danemark", DENMARK: "Danemark", DANEMARK: "Danemark",
  NL: "Pays-Bas", NLD: "Pays-Bas", NETHERLANDS: "Pays-Bas", "PAYS-BAS": "Pays-Bas",
  BE: "Belgique", BEL: "Belgique", BELGIUM: "Belgique", BELGIQUE: "Belgique",
  IT: "Italie", ITA: "Italie", ITALY: "Italie", ITALIE: "Italie",
  FR: "France", FRA: "France", FRANCE: "France",
  GB: "Royaume-Uni", UK: "Royaume-Uni", GBR: "Royaume-Uni",
  IM: "Île de Man", IOM: "Île de Man",
  BM: "Bermudes", BMU: "Bermudes", BERMUDA: "Bermudes", BERMUDES: "Bermudes",
  BB: "Barbade", BRB: "Barbade", BARBADOS: "Barbade", BARBADE: "Barbade",
  AG: "Antigua", ATG: "Antigua",
  PT: "Portugal", PRT: "Portugal", PORTUGAL: "Portugal",
  DE: "Allemagne", DEU: "Allemagne", GERMANY: "Allemagne", ALLEMAGNE: "Allemagne",
  US: "États-Unis", USA: "États-Unis",
  JP: "Japon", JPN: "Japon", JAPAN: "Japon", JAPON: "Japon",
  KR: "Corée du Sud", KOR: "Corée du Sud",
  TR: "Turquie", TUR: "Turquie", TURKEY: "Turquie", TURQUIE: "Turquie",
  ES: "Espagne", ESP: "Espagne", SPAIN: "Espagne", ESPAGNE: "Espagne"
};

const PORTQC_NAME_TO_ISO = {
  CANADA: "CA",
  GRECE: "GR", GREECE: "GR",
  MALTE: "MT", MALTA: "MT",
  MARSHALL: "MH", "ILES MARSHALL": "MH", "MARSHALL ISLANDS": "MH",
  LIBERIA: "LR",
  PANAMA: "PA",
  BAHAMAS: "BS",
  CHYPRE: "CY", CYPRUS: "CY",
  NORVEGE: "NO", NORWAY: "NO",
  SINGAPOUR: "SG", SINGAPORE: "SG",
  "HONG KONG": "HK", HONGKONG: "HK",
  DANEMARK: "DK", DENMARK: "DK",
  "PAYS-BAS": "NL", NETHERLANDS: "NL", HOLLANDE: "NL",
  BELGIQUE: "BE", BELGIUM: "BE",
  ITALIE: "IT", ITALY: "IT",
  FRANCE: "FR",
  "ROYAUME-UNI": "GB", "UNITED KINGDOM": "GB",
  "ILE DE MAN": "IM", "ISLE OF MAN": "IM",
  BERMUDES: "BM", BERMUDA: "BM",
  BARBADE: "BB", BARBADOS: "BB",
  ANTIGUA: "AG",
  PORTUGAL: "PT",
  ALLEMAGNE: "DE", GERMANY: "DE",
  "ETATS-UNIS": "US", "UNITED STATES": "US",
  JAPON: "JP", JAPAN: "JP",
  TURQUIE: "TR", TURKEY: "TR",
  ESPAGNE: "ES", SPAIN: "ES"
};

export function stripDiacriticsSimple(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function decodeHtmlEntities(str) {
  return String(str || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&eacute;/gi, "é")
    .replace(/&egrave;/gi, "è")
    .replace(/&ecirc;/gi, "ê")
    .replace(/&agrave;/gi, "à")
    .replace(/&ccedil;/gi, "ç")
    .replace(/&ocirc;/gi, "ô")
    .replace(/&ucirc;/gi, "û")
    .replace(/&rsquo;/gi, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export function cleanPortQcCellText(rawHtmlOrText) {
  let s = String(rawHtmlOrText || "");
  // Retirer les éléments d'infobulles / en-têtes mobiles répétés dans chaque <td>
  s = s.replace(/<(?:span|div|p)[^>]*class="[^"]*(?:tooltip|th-mobile|sr-only|visually-hidden)[^"]*"[^>]*>[\s\S]*?<\/(?:span|div|p)>/gi, " ");
  s = s.replace(/<(?:script|style)[^>]*>[\s\S]*?<\/(?:script|style)>/gi, " ");
  // Extraire le code ISO depuis une éventuelle icône de drapeau si la cellule n'a pas de texte
  const flagImgMatch = s.match(/<img[^>]+(?:alt|title)="([^"]+)"/i) || s.match(/\/([a-z]{2})\.(?:svg|png|webp|gif)/i);
  s = decodeHtmlEntities(s.replace(/<[^>]+>/g, " "));
  // Supprimer les textes d'infobulle résiduels ("Poste Infobulle : Quai", "CA TAD Infobulle : Tadoussac - Que")
  s = s.replace(/\.?\s*Infobulle\s*:.*$/i, " ");
  s = s.replace(/\s+/g, " ").trim();
  if (!s && flagImgMatch) {
    s = flagImgMatch[1].trim();
  }
  return s;
}

export function normalizePortQcFlag(rawFlag) {
  const clean = String(rawFlag || "").replace(/[^A-Za-z\u00C0-\u017F\s-]/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return { flag: "UN", flagName: "International" };
  const upper = stripDiacriticsSimple(clean).toUpperCase();
  if (upper.length === 2 && PORTQC_FLAG_MAP[upper]) {
    return { flag: upper, flagName: PORTQC_FLAG_MAP[upper] };
  }
  if (upper.length === 3 && PORTQC_FLAG_MAP[upper]) {
    const iso2 = PORTQC_NAME_TO_ISO[stripDiacriticsSimple(PORTQC_FLAG_MAP[upper]).toUpperCase()] || upper.slice(0, 2);
    return { flag: iso2, flagName: PORTQC_FLAG_MAP[upper] };
  }
  for (const [k, iso] of Object.entries(PORTQC_NAME_TO_ISO)) {
    if (upper === k || upper.includes(k)) {
      return { flag: iso, flagName: PORTQC_FLAG_MAP[iso] || clean };
    }
  }
  if (/^[A-Z]{2}$/.test(upper)) {
    return { flag: upper, flagName: PORTQC_FLAG_MAP[upper] || upper };
  }
  return { flag: upper.slice(0, 2) || "UN", flagName: clean };
}

export function inferTankerSpecsFromLoa(loaMeters, berthStr, rawName, rawOp) {
  const loa = (typeof loaMeters === "number" && loaMeters >= 40 && loaMeters <= 360)
    ? Math.round(loaMeters * 10) / 10
    : (berthStr === "87" ? 274 : 183);
  const upperName = String(rawName || "").toUpperCase();
  const upperOp = stripDiacriticsSimple(rawOp || "").toUpperCase();
  let typeLabel = berthStr === "87" ? "Pétrolier / Produits" : "Pétrolier / Chimiquier";
  let beam = Math.round(Math.max(16, Math.min(52, loa * 0.175)));
  let dwtApprox = "~45 000 TPL";
  if (loa >= 260) {
    typeLabel = "Pétrolier Suezmax";
    beam = Math.round(Math.max(46, Math.min(50, loa * 0.176)));
    dwtApprox = "~158 000 TPL";
  } else if (loa >= 225) {
    typeLabel = "Pétrolier Aframax / LR2";
    beam = Math.round(Math.max(40, Math.min(45, loa * 0.176)));
    dwtApprox = "~112 000 TPL";
  } else if (loa >= 195) {
    typeLabel = "Pétrolier Panamax / LR1";
    beam = 32;
    dwtApprox = "~74 000 TPL";
  } else if (loa >= 165) {
    typeLabel = "Pétrolier / Chimiquier MR2";
    beam = Math.round(Math.max(27, Math.min(32, loa * 0.172)));
    dwtApprox = "~49 900 TPL";
  } else if (loa >= 125) {
    typeLabel = "Chimiquier / Produits Glace 1A";
    beam = Math.round(Math.max(20, Math.min(26, loa * 0.165)));
    dwtApprox = "~18 500 TPL";
  } else {
    typeLabel = "Caboteur Pétrolier / Soutage";
    beam = 18;
    dwtApprox = "~9 500 TPL";
  }
  if (upperOp.includes("BRUT") || upperOp.includes("CRUDE")) {
    if (loa >= 250) typeLabel = "Pétrolier Brut Suezmax";
    else if (loa >= 220) typeLabel = "Pétrolier Brut Aframax";
  } else if (upperOp.includes("CHIMI") || upperName.includes("CHEM")) {
    typeLabel = loa >= 165 ? "Chimiquier / Produits MR" : "Chimiquier Classe Glace";
  }
  return { loa, beam, dwtApprox, typeLabel };
}

const MONTH_INDEX_MAP = {
  jan: 0, janv: 0, janvier: 0, january: 0,
  fev: 1, fevr: 1, fevrier: 1, feb: 1, february: 1,
  mar: 2, mars: 2, march: 2,
  avr: 3, avril: 3, apr: 3, april: 3,
  mai: 4, may: 4,
  jun: 5, juin: 5, june: 5,
  jul: 6, juil: 6, juillet: 6, july: 6,
  aou: 7, aout: 7, aug: 7, august: 7,
  sep: 8, sept: 8, septembre: 8, september: 8,
  oct: 9, octobre: 9, october: 9,
  nov: 10, novembre: 10, november: 10,
  dec: 11, decembre: 11, december: 11
};

function getQuebecOffsetMinutes(utcGuessMs) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Toronto",
      timeZoneName: "shortOffset"
    }).formatToParts(new Date(utcGuessMs));
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    if (tzPart) {
      const m = tzPart.value.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/i);
      if (m) {
        const hrs = parseInt(m[1], 10);
        const mins = m[2] ? parseInt(m[2], 10) : 0;
        return hrs * 60 + (hrs < 0 ? -mins : mins);
      }
    }
  } catch (e) {}
  return -300; // EST par défaut (UTC-5)
}

export function parsePortQcDateToIso(rawDateStr, refNowMs = Date.now()) {
  const clean = stripDiacriticsSimple(rawDateStr || "").toLowerCase().replace(/\./g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return null;

  let day = NaN;
  let monthIdx = -1;
  let hour = 0;
  let minute = 0;
  let explicitYear = NaN;

  // Format ISO "2026-11-18 18:00"
  const isoM = clean.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (isoM) {
    explicitYear = parseInt(isoM[1], 10);
    monthIdx = parseInt(isoM[2], 10) - 1;
    day = parseInt(isoM[3], 10);
    hour = isoM[4] ? parseInt(isoM[4], 10) : 0;
    minute = isoM[5] ? parseInt(isoM[5], 10) : 0;
  } else {
    // Format FR "18 nov 18:00" ou "18 novembre 2026 a 12:45"
    const frM = clean.match(/\b(\d{1,2})\s+([a-z]{3,9})(?:\s+(20\d{2}))?(?:\s+(?:a\s+)?(\d{1,2})[:h](\d{2}))?/);
    // Format EN "nov 18 18:00"
    const enM = clean.match(/\b([a-z]{3,9})\s+(\d{1,2})(?:,?\s+(20\d{2}))?(?:\s+(?:at\s+)?(\d{1,2}):(\d{2}))?/);
    if (frM && MONTH_INDEX_MAP[frM[2]] !== undefined) {
      day = parseInt(frM[1], 10);
      monthIdx = MONTH_INDEX_MAP[frM[2]];
      if (frM[3]) explicitYear = parseInt(frM[3], 10);
      if (frM[4]) hour = parseInt(frM[4], 10);
      if (frM[5]) minute = parseInt(frM[5], 10);
    } else if (enM && MONTH_INDEX_MAP[enM[1]] !== undefined) {
      monthIdx = MONTH_INDEX_MAP[enM[1]];
      day = parseInt(enM[2], 10);
      if (enM[3]) explicitYear = parseInt(enM[3], 10);
      if (enM[4]) hour = parseInt(enM[4], 10);
      if (enM[5]) minute = parseInt(enM[5], 10);
    }
  }

  if (monthIdx < 0 || isNaN(day) || day < 1 || day > 31) return null;

  const refYear = new Date(refNowMs).getUTCFullYear();
  let year = !isNaN(explicitYear) ? explicitYear : refYear;

  const buildUtcMs = (yr) => {
    const roughUtc = Date.UTC(yr, monthIdx, day, hour + 5, minute, 0);
    const offsetMins = getQuebecOffsetMinutes(roughUtc);
    return Date.UTC(yr, monthIdx, day, hour, minute, 0) - offsetMins * 60000;
  };

  let targetMs = buildUtcMs(year);
  if (isNaN(explicitYear)) {
    // Si la date semble plus de 120 jours dans le passé (ex: "10 avr." lu en novembre), c'est l'année suivante
    if (targetMs < refNowMs - 120 * 86400000) {
      year += 1;
      targetMs = buildUtcMs(year);
    } else if (targetMs > refNowMs + 250 * 86400000) {
      year -= 1;
      targetMs = buildUtcMs(year);
    }
  }
  return new Date(targetMs).toISOString();
}

export function extractBerthCode(cellText) {
  const s = cleanPortQcCellText(cellText);
  const norm = stripDiacriticsSimple(s)
    .toUpperCase()
    .replace(/\b(SECTION|SEC\.?|POSTE|QUAI|BERTH|WHARF|PIER|TERMINAL|VALERO|ST-ROMUALD)\b/g, " ")
    .trim();
  if (!norm || norm.length > 24) return { code: "", targets: [] };
  if (/\d{4}|\d+:\d+|\d+[.,]\d+/.test(norm)) return { code: "", targets: [] };
  const targets = [];
  if (/(?:^|[\s/,&-])0*86(?:$|[\s/,&-])/.test(norm)) targets.push("86");
  if (/(?:^|[\s/,&-])0*87(?:$|[\s/,&-])/.test(norm)) targets.push("87");
  const mCode = norm.match(/^0*(\d{1,3})\b/);
  return { code: mCode ? mCode[1] : "", targets };
}

export function buildHeaderColMap(headerCells) {
  const map = {};
  headerCells.forEach((rawH, idx) => {
    const cleaned = cleanPortQcCellText(rawH);
    const h = stripDiacriticsSimple(cleaned).toUpperCase().replace(/\./g, "").trim();
    if (!h) return;
    if (map.berth === undefined && (h === "POSTE" || h === "QUAI" || h === "BERTH" || h === "SECTION" || h.includes("POSTE") || h.includes("BERTH") || h.includes("SECTION"))) {
      map.berth = idx;
    } else if (map.name === undefined && (h.includes("NAVIRE") || h.includes("VESSEL") || h.includes("SHIP") || h === "NOM")) {
      map.name = idx;
    } else if (map.resNo === undefined && h.includes("RESERV")) {
      map.resNo = idx;
    } else if (map.etd === undefined && (h === "HPD" || h === "ETD" || h.includes("HPD") || h.includes("ETD") || h.includes("DEPART") || h.includes("SORTIE"))) {
      map.etd = idx;
    } else if (map.eta === undefined && (h === "HPA" || h === "ETA" || h.includes("HPA") || h.includes("ETA") || h.includes("ARRIV"))) {
      map.eta = idx;
    } else if (map.flag === undefined && (h === "NAT" || h.startsWith("NAT ") || h.includes("NATIONAL") || h.includes("PAVILLON") || h === "PAV" || h.includes("FLAG") || h.includes("PAYS"))) {
      map.flag = idx;
    } else if (map.loa === undefined && (h === "LHT" || h === "LOA" || h.includes("LHT") || h.includes("LOA") || h.includes("LONGUEUR") || h.includes("LENGTH"))) {
      map.loa = idx;
    } else if (map.gt === undefined && (h === "JBE" || h === "GRT" || h === "GT" || h.includes("JBE") || h.includes("GRT") || h.includes("JAUGE") || h.includes("GROSS"))) {
      map.gt = idx;
    } else if (map.agent === undefined && (h.includes("AGENT") || h.includes("AGENCE"))) {
      map.agent = idx;
    } else if (map.origin === undefined && (h.startsWith("ORIG") || h.includes("PROVENANCE"))) {
      map.origin = idx;
    } else if (map.dest === undefined && h.startsWith("DEST")) {
      map.dest = idx;
    } else if (map.opCode === undefined && (h === "C/D" || h === "CD")) {
      map.opCode = idx;
    } else if (map.cargo === undefined && (h.includes("REMARQUE") || h.includes("REMARK") || h.includes("MARCHANDISE") || h.includes("CARGAISON") || h.includes("CARGO") || h.includes("PRODUIT") || h.includes("OPERAT"))) {
      map.cargo = idx;
    }
  });
  return Object.keys(map).length >= 2 ? map : null;
}

export function parsePortQuebecRowCells(rawCells, colMap, isExpectedTable = false, refNowMs = Date.now()) {
  const cells = rawCells.map((c) => cleanPortQcCellText(c));
  if (cells.length < 3) return null;

  const maybeHeader = buildHeaderColMap(cells);
  if (maybeHeader && Object.keys(maybeHeader).length >= 3 && maybeHeader.name !== undefined && maybeHeader.berth !== undefined) {
    const bCell = stripDiacriticsSimple(cells[maybeHeader.berth]).toUpperCase();
    if (!/^\d{1,3}$/.test(bCell)) {
      return { isHeader: true, headerMap: maybeHeader };
    }
  }

  // 1. Identifier la colonne Poste/Quai (index 0 sur portquebec.ca !)
  let berthIdx = (colMap && typeof colMap.berth === "number" && colMap.berth < cells.length) ? colMap.berth : -1;
  let berthInfo = berthIdx >= 0 ? extractBerthCode(cells[berthIdx]) : { code: "", targets: [] };

  if (berthIdx < 0 || !berthInfo.code) {
    for (let i = 0; i < Math.min(cells.length, 6); i++) {
      const info = extractBerthCode(cells[i]);
      if (info.code) {
        const secNum = parseInt(info.code, 10);
        if (secNum >= 1 && secNum <= 115) {
          berthIdx = i;
          berthInfo = info;
          break;
        }
      }
    }
  }

  if (berthIdx < 0 || !berthInfo.code) return null;

  // 2. Identifier le nom du navire (index 1 quand Poste est à l'index 0 !)
  let nameIdx = (colMap && typeof colMap.name === "number" && colMap.name < cells.length)
    ? colMap.name
    : (berthIdx === 0 ? 1 : 0);
  if (nameIdx === berthIdx) nameIdx = berthIdx === 0 ? 1 : 0;

  const rawName = String(cells[nameIdx] || "")
    .replace(/^\[([^\]]+)\]\([^)]+\)$/, "$1")
    .replace(/[*_`#]/g, "")
    .trim();
  // Note: certains bateaux du port ont un nom numérique (ex: barge "401" au poste 27), on vérifie la présence de réservation/date
  if (!rawName) return { isPortRow: true, berthCode: berthInfo.code, targets: [] };

  const resNo = (colMap && typeof colMap.resNo === "number" && cells[colMap.resNo])
    ? cells[colMap.resNo]
    : (cells.find((c, idx) => idx !== berthIdx && idx !== nameIdx && /^\d{5,7}$/.test(c)) || "");

  // Dates (H.P.D. / E.T.D. ou H.P.A. / E.T.A.)
  const dateCells = [];
  for (let j = 0; j < cells.length; j++) {
    if (j === berthIdx || j === nameIdx) continue;
    if (/\d{4}[-/]\d{2}[-/]\d{2}|\d{1,2}\s+[A-Za-z\u00C0-\u017F]{3,}\.?|[A-Za-z]{3,4}\.?\s+\d{1,2}\s+\d{1,2}:\d{2}|\d{1,2}:\d{2}/.test(cells[j])) {
      dateCells.push(cells[j]);
    }
  }

  let arrivalStr = "";
  let etdStr = "";
  if (isExpectedTable) {
    arrivalStr = (colMap && typeof colMap.eta === "number" && cells[colMap.eta])
      ? cells[colMap.eta]
      : ((colMap && typeof colMap.etd === "number" && cells[colMap.etd]) ? cells[colMap.etd] : (dateCells[0] || ""));
  } else {
    etdStr = (colMap && typeof colMap.etd === "number" && cells[colMap.etd])
      ? cells[colMap.etd]
      : ((colMap && typeof colMap.eta === "number" && cells[colMap.eta]) ? cells[colMap.eta] : (dateCells[0] || ""));
    if (colMap && typeof colMap.eta === "number" && colMap.eta !== colMap.etd && cells[colMap.eta]) {
      arrivalStr = cells[colMap.eta];
    }
  }

  // Nationalité / Pavillon
  let flagRaw = "";
  if (colMap && typeof colMap.flag === "number" && cells[colMap.flag]) {
    flagRaw = cells[colMap.flag];
  } else {
    for (let j = 2; j < Math.min(cells.length, 7); j++) {
      if (/^[A-Z]{2}$/.test(cells[j]) && PORTQC_FLAG_MAP[cells[j]]) {
        flagRaw = cells[j];
        break;
      }
    }
  }
  const flagObj = normalizePortQcFlag(flagRaw);

  // L.H.T. / LOA (mètres) & J.B.E. / GT
  let loaNum = NaN;
  if (colMap && typeof colMap.loa === "number" && cells[colMap.loa]) {
    const m = cells[colMap.loa].replace(",", ".").match(/(\d{2,3}(?:\.\d+)?)/);
    if (m) loaNum = parseFloat(m[1]);
  }
  if (isNaN(loaNum)) {
    for (let j = 2; j < Math.min(cells.length, 8); j++) {
      if (cells[j] === resNo) continue;
      const cVal = cells[j].replace(",", ".").replace(/\s*m$/i, "").trim();
      if (/^\d{2,3}(?:\.\d+)?$/.test(cVal)) {
        const v = parseFloat(cVal);
        if (v >= 20 && v <= 355) {
          loaNum = v;
          break;
        }
      }
    }
  }

  let gtNum = 0;
  if (colMap && typeof colMap.gt === "number" && cells[colMap.gt]) {
    const g = parseInt(cells[colMap.gt].replace(/\s+/g, ""), 10);
    if (!isNaN(g)) gtNum = g;
  }

  const agentStr = (colMap && typeof colMap.agent === "number" && cells[colMap.agent]) ? cells[colMap.agent] : "";
  const originStr = (colMap && typeof colMap.origin === "number" && cells[colMap.origin]) ? cells[colMap.origin] : "";
  const destStr = (colMap && typeof colMap.dest === "number" && cells[colMap.dest]) ? cells[colMap.dest] : "";
  const opCodeStr = (colMap && typeof colMap.opCode === "number" && cells[colMap.opCode]) ? cells[colMap.opCode] : "";
  const cargoStr = (colMap && typeof colMap.cargo === "number" && cells[colMap.cargo])
    ? cells[colMap.cargo]
    : (cells[cells.length - 1] || "Vrac liquide");

  const timeIso = parsePortQcDateToIso(isExpectedTable ? arrivalStr : etdStr, refNowMs);

  return {
    isPortRow: true,
    berthCode: berthInfo.code,
    targets: berthInfo.targets,
    name: rawName.toUpperCase(),
    resNo,
    flag: flagObj.flag,
    flagName: flagObj.flagName,
    loaNum,
    gt: gtNum,
    arrival: arrivalStr,
    eta: arrivalStr,
    etd: etdStr,
    timeIso,
    agent: agentStr,
    origin: originStr,
    dest: destStr,
    opCode: opCodeStr,
    operation: cargoStr,
    cargo: cargoStr
  };
}

/**
 * Analyseur de secours par motif lexical Port de Québec (fonctionne même si tout le balisage HTML/Markdown est aplati en texte brut !)
 * Ex: "87 ESPADA DESGAGNES 102336 18 nov. 18:00 CA 229 42810 PETRO CA MTR CA MTR C Vrac liquide"
 */
function parseFlattenedPortQcTextSection(sectionText, isExpected, refNowMs) {
  const cleaned = String(sectionText || "")
    .replace(/[|\t]+/g, " ")
    .replace(/\s+/g, " ");

  const results = [];
  // Ancrage sur le 8-uplet invariant du Port de Québec : Poste + Nom + Réservation(6 chiffres) + Date/Heure + Nat(ISO2) + LHT + JBE + Agent
  const coreRe = /\b(\d{1,3})\s+([A-Z0-9][A-Z0-9 .'-]{0,34}?)\s+(\d{5,7})\s+((?:\d{1,2}\s+[A-Za-z\u00C0-\u017F]{3,5}\.?|[A-Za-z]{3,4}\.?\s+\d{1,2})\s+\d{2}:\d{2})\s+([A-Z]{2})\s+(\d{2,3}(?:[.,]\d+)?)\s+(\d{1,6})\s+([A-Z0-9&.-]{2,10})\b/g;

  const matches = [];
  let m;
  while ((m = coreRe.exec(cleaned)) !== null) {
    matches.push({ index: m.index, endIndex: coreRe.lastIndex, groups: m });
  }

  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const nextStart = i + 1 < matches.length ? matches[i + 1].index : cleaned.length;
    let tail = cleaned.slice(cur.endIndex, nextStart).trim();
    // Couper avant le pied de page éventuel
    tail = tail.replace(/\s*(?:Derni[eè]re\s+mise\s+[aà]\s+jour|Last\s+update|S'inscrire|Subscribe)[\s\S]*$/i, "").trim();
    // Nettoyer les infobulles de ports ("Infobulle : Tadoussac - Que") sans toucher aux colonnes suivantes
    tail = tail.replace(/\.?\s*Infobulle\s*:\s*[A-Za-z\u00C0-\u017F0-9 ()'-]+?(?=\s+(?:[A-Z]{2}\s+[A-Z]{3}|OUT|TBA|[CD]\s)|$)/gi, " ").replace(/\s+/g, " ").trim();

    let origin = "";
    let dest = "";
    let opCode = "";
    let cargoClean = "Vrac liquide";

    const opMatch = tail.match(/^(.*?)\b([CD])\s+([A-Za-z\u00C0-\u017F /'-]{2,32})$/);
    if (opMatch) {
      const portsPart = opMatch[1].trim();
      opCode = opMatch[2];
      cargoClean = opMatch[3].trim();
      const portTokens = portsPart.match(/(?:[A-Z]{2}\s+[A-Z]{3}|OUT|TBA)/g);
      if (portTokens && portTokens.length >= 2) {
        origin = portTokens[0];
        dest = portTokens[1];
      } else if (portTokens && portTokens.length === 1) {
        origin = portTokens[0];
      }
    }

    const g = cur.groups;
    const berthCode = String(parseInt(g[1], 10));
    const targets = [];
    if (berthCode === "86") targets.push("86");
    if (berthCode === "87") targets.push("87");
    const flagObj = normalizePortQcFlag(g[5]);
    const dateVal = g[4].trim();

    results.push({
      isPortRow: true,
      berthCode,
      targets,
      name: g[2].trim().toUpperCase(),
      resNo: g[3].trim(),
      flag: flagObj.flag,
      flagName: flagObj.flagName,
      loaNum: parseFloat(g[6].replace(",", ".")),
      gt: parseInt(g[7], 10) || 0,
      arrival: isExpected ? dateVal : "",
      eta: isExpected ? dateVal : "",
      etd: isExpected ? "" : dateVal,
      timeIso: parsePortQcDateToIso(dateVal, refNowMs),
      agent: g[8].trim(),
      origin,
      dest,
      opCode,
      operation: cargoClean,
      cargo: cargoClean
    });
  }
  return results;
}

export function parsePortQuebecScheduleUniversal(rawText, refNowMs = Date.now()) {
  if (!rawText || typeof rawText !== "string" || rawText.length < 60) return null;

  const inPortList = { "86": [], "87": [] };
  const expectedList = { "86": [], "87": [] };
  const otherValeroTankers = [];
  let totalPortRows = 0;

  // Extraire l'horodatage officiel affiché par le Port de Québec
  let portUpdatedLabel = "";
  const updMatch = rawText.match(/(?:Derni[eè]re\s+mise\s+[aà]\s+jour\s+le|Last\s+update)\s*:\s*([^\n<]{6,80})/i);
  if (updMatch) {
    portUpdatedLabel = cleanPortQcCellText(updMatch[1]);
  }

  const recordParsedRow = (parsed, isExpected) => {
    if (!parsed || parsed.isHeader) return;
    if (parsed.isPortRow) totalPortRows++;

    // Suivre aussi les pétroliers Desgagnés/Valero momentanément aux postes 50-53 (ex: PAUL A. DESGAGNES au Poste 50)
    if (!isExpected && ["50", "51", "52", "53"].includes(parsed.berthCode)) {
      const opU = stripDiacriticsSimple(parsed.cargo || "").toUpperCase();
      if (opU.includes("LIQUID") || parsed.agent === "PETRO" || parsed.agent === "OT" || parsed.name.includes("DESGAGNES")) {
        otherValeroTankers.push({
          berth: parsed.berthCode,
          name: parsed.name,
          flag: parsed.flag,
          loa: parsed.loaNum || 135,
          etd: parsed.etd,
          agent: parsed.agent,
          cargo: parsed.cargo
        });
      }
    }

    if (parsed.targets && parsed.targets.length) {
      parsed.targets.forEach((berthKey) => {
        const specs = inferTankerSpecsFromLoa(parsed.loaNum, berthKey, parsed.name, parsed.operation);
        const entry = {
          berth: berthKey,
          name: parsed.name,
          resNo: parsed.resNo || "",
          flag: parsed.flag,
          flagName: parsed.flagName,
          loa: specs.loa,
          gt: parsed.gt || 0,
          beam: specs.beam,
          dwtApprox: specs.dwtApprox,
          typeLabel: specs.typeLabel,
          arrival: parsed.arrival || "",
          eta: parsed.eta || parsed.arrival || "",
          etd: parsed.etd || "",
          timeIso: parsed.timeIso || null,
          agent: parsed.agent || "",
          origin: parsed.origin || "",
          dest: parsed.dest || "",
          opCode: parsed.opCode || "",
          operation: parsed.operation || "",
          cargo: parsed.cargo || parsed.operation || ""
        };
        const bucket = isExpected ? expectedList[berthKey] : inPortList[berthKey];
        if (!bucket.some((x) => x.name === entry.name && (x.resNo === entry.resNo || x.eta === entry.eta))) {
          bucket.push(entry);
        }
      });
    }
  };

  // 1. Extraction des tableaux HTML (sans dépendance DOM externe)
  if (/<table[\s>]/i.test(rawText)) {
    const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tMatch;
    let tIdx = 0;
    while ((tMatch = tableRe.exec(rawText)) !== null) {
      const tableHtml = tMatch[1];
      const beforeSlice = rawText.slice(Math.max(0, tMatch.index - 900), tMatch.index);
      const beforeNorm = stripDiacriticsSimple(cleanPortQcCellText(beforeSlice)).toUpperCase();
      const captionMatch = tableHtml.match(/<caption[^>]*>([\s\S]*?)<\/caption>/i);
      const capNorm = captionMatch ? stripDiacriticsSimple(cleanPortQcCellText(captionMatch[1])).toUpperCase() : "";
      const ctxNorm = `${beforeNorm} ${capNorm}`;

      const lastAttendu = Math.max(ctxNorm.lastIndexOf("ATTENDU"), ctxNorm.lastIndexOf("EXPECTED"));
      const lastAuPort = Math.max(ctxNorm.lastIndexOf("AU PORT"), ctxNorm.lastIndexOf("IN PORT"));
      const isExpectedTable = lastAttendu > lastAuPort || (tIdx === 1 && lastAuPort < 0);

      let colMap = null;
      const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let trMatch;
      while ((trMatch = trRe.exec(tableHtml)) !== null) {
        const trInner = trMatch[1];
        const ths = [];
        const thRe = /<th[^>]*>([\s\S]*?)<\/th>/gi;
        let thM;
        while ((thM = thRe.exec(trInner)) !== null) {
          ths.push(thM[1]);
        }
        if (ths.length >= 3) {
          const built = buildHeaderColMap(ths);
          if (built) colMap = built;
          continue;
        }
        const tds = [];
        const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        let tdM;
        while ((tdM = tdRe.exec(trInner)) !== null) {
          tds.push(tdM[1]);
        }
        if (tds.length >= 3) {
          const parsed = parsePortQuebecRowCells(tds, colMap, isExpectedTable, refNowMs);
          if (parsed && parsed.isHeader && parsed.headerMap) {
            colMap = parsed.headerMap;
          } else if (parsed) {
            recordParsedRow(parsed, isExpectedTable);
          }
        }
      }
      tIdx++;
    }
  }

  // 2. Extraction Markdown (tableaux avec "|") si aucune ligne HTML n'a été extraite
  if (totalPortRows === 0 && rawText.includes("|")) {
    const lines = rawText.split(/\r?\n/);
    let isExpected = false;
    let mdColMap = null;
    for (const rawLn of lines) {
      const ln = rawLn.trim();
      if (!ln) continue;
      const upperLn = stripDiacriticsSimple(ln).toUpperCase();
      if ((upperLn.includes("NAVIRES AU PORT") || upperLn.includes("VESSELS IN PORT") || upperLn.includes("BATEAUX AU PORT")) && ln.length < 110) {
        isExpected = false;
        mdColMap = null;
        continue;
      }
      if ((upperLn.includes("NAVIRES ATTENDUS") || upperLn.includes("EXPECTED VESSELS") || upperLn.includes("BATEAUX ATTENDUS")) && ln.length < 110) {
        isExpected = true;
        mdColMap = null;
        continue;
      }
      if (!ln.includes("|")) continue;
      const parts = ln.replace(/^\|/, "").replace(/\|$/, "").split("|").map((s) => s.trim());
      if (parts.length < 3 || parts.every((p) => /^[-:\s]+$/.test(p))) continue;
      const parsed = parsePortQuebecRowCells(parts, mdColMap, isExpected, refNowMs);
      if (parsed && parsed.isHeader && parsed.headerMap) {
        mdColMap = parsed.headerMap;
      } else if (parsed) {
        recordParsedRow(parsed, isExpected);
      }
    }
  }

  // 3. Extraction lexicale sur texte aplati (Jina texte brut / copier-coller) si toujours 0 ligne
  if (totalPortRows === 0) {
    const splitRe = /\b(?:Navires\s+attendus|Horaire\s+des\s+bateaux\s+attendus|Expected\s+vessels|Expected\s+ships)\b/i;
    const parts = rawText.split(splitRe);
    const inPortRows = parseFlattenedPortQcTextSection(parts[0] || "", false, refNowMs);
    inPortRows.forEach((r) => recordParsedRow(r, false));
    if (parts.length > 1) {
      const expRows = parseFlattenedPortQcTextSection(parts.slice(1).join(" "), true, refNowMs);
      expRows.forEach((r) => recordParsedRow(r, true));
    }
  }

  if (totalPortRows < 2) return null;

  const buildBerthPayload = (berthKey) => {
    const live = inPortList[berthKey][0] || null;
    const upcoming = expectedList[berthKey];
    const nextExp = upcoming[0] || null;
    if (live) {
      return {
        berth: berthKey,
        occupied: true,
        name: live.name,
        resNo: live.resNo,
        flag: live.flag,
        flagName: live.flagName,
        loa: live.loa,
        gt: live.gt,
        beam: live.beam,
        dwtApprox: live.dwtApprox,
        typeLabel: live.typeLabel,
        arrival: live.arrival,
        etd: live.etd,
        etdIso: live.timeIso,
        agent: live.agent,
        origin: live.origin,
        dest: live.dest,
        opCode: live.opCode,
        operation: live.operation,
        cargo: live.cargo,
        expected: nextExp,
        upcoming
      };
    }
    return {
      berth: berthKey,
      occupied: false,
      name: nextExp ? nextExp.name : `POSTE ${berthKey} LIBRE`,
      resNo: "",
      flag: nextExp ? nextExp.flag : "CA",
      flagName: nextExp ? nextExp.flagName : "Aucun navire à quai",
      loa: nextExp ? nextExp.loa : (berthKey === "87" ? 274 : 149),
      gt: nextExp ? nextExp.gt : 0,
      beam: nextExp ? nextExp.beam : (berthKey === "87" ? 48 : 24),
      dwtApprox: nextExp ? nextExp.dwtApprox : "",
      typeLabel: nextExp ? nextExp.typeLabel : "Poste libre",
      arrival: "",
      etd: "",
      etdIso: null,
      agent: nextExp ? nextExp.agent : "",
      origin: nextExp ? nextExp.origin : "",
      dest: nextExp ? nextExp.dest : "",
      opCode: nextExp ? nextExp.opCode : "",
      operation: nextExp ? nextExp.operation : "",
      cargo: nextExp ? nextExp.cargo : "",
      expected: nextExp,
      upcoming
    };
  };

  return {
    version: 3,
    source: "live_portqc",
    syncChannel: "github_actions_portqc",
    portUpdatedLabel: portUpdatedLabel || "Port de Québec • Horaire officiel",
    updatedAtIso: new Date(refNowMs).toISOString(),
    fetchedAt: refNowMs,
    totalPortRows,
    otherValeroTankers,
    berth86: buildBerthPayload("86"),
    berth87: buildBerthPayload("87")
  };
}

async function fetchUrlText(url, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-CA,fr;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache"
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function stableScheduleFingerprint(payload) {
  if (!payload) return "";
  return JSON.stringify({
    portUpdatedLabel: payload.portUpdatedLabel,
    b86: {
      occupied: payload.berth86?.occupied,
      name: payload.berth86?.name,
      etd: payload.berth86?.etd,
      loa: payload.berth86?.loa,
      upcoming: (payload.berth86?.upcoming || []).map((u) => `${u.name}|${u.eta}|${u.resNo}`)
    },
    b87: {
      occupied: payload.berth87?.occupied,
      name: payload.berth87?.name,
      etd: payload.berth87?.etd,
      loa: payload.berth87?.loa,
      upcoming: (payload.berth87?.upcoming || []).map((u) => `${u.name}|${u.eta}|${u.resNo}`)
    },
    other: (payload.otherValeroTankers || []).map((o) => `${o.berth}|${o.name}|${o.etd}`)
  });
}

async function main() {
  const forceWrite = process.argv.includes("--force");
  const candidates = [
    PORTQC_FR_URL,
    PORTQC_EN_URL,
    `https://r.jina.ai/${PORTQC_FR_URL}`
  ];

  let parsed = null;
  let lastErr = null;
  for (const url of candidates) {
    try {
      const html = await fetchUrlText(url, 18000);
      const res = parsePortQuebecScheduleUniversal(html, Date.now());
      if (res && res.totalPortRows >= 2) {
        parsed = res;
        console.log(`[OK] Port de Québec synchronisé depuis ${url} (${res.totalPortRows} mouvements portuaires lus)`);
        break;
      }
    } catch (err) {
      lastErr = err;
      console.warn(`[WARN] Échec lecture ${url}: ${err.message}`);
    }
  }

  if (!parsed) {
    console.error("[ERREUR] Impossible de récupérer l'horaire du Port de Québec:", lastErr?.message || "Aucune donnée");
    process.exit(1);
  }

  let prevJson = null;
  if (fs.existsSync(OUTPUT_JSON_PATH)) {
    try {
      prevJson = JSON.parse(fs.readFileSync(OUTPUT_JSON_PATH, "utf8"));
    } catch (e) {}
  }

  const prevFp = stableScheduleFingerprint(prevJson);
  const nextFp = stableScheduleFingerprint(parsed);
  const prevAgeMs = prevJson?.fetchedAt ? (Date.now() - prevJson.fetchedAt) : Infinity;

  // Écrire si l'horaire a changé, si --force est passé, ou toutes les 2 heures pour garder un battement de vie frais
  if (!forceWrite && prevFp === nextFp && prevAgeMs < 2 * 3600 * 1000) {
    console.log("[SKIP] Aucun changement d'horaire aux Postes 86 & 87 depuis la dernière synchronisation.");
    return;
  }

  fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(parsed, null, 2) + "\n", "utf8");
  console.log(`[WRITE] ${OUTPUT_JSON_PATH} mis à jour :`);
  console.log(`  • Poste 86 : ${parsed.berth86.occupied ? parsed.berth86.name + " (Dép: " + parsed.berth86.etd + ")" : "LIBRE (Attendu: " + (parsed.berth86.expected?.name || "Aucun") + ")"}`);
  console.log(`  • Poste 87 : ${parsed.berth87.occupied ? parsed.berth87.name + " (Dép: " + parsed.berth87.etd + ")" : "LIBRE (Attendu: " + (parsed.berth87.expected?.name || "Aucun") + ")"}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
