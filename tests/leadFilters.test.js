import test from "node:test";
import assert from "node:assert/strict";
import { filterAndSortLeads, normalizeLeadPriority } from "../src/leadFilters.js";

const leads = [
  { id: "1", company: "Lead B", city: "Toronto", industry: "Salud", priority: "B", lead_score: 70 },
  { id: "2", company: "Lead C", city: "Montreal", industry: "Legal", priority: "c", lead_score: 90 },
  { id: "3", company: "Lead A", city: "Toronto", industry: "Salud", priority: " A ", lead_score: 80 },
  { id: "4", company: "Sin prioridad", city: "Ottawa", industry: "Retail", priority: "", lead_score: 40 },
];

test("normaliza las prioridades importadas", () => {
  assert.equal(normalizeLeadPriority(" a "), "A");
  assert.equal(normalizeLeadPriority(null), "");
});

test("filtra leads por prioridad A, B o C", () => {
  assert.deepEqual(filterAndSortLeads(leads, { priority: "A" }).map(lead => lead.id), ["3"]);
  assert.deepEqual(filterAndSortLeads(leads, { priority: "B" }).map(lead => lead.id), ["1"]);
  assert.deepEqual(filterAndSortLeads(leads, { priority: "C" }).map(lead => lead.id), ["2"]);
  assert.deepEqual(filterAndSortLeads(leads, { priority: "sin_prioridad" }).map(lead => lead.id), ["4"]);
});

test("ordena por prioridad y mantiene estable el resto", () => {
  assert.deepEqual(filterAndSortLeads(leads, { sort: "priority_desc" }).map(lead => lead.id), ["3", "1", "2", "4"]);
  assert.deepEqual(filterAndSortLeads(leads, { sort: "priority_asc" }).map(lead => lead.id), ["2", "1", "3", "4"]);
});

test("ordena por score de mayor a menor", () => {
  assert.deepEqual(filterAndSortLeads(leads, { sort: "score_desc" }).map(lead => lead.id), ["2", "3", "1", "4"]);
});

test("combina prioridad con los filtros existentes", () => {
  const result = filterAndSortLeads(leads, { priority: "A", city: "Toronto", search: "lead" });
  assert.deepEqual(result.map(lead => lead.id), ["3"]);
});
