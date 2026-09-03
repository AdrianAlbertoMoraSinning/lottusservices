const OPENAI_URL = "https://api.openai.com/v1/responses";

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type"
    },
    body: JSON.stringify(body)
  };
}

function outputText(response) {
  if (typeof response?.output_text === "string") return response.output_text.trim();
  const chunks = [];
  for (const item of response?.output || []) {
    for (const c of item?.content || []) {
      if ((c?.type === "output_text" || c?.type === "text") && typeof c.text === "string") chunks.push(c.text);
    }
  }
  return chunks.join("\n").trim();
}

function sourcesFrom(response) {
  const seen = new Set(), out = [];
  function add(url, title) {
    if (!url || seen.has(url) || !/^https?:\/\//i.test(url)) return;
    seen.add(url); out.push({url, title:title || null});
  }
  function walk(v) {
    if (!v) return;
    if (Array.isArray(v)) return v.forEach(walk);
    if (typeof v !== "object") return;
    if (typeof v.url === "string") add(v.url, v.title || v.name);
    if (v.action?.sources && Array.isArray(v.action.sources)) {
      for (const s of v.action.sources) add(s.url, s.title);
    }
    for (const val of Object.values(v)) walk(val);
  }
  walk(response?.output || []);
  return out.slice(0, 80);
}

function parseJson(text) {
  if (!text) return null;
  const cleaned = text.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"").trim();
  try { return JSON.parse(cleaned); } catch {}
  const a = cleaned.indexOf("{"), b = cleaned.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(cleaned.slice(a,b+1)); } catch {} }
  return null;
}

async function webResearch(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const model = process.env.OCTON_RESEARCH_MODEL || "gpt-5.6-terra";
  const r = await fetch(OPENAI_URL, {
    method:"POST",
    headers:{authorization:`Bearer ${apiKey}`,"content-type":"application/json"},
    body: JSON.stringify({
      model,
      store: false,
      tools:[{type:"web_search",search_context_size:process.env.OCTON_WEB_SEARCH_CONTEXT || "high"}],
      input: prompt
    })
  });
  const raw = await r.text();
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${raw.slice(0,800)}`);
  const response = JSON.parse(raw);
  const text = outputText(response);
  return {response,text,parsed:parseJson(text),sources:sourcesFrom(response)};
}

function normalizeFinding(f, dimension, inheritedSources=[]) {
  const allowed = new Set(["critical","high","medium","low","info"]);
  const severity = allowed.has(String(f?.severity||"").toLowerCase()) ? String(f.severity).toLowerCase() : "medium";
  return {
    id: f?.id || `${dimension}-${Math.random().toString(36).slice(2,10)}`,
    dimension,
    severity,
    title: String(f?.title || "Untitled finding").slice(0,180),
    evidence: f?.evidence ?? null,
    operationalImpact: f?.operationalImpact ?? f?.operational_impact ?? null,
    commercialImpact: f?.commercialImpact ?? f?.commercial_impact ?? null,
    recommendation: f?.recommendation ?? null,
    affectedFiles: Array.isArray(f?.affectedFiles) ? f.affectedFiles.slice(0,30) : [],
    proposedFix: f?.proposedFix ?? f?.proposed_fix ?? null,
    tests: Array.isArray(f?.tests) ? f.tests.slice(0,20) : [],
    rollback: f?.rollback ?? null,
    confidence: Number.isFinite(Number(f?.confidence)) ? Math.max(0,Math.min(1,Number(f.confidence))) : null,
    requiresHumanReview: Boolean(f?.requiresHumanReview ?? dimension === "compliance"),
    sources: (Array.isArray(f?.sources) && f.sources.length ? f.sources : inheritedSources).slice(0,20)
  };
}

module.exports = { jsonResponse, webResearch, normalizeFinding };
