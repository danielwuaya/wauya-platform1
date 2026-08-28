import test from "node:test";
import assert from "node:assert/strict";
import { buildLeadRows, chunkLeadRows, cleanPhoneValue, deduplicateLeadRows, leadIdentityKey, normalizeOutboundStatus } from "../src/leadImport.js";

test("identity keeps separate branches even when they share contact details", () => {
  assert.equal(leadIdentityKey({ company: "Clínica Norte", city: "Guayaquil", address: "Av. 1" }), "business:clinica norte|guayaquil|av 1");
  assert.notEqual(
    leadIdentityKey({ company: "Taller Uno", city: "Durham", address: "100 Main", phone: "+1 919 555 0100" }),
    leadIdentityKey({ company: "Taller Dos", city: "Durham", address: "200 Main", phone: "+1 919 555 0100" }),
  );
  assert.equal(leadIdentityKey({ email: " SALES@Example.COM " }), "email:sales@example.com");
});

test("deduplication is deterministic and keeps the last enriched occurrence", () => {
  const rows = deduplicateLeadRows([
    { company: "A", email: "a@example.com", city: "Quito", problem: "old" },
    { company: "A", email: "A@example.com", city: "Quito", problem: "new" },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].problem, "new");
  assert.equal(rows[0].dedupe_key, "business:a|quito|");
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

test("reads the complete Wuaya cold-lead sheet format", () => {
  const headers = [
    "**Empresa**", "**Industria**", "**País**", "**Ciudad**", "**Dirección**", "**Google Maps Link**",
    "**Teléfono**", "**Email**", "**Instagram**", "**Facebook**", "**LinkedIn empresa**",
    "**Propietario/Gerente**", "**Cargo**", "**Estado de la página**", "**Problema detectado**",
    "**Oportunidad**", "**Solución web**", "**Prioridad**", "**Lead Score**", "**Mensaje inicial**",
    "**Observaciones**", "**Asunto de email**", "**Email inicial**", "**Seguimiento 1**", "**Seguimiento 2**",
    "**Send Status**", "**AI Decision**", "**AI Reason**", "**AI Sales Angle**", "**Final Subject**",
    "**Final Email**", "**Sent Date**", "**Reply Status**", "**Source Base**",
  ];
  const values = [
    "Taller Norte", "Automotriz", "Canadá", "Toronto", "123 Main St", "https://maps.google.com/example",
    "+1 416 555 0100", "VENTAS@TALLER.CA", "https://instagram.com/taller", "https://facebook.com/taller",
    "https://linkedin.com/company/taller", "Ana Pérez", "Gerente", "Sin página", "No recibe solicitudes web",
    "Captar cotizaciones", "Landing page", "A", "91", "Hola por Instagram", "Creado manualmente",
    "Propuesta para Taller Norte", "Cuerpo inicial", "Seguimiento uno", "Seguimiento dos", "Sent",
    "GO", "Buen ajuste", "Cotizaciones online", "Asunto definitivo", "Email definitivo", "2026-08-25",
    "Replied", "Toronto manual",
  ];

  const [lead] = buildLeadRows([headers, values], {
    batch: "", assignSeller: null, sheetId: "sheet-full", tab: "Leads",
  });

  assert.equal(lead.company, "Taller Norte");
  assert.equal(lead.country, "Canadá");
  assert.equal(lead.maps_url, "https://maps.google.com/example");
  assert.equal(lead.linkedin, "https://linkedin.com/company/taller");
  assert.equal(lead.website_status, "Sin página");
  assert.equal(lead.priority, "A");
  assert.equal(lead.lead_score, 91);
  assert.equal(lead.outbound_status, "respondio");
  assert.equal(lead.ai_decision, "GO");
  assert.equal(lead.ai_reason, "Buen ajuste");
  assert.equal(lead.ai_sales_angle, "Cotizaciones online");
  assert.equal(lead.final_subject, "Asunto definitivo");
  assert.equal(lead.final_email, "Email definitivo");
  assert.equal(lead.sent_at, "2026-08-25T00:00:00.000Z");
  assert.equal(lead.reply_status, "Replied");
  assert.equal(lead.source_base, "Toronto manual");
  assert.equal(lead.batch, "Toronto manual");
});

test("keeps manual pipeline status when the sheet has no send or reply status", () => {
  const [lead] = buildLeadRows([
    ["Empresa", "Email", "Send Status", "Reply Status"],
    ["Acme", "info@acme.com", "", ""],
  ], { batch: "Manual", assignSeller: null, sheetId: "sheet-status", tab: "Leads" });
  assert.equal(lead.outbound_status, null);
});

test("normalizes spreadsheet statuses and splits large imports", () => {
  assert.equal(normalizeOutboundStatus("Sent", ""), "escrito");
  assert.equal(normalizeOutboundStatus("", "No Reply"), "no_respondio");
  assert.equal(normalizeOutboundStatus("", "Replied"), "respondio");
  assert.equal(normalizeOutboundStatus("Pending", ""), "sin_contactar");
  assert.deepEqual(chunkLeadRows(Array.from({ length: 1001 }), 500).map(chunk => chunk.length), [500, 500, 1]);
});

test("recovers phone-like formulas and rejects spreadsheet errors", () => {
  assert.equal(cleanPhoneValue("=+1 905-688-4760"), "+1 905-688-4760");
  assert.equal(cleanPhoneValue("#NAME?"), "");
  assert.equal(cleanPhoneValue("No encontrado"), "");
});
