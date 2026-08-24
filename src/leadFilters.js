const PRIORITY_RANK = { A: 1, B: 2, C: 3 };

export function normalizeLeadPriority(priority) {
  return String(priority || "").trim().toUpperCase();
}

export function filterAndSortLeads(leads, filters = {}) {
  const {
    status = "todos",
    batch = "todos",
    seller = "todos",
    city = "todos",
    industry = "todos",
    channel = "todos",
    priority = "todos",
    search = "",
    sort = "original",
  } = filters;

  const searchTerm = search.trim().toLowerCase();
  const filtered = leads.filter(lead => {
    const leadPriority = normalizeLeadPriority(lead.priority);
    if (status !== "todos" && lead.outbound_status !== status) return false;
    if (batch !== "todos" && lead.batch !== batch) return false;
    if (seller !== "todos" && lead.assigned_seller !== seller) return false;
    if (city !== "todos" && lead.city !== city) return false;
    if (industry !== "todos" && lead.industry !== industry) return false;
    if (priority === "sin_prioridad" && leadPriority) return false;
    if (priority !== "todos" && priority !== "sin_prioridad" && leadPriority !== priority) return false;

    if (searchTerm) {
      const searchable = [lead.company, lead.city, lead.industry, lead.owner_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(searchTerm)) return false;
    }

    const hasIG = Boolean(lead.instagram?.startsWith("http"));
    const hasFB = Boolean(lead.facebook?.startsWith("http"));
    const hasEmail = Boolean(lead.email?.includes("@"));
    if (channel === "instagram" && !hasIG) return false;
    if (channel === "email" && !hasEmail) return false;
    if (channel === "sin_social" && (hasIG || hasFB)) return false;
    return true;
  });

  if (sort === "original") return filtered;

  return filtered.map((lead, index) => ({ lead, index })).sort((a, b) => {
    if (sort === "score_desc") {
      const scoreDifference = (Number(b.lead.lead_score) || 0) - (Number(a.lead.lead_score) || 0);
      return scoreDifference || a.index - b.index;
    }

    const aRank = PRIORITY_RANK[normalizeLeadPriority(a.lead.priority)] || 4;
    const bRank = PRIORITY_RANK[normalizeLeadPriority(b.lead.priority)] || 4;
    if (aRank === 4 || bRank === 4) return aRank - bRank || a.index - b.index;
    const priorityDifference = sort === "priority_desc" ? aRank - bRank : bRank - aRank;
    return priorityDifference || a.index - b.index;
  }).map(({ lead }) => lead);
}
