const empty = value => String(value ?? "").trim();

const observedTimestamp = value => {
  const text = empty(value);
  if (!text) return new Date().toISOString();
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00Z` : text);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

export function normalizeEmail(value) {
  return empty(value).toLowerCase();
}

export function normalizePhone(value) {
  return empty(value).replace(/\D/g, "");
}

export function normalizeName(value) {
  return empty(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function leadIdentityKey(lead) {
  const email = normalizeEmail(lead.email);
  if (email && email.includes("@")) return `email:${email}`;
  const phone = normalizePhone(lead.whatsapp || lead.phone);
  if (phone.length >= 7) return `phone:${phone}`;
  return `company:${normalizeName(lead.company)}|${normalizeName(lead.city)}`;
}

export function deduplicateLeadRows(rows) {
  const unique = new Map();
  for (const row of rows) {
    const dedupeKey = leadIdentityKey(row);
    if (!dedupeKey.endsWith(":")) unique.set(dedupeKey, { ...row, dedupe_key: dedupeKey });
  }
  return [...unique.values()];
}

export function buildLeadRows(data, { batch, assignSeller, sheetId, tab }) {
  let headerIdx = data.findIndex(row => row.some(cell => cell && /empresa|company|médico|medico|nombre del|razón social|razon social/i.test(String(cell))));
  if (headerIdx === -1) {
    let maxCells = 0;
    data.forEach((row, index) => {
      const filled = row.filter(cell => cell && String(cell).trim()).length;
      if (filled > maxCells && filled >= 4) { maxCells = filled; headerIdx = index; }
    });
  }
  if (headerIdx === -1) headerIdx = 0;

  const headers = data[headerIdx].map(header => empty(header).toLowerCase());
  const col = (...names) => headers.findIndex(header => names.some(name => header.includes(name)));
  const exactCol = (...names) => headers.findIndex(header => names.includes(header));
  const idx = {
    lead_id: col("orden", "lead id"),
    company: col("médico", "medico", "empresa", "company", "nombre del", "razón social", "razon social", "negocio", "clínica", "clinica", "consultorio", "doctor"),
    industry: col("especialidad", "enfoque", "industria", "industry"), city: col("ciudad", "city"),
    address: col("dirección", "direccion", "address"), phone: col("teléfono", "telefono", "phone"),
    email: col("email", "correo electrónico", "correo"), instagram: col("instagram"), facebook: col("facebook"), linkedin: col("linkedin"),
    owner: col("responsable", "propietario", "gerente", "owner"), role: col("cargo", "role"),
    website: col("estado website", "estado web", "estado de la página", "website"),
    problem: col("pain point", "diagnóstico comercial", "diagnostico comercial", "problema detectado", "problem"),
    opportunity: col("tipo de oportunidad", "ángulo de venta", "angulo de venta", "oportunidad"),
    solution: col("servicio recomendado", "solución web", "solucion web", "solution"),
    priority: col("prioridad"), score: col("lead score", "score"), message: col("mensaje inicial dm", "mensaje inicial"),
    obs: col("observaciones", "resultado"), email_subject: col("asunto de email", "asunto"),
    email_body: col("respuesta si muestra interés", "respuesta si muestra interes", "email inicial"),
    followup_1: col("seguimiento 1"), followup_2: col("seguimiento 2"), whatsapp: col("whatsapp"),
    rating: col("rating google", "rating"), whatsapp_msg: col("mensaje whatsapp"),
    website_url: col("website", "sitio web", "página web", "pagina web"), maps: col("google maps", "maps"),
    country: col("país", "pais", "country"), province: col("provincia", "province", "estado", "state"),
    source_url: col("fuente", "source url", "url fuente", "perfil google", "google business"),
    evidence_url: exactCol("evidencia", "evidence", "url evidencia", "evidence url"),
    no_website_evidence: col("evidencia sin web", "evidencia sin sitio"),
    research_date: col("fecha de investigación", "fecha de investigacion", "research date"),
    enrichment_status: col("estado de enriquecimiento", "enrichment status"),
    opt_out_status: col("estado de baja", "opt out status", "unsubscribe status"),
  };
  const companyIdx = idx.company >= 0 ? idx.company : 0;
  const sourceUrl = `https://docs.google.com/spreadsheets/d/${sheetId}`;
  const value = (row, index) => index >= 0 ? row[index] : "";

  const rows = data.slice(headerIdx + 1)
    .map((row, offset) => ({ row, rowNumber: headerIdx + offset + 2 }))
    .filter(({ row }) => empty(row[companyIdx]))
    .map(({ row, rowNumber }) => {
      const providedSourceUrl = empty(value(row, idx.source_url));
      const evidenceUrl = empty(value(row, idx.evidence_url));
      const noWebsiteEvidence = empty(value(row, idx.no_website_evidence));
      const websiteUrl = empty(value(row, idx.website_url));
      const optOutStatus = empty(value(row, idx.opt_out_status)).toLowerCase();
      return ({
      lead_id: empty(value(row, idx.lead_id)), company: empty(row[companyIdx]), industry: empty(value(row, idx.industry)),
      city: empty(value(row, idx.city)), address: empty(value(row, idx.address)), phone: empty(value(row, idx.phone)),
      email: normalizeEmail(value(row, idx.email)), instagram: empty(value(row, idx.instagram)), facebook: empty(value(row, idx.facebook)),
      linkedin: empty(value(row, idx.linkedin)), owner_name: empty(value(row, idx.owner)), owner_role: empty(value(row, idx.role)),
      website_status: empty(value(row, idx.website)), problem: empty(value(row, idx.problem)), opportunity: empty(value(row, idx.opportunity)),
      recommended_solution: empty(value(row, idx.solution)), priority: empty(value(row, idx.priority)),
      lead_score: Number.parseFloat(value(row, idx.score)) || 0, initial_message: empty(value(row, idx.message)),
      observations: empty(value(row, idx.obs)), batch: batch || "Lote sin nombre", outbound_status: "sin_contactar",
      email_subject: empty(value(row, idx.email_subject)), email_body: empty(value(row, idx.email_body)),
      followup_1: empty(value(row, idx.followup_1)), followup_2: empty(value(row, idx.followup_2)),
      whatsapp: empty(value(row, idx.whatsapp)), rating: empty(value(row, idx.rating)), whatsapp_message: empty(value(row, idx.whatsapp_msg)),
      country: empty(value(row, idx.country)), province: empty(value(row, idx.province)),
      website_url: websiteUrl, maps_url: empty(value(row, idx.maps)),
      has_website: Boolean(websiteUrl),
      assigned_seller: assignSeller || null, source_system: "google_sheets", source_external_id: `${sheetId}:${tab}:${rowNumber}`,
      source_url: providedSourceUrl || sourceUrl,
      source_evidence: { sheet_id: sheetId, tab, row_number: rowNumber, ...(evidenceUrl ? { evidence_url: evidenceUrl } : {}) },
      source_observed_at: observedTimestamp(value(row, idx.research_date)),
      enrichment_status: "imported",
      enrichment_evidence: { no_website_evidence: noWebsiteEvidence || null, imported_status: empty(value(row, idx.enrichment_status)) || null },
      contact_eligibility: "review_required", consent_basis: "unknown",
      do_not_contact: /^(si|sí|yes|true|baja|unsubscribed|opted out)$/.test(optOutStatus),
    });
    });
  return deduplicateLeadRows(rows);
}
