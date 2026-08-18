import test from "node:test";
import assert from "node:assert/strict";
import { buildLeadRows, deduplicateLeadRows, leadIdentityKey } from "../src/leadImport.js";

test("identity prefers normalized email, then phone, then company and city", () => {
  assert.equal(leadIdentityKey({ email: " SALES@Example.COM " }), "email:sales@example.com");
  assert.equal(leadIdentityKey({ phone: "+1 (905) 555-0100" }), "phone:19055550100");
  assert.equal(leadIdentityKey({ company: "Clínica Norte", city: "Guayaquil" }), "company:clinica norte|guayaquil");
});

test("deduplication is deterministic and keeps the last enriched occurrence", () => {
  const rows = deduplicateLeadRows([
    { company: "A", email: "a@example.com", city: "Quito", problem: "old" },
    { company: "A SA", email: "A@example.com", city: "Quito", problem: "new" },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].problem, "new");
  assert.equal(rows[0].dedupe_key, "email:a@example.com");
});

test("sheet parsing records stable provenance and defaults CASL review to required", () => {
  const rows = buildLeadRows([
    ["Empresa", "Correo", "Ciudad", "Teléfono"],
    ["Acme", "INFO@ACME.COM", "Guayaquil", "099 111 2222"],
  ], { batch: "Pilot", assignSeller: null, sheetId: "sheet123", tab: "Leads" });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].source_external_id, "sheet123:Leads:2");
  assert.deepEqual(rows[0].source_evidence, { sheet_id: "sheet123", tab: "Leads", row_number: 2 });
  assert.equal(rows[0].contact_eligibility, "review_required");
  assert.equal(rows[0].consent_basis, "unknown");
});
