import test from "node:test";
import assert from "node:assert/strict";

import {
  SHEET_HEADERS,
  buildOverpassQuery,
  deduplicate,
  normalizeElements,
  toCsv,
} from "../scripts/niagara-leads.mjs";

const localities = [
  { name: "St. Catharines", latitude: 43.1594, longitude: -79.2469, radius_m: 9000 },
  { name: "Niagara Falls", latitude: 43.0896, longitude: -79.0849, radius_m: 9000 },
  { name: "Thorold", latitude: 43.1236, longitude: -79.1989, radius_m: 6000 },
];
const sectors = [{ id: "automotive", label: "Servicios automotrices", selectors: [{ key: "shop", value: "car_repair" }] }];

test("construye una consulta Overpass limitada a categorías configuradas", () => {
  const query = buildOverpassQuery(localities[0], sectors, 60);
  assert.match(query, /\[out:json\]\[timeout:60\]/);
  assert.match(query, /nwr\["shop"="car_repair"\]\(around:9000,43\.1594,-79\.2469\)/);
  assert.doesNotMatch(query, /google|facebook|instagram/i);
});

test("normaliza sólo candidatos con nombre y sin etiqueta web", () => {
  const elements = [
    { type: "node", id: 10, lat: 43.16, lon: -79.24, tags: { name: "Taller, Norte", shop: "car_repair", phone: "+1 905 555 0100", "addr:housenumber": "12", "addr:street": "King St" } },
    { type: "way", id: 20, center: { lat: 43.10, lon: -79.09 }, tags: { name: "Taller Web", shop: "car_repair", "contact:website": "https://example.ca" } },
    { type: "node", id: 30, lat: 43.16, lon: -79.24, tags: { shop: "car_repair" } },
  ];
  const rows = normalizeElements(elements, { localities, sectors, only_without_website: true }, localities[0], "2026-08-13");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].Empresa, "Taller, Norte");
  assert.equal(rows[0].Ciudad, "St. Catharines");
  assert.equal(rows[0]["Website URL"], "");
  assert.equal(rows[0]["Estado de enriquecimiento"], "pendiente");
  assert.equal(rows[0]["Elegibilidad de contacto"], "pendiente de revisión");
  assert.equal(rows[0]["Base de consentimiento"], "no verificada");
  assert.match(rows[0]["Evidencia sin web"], /no prueba/i);
});

test("asigna la localidad de Niagara más cercana aunque la consulta se origine en otra", () => {
  const rows = normalizeElements([
    { type: "node", id: 40, lat: 43.105, lon: -79.19, tags: { name: "Thorold Auto", shop: "car_repair" } },
  ], { localities, sectors, only_without_website: true }, localities[0], "2026-08-13");
  assert.equal(rows[0].Ciudad, "Thorold");
});

test("deduplica por objeto OSM y genera columnas de la pestaña Leads", () => {
  const row = normalizeElements([
    { type: "node", id: 10, lat: 43.16, lon: -79.24, tags: { name: "Taller, Norte", shop: "car_repair" } },
  ], { localities, sectors, only_without_website: true }, localities[0], "2026-08-13")[0];
  const rows = deduplicate([row, { ...row, Ciudad: "Niagara Falls" }]);
  assert.equal(rows.length, 1);
  const csv = toCsv(rows);
  assert.equal(csv.split("\n")[0], SHEET_HEADERS.join(","));
  assert.match(csv, /"Taller, Norte"/);
  assert.doesNotMatch(csv, /_osmKey/);
});
