#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const SHEET_HEADERS = [
  "Empresa",
  "Industria",
  "Ciudad",
  "Dirección",
  "Teléfono",
  "Website URL",
  "Fuente URL",
  "Evidencia sin web",
  "Fecha de investigación",
  "Estado de enriquecimiento",
  "Elegibilidad de contacto",
  "Base de consentimiento",
  "Estado de baja",
];

const WEBSITE_KEYS = new Set(["website", "contact:website", "url", "contact:url"]);
const DEFAULT_CONFIG = resolve(dirname(fileURLToPath(import.meta.url)), "../config/niagara-leads.json");

const clean = value => String(value ?? "").trim();
const sleep = ms => new Promise(done => setTimeout(done, ms));

function escapeOverpass(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export function buildOverpassQuery(locality, sectors, timeoutSeconds = 90) {
  const selectors = sectors.flatMap(sector => sector.selectors).map(({ key, value }) =>
    `  nwr["${escapeOverpass(key)}"="${escapeOverpass(value)}"](around:${locality.radius_m},${locality.latitude},${locality.longitude});`
  );
  return `[out:json][timeout:${timeoutSeconds}];\n(\n${selectors.join("\n")}\n);\nout center tags;`;
}

function websiteFrom(tags = {}) {
  for (const [key, value] of Object.entries(tags)) {
    if ((WEBSITE_KEYS.has(key.toLowerCase()) || key.toLowerCase().endsWith(":website")) && clean(value)) return clean(value);
  }
  return "";
}

function sectorFor(tags, sectors) {
  return sectors.find(sector => sector.selectors.some(({ key, value }) => clean(tags[key]) === value));
}

function elementCoordinates(element) {
  return {
    latitude: Number(element.lat ?? element.center?.lat),
    longitude: Number(element.lon ?? element.center?.lon),
  };
}

function distanceSquared(a, b) {
  const latitudeScale = 111;
  const longitudeScale = 111 * Math.cos(((a.latitude + b.latitude) / 2) * Math.PI / 180);
  return ((a.latitude - b.latitude) * latitudeScale) ** 2 + ((a.longitude - b.longitude) * longitudeScale) ** 2;
}

function nearestLocality(element, localities, fallback) {
  const point = elementCoordinates(element);
  if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return fallback;
  return localities.reduce((nearest, locality) =>
    distanceSquared(point, locality) < distanceSquared(point, nearest) ? locality : nearest
  , localities[0]);
}

function addressFrom(tags) {
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  return [street, tags["addr:unit"], tags["addr:postcode"]].filter(Boolean).join(", ");
}

function canonicalLocality(tags, localities, element, fallback) {
  const tagged = clean(tags["addr:city"] || tags["addr:town"] || tags["addr:village"]).toLowerCase();
  const exact = localities.find(locality => locality.name.toLowerCase() === tagged);
  return (exact || nearestLocality(element, localities, fallback)).name;
}

export function normalizeElements(elements, { localities, sectors, only_without_website = true }, fallbackLocality, researchDate = new Date().toISOString().slice(0, 10)) {
  return elements.flatMap(element => {
    const tags = element.tags || {};
    const company = clean(tags.name || tags.brand);
    const sector = sectorFor(tags, sectors);
    const website = websiteFrom(tags);
    if (!company || !sector || (only_without_website && website)) return [];

    return [{
      _osmKey: `${element.type}/${element.id}`,
      Empresa: company,
      Industria: sector.label,
      Ciudad: canonicalLocality(tags, localities, element, fallbackLocality),
      "Dirección": addressFrom(tags),
      "Teléfono": clean(tags["contact:phone"] || tags.phone),
      "Website URL": website,
      "Fuente URL": `https://www.openstreetmap.org/${element.type}/${element.id}`,
      "Evidencia sin web": website
        ? "OSM publica una etiqueta de sitio web; requiere verificación manual."
        : "OSM no publica etiquetas website/contact:website/url; esto no prueba que el negocio carezca de sitio web y requiere verificación manual.",
      "Fecha de investigación": researchDate,
      "Estado de enriquecimiento": "pendiente",
      "Elegibilidad de contacto": "pendiente de revisión",
      "Base de consentimiento": "no verificada",
      "Estado de baja": "no consultado",
    }];
  });
}

export function deduplicate(rows) {
  const byOsmId = new Map();
  for (const row of rows) if (!byOsmId.has(row._osmKey)) byOsmId.set(row._osmKey, row);
  return [...byOsmId.values()];
}

function csvCell(value) {
  const text = clean(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(rows) {
  return [SHEET_HEADERS, ...rows.map(row => SHEET_HEADERS.map(header => row[header] ?? ""))]
    .map(row => row.map(csvCell).join(","))
    .join("\n") + "\n";
}

export function parseArgs(argv) {
  const args = { config: DEFAULT_CONFIG, out: "niagara-leads.csv", format: "csv", localities: [], sectors: [], limit: Infinity, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--config") args.config = resolve(argv[++index]);
    else if (value === "--out") args.out = argv[++index];
    else if (value === "--format") args.format = argv[++index];
    else if (value === "--locality") args.localities.push(argv[++index]);
    else if (value === "--sector") args.sectors.push(argv[++index]);
    else if (value === "--limit") args.limit = Number(argv[++index]);
    else if (value === "--dry-run") args.dryRun = true;
    else if (value === "--help" || value === "-h") args.help = true;
    else throw new Error(`Argumento desconocido: ${value}`);
  }
  if ((args.limit !== Infinity && !Number.isInteger(args.limit)) || args.limit <= 0) throw new Error("--limit debe ser un entero positivo");
  if (!["csv", "json"].includes(args.format)) throw new Error("--format debe ser csv o json");
  return args;
}

function selectById(items, requested, label) {
  if (!requested.length) return items;
  const wanted = new Set(requested.map(value => value.toLowerCase()));
  const selected = items.filter(item => wanted.has((item.id || item.name).toLowerCase()));
  const found = new Set(selected.map(item => (item.id || item.name).toLowerCase()));
  const missing = [...wanted].filter(value => !found.has(value));
  if (missing.length) throw new Error(`${label} desconocido(s): ${missing.join(", ")}`);
  return selected;
}

export function validateConfig(config) {
  if (!Array.isArray(config.localities) || !config.localities.length) throw new Error("La configuración necesita localities");
  if (!Array.isArray(config.sectors) || !config.sectors.length) throw new Error("La configuración necesita sectors");
  if (!Array.isArray(config.overpass_endpoints) || !config.overpass_endpoints.length) throw new Error("La configuración necesita overpass_endpoints");
  for (const locality of config.localities) {
    if (!locality.name || !Number.isFinite(locality.latitude) || !Number.isFinite(locality.longitude) || !Number.isFinite(locality.radius_m)) {
      throw new Error(`Localidad inválida: ${JSON.stringify(locality)}`);
    }
  }
  for (const sector of config.sectors) {
    if (!sector.id || !sector.label || !Array.isArray(sector.selectors) || !sector.selectors.length) throw new Error(`Sector inválido: ${JSON.stringify(sector)}`);
  }
  return config;
}

async function fetchOverpass(query, endpoints, timeoutSeconds) {
  let lastError;
  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), (timeoutSeconds + 10) * 1000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "Wuaya-Niagara-Lead-Pilot/1.0 (manual review only; no outreach)",
        },
        body: new URLSearchParams({ data: query }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      lastError = new Error(`${endpoint}: ${error.message}`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

function usage() {
  return `Uso: npm run leads:niagara -- [opciones]\n\n` +
    `  --locality "St. Catharines"   Repetible; por defecto usa todas\n` +
    `  --sector automotive            Repetible; por defecto usa todos\n` +
    `  --limit 100                     Máximo de filas\n` +
    `  --out archivo.csv               Destino (por defecto niagara-leads.csv)\n` +
    `  --format csv|json               Formato de salida\n` +
    `  --config ruta.json              Configuración alternativa\n` +
    `  --dry-run                       Imprime consultas sin hacer red\n`;
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) return process.stdout.write(usage());
  const config = validateConfig(JSON.parse(await readFile(args.config, "utf8")));
  const localities = selectById(config.localities, args.localities, "Localidad");
  const sectors = selectById(config.sectors, args.sectors, "Sector");
  const timeoutSeconds = config.request_timeout_seconds || 90;

  if (args.dryRun) {
    for (const locality of localities) {
      process.stdout.write(`# ${locality.name}\n${buildOverpassQuery(locality, sectors, timeoutSeconds)}\n\n`);
    }
    return;
  }

  const rows = [];
  for (let index = 0; index < localities.length; index += 1) {
    const locality = localities[index];
    process.stderr.write(`Consultando ${locality.name}...\n`);
    const payload = await fetchOverpass(buildOverpassQuery(locality, sectors, timeoutSeconds), config.overpass_endpoints, timeoutSeconds);
    rows.push(...normalizeElements(payload.elements || [], { ...config, localities: config.localities, sectors }, locality));
    if (index < localities.length - 1) await sleep(config.delay_between_requests_ms ?? 1200);
  }

  const normalized = deduplicate(rows).slice(0, args.limit).map(({ _osmKey, ...row }) => row);
  const output = args.format === "json" ? JSON.stringify(normalized, null, 2) + "\n" : toCsv(normalized);
  await writeFile(resolve(args.out), output, "utf8");
  process.stderr.write(`${normalized.length} candidatos guardados en ${resolve(args.out)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exitCode = 1;
  });
}
