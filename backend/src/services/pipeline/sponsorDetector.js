const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { parseJSON } = require('./parseJSON');

const model = new ChatOpenAI({
  modelName: 'gpt-4o',
  temperature: 0,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// ── Layer 1: keyword matching ──────────────────────────────────────────────

const sponsorKeywords = [
  "visa sponsorship available", "visa sponsorship provided",
  "will sponsor visa", "will provide sponsorship",
  "h1b sponsorship available", "h-1b sponsorship",
  "we sponsor", "sponsorship offered",
  "opt accepted", "opt candidates welcome",
  "cpt accepted", "cpt candidates welcome",
  "f1 accepted", "f-1 accepted",
  "open to opt", "open to cpt", "stem opt",
];

const noSponsorKeywords = [
  "no visa sponsorship", "no sponsorship",
  "does not offer sponsorship", "unable to sponsor",
  "cannot sponsor", "cannot provide sponsorship",
  "not able to sponsor", "sponsorship is not available",
  "we do not sponsor", "must be authorized to work",
  "must be legally authorized", "without sponsorship",
  "without the need for sponsorship", "no work visa support",
  "us citizens only", "u.s. citizens only", "citizens only",
  "must be a us citizen", "must be a u.s. citizen",
  "citizen or permanent resident", "citizens and permanent residents only",
  "gc or citizen", "green card or citizen", "us citizen or green card",
  "us citizen or gc", "pr or citizen", "permanent resident or citizen",
  "must hold a green card", "security clearance required",
  "active security clearance", "secret clearance required",
  "top secret clearance", "ts/sci",
  "must be eligible for security clearance",
  "us citizenship required for clearance",
];

function detectKeywords(jdText) {
  const lower = jdText.toLowerCase();
  const foundSponsor = sponsorKeywords.filter(k => lower.includes(k));
  const foundNoSponsor = noSponsorKeywords.filter(k => lower.includes(k));
  return { foundSponsor, foundNoSponsor };
}

// ── Layer 2: LLM inference ─────────────────────────────────────────────────

async function llmInference(jdText, companyName) {
  const response = await model.invoke([
    new SystemMessage(`You are an immigration advisor helping international students (F-1 visa) evaluate job opportunities.
Return ONLY a valid JSON object with no markdown or explanation.`),
    new HumanMessage(`Analyze this job description and return JSON with this exact structure:
{
  "h1b_likelihood": "yes" | "no" | "unknown",
  "opt_likelihood": "yes" | "no" | "unknown",
  "cpt_likelihood": "yes" | "no" | "unknown",
  "company_size": "large" | "mid" | "small" | "unknown",
  "e_verify_likely": true | false,
  "signals": ["signal 1", "signal 2"],
  "reasoning": "2-3 sentence explanation"
}

Rules:
- If JD mentions security clearance → h1b/opt/cpt all "no"
- If JD says "citizens only" or "gc/citizen" → all "no"
- Large companies (Fortune 500, public, 1000+ employees) → e_verify_likely true
- Small startups (<50 people) → e_verify_likely unknown, cpt_likelihood lower
- If no visa mention at all → use company size and context to infer

COMPANY NAME: ${companyName || 'unknown'}
JOB DESCRIPTION: ${jdText}`)
  ]);

  return parseJSON(response.content);
}

// ── Main function ──────────────────────────────────────────────────────────

async function detectSponsor(jdText, companyName) {
  const { foundSponsor, foundNoSponsor } = detectKeywords(jdText);
  const llmResult = await llmInference(jdText, companyName);

  // Determine overall likelihood
  let overallLikelihood;
  if (foundNoSponsor.length > 0) {
    overallLikelihood = 'no';
  } else if (foundSponsor.length > 0) {
    overallLikelihood = 'yes';
  } else {
    // Fall back to LLM inference
    overallLikelihood = llmResult.h1b_likelihood;
  }

  return {
    overall_likelihood: overallLikelihood,        // yes / no / unknown
    h1b_likelihood: llmResult.h1b_likelihood,
    opt_likelihood: llmResult.opt_likelihood,
    cpt_likelihood: llmResult.cpt_likelihood,
    company_size: llmResult.company_size,
    e_verify_likely: llmResult.e_verify_likely,
    keyword_signals: {
      sponsor: foundSponsor,
      no_sponsor: foundNoSponsor,
    },
    llm_signals: llmResult.signals,
    reasoning: llmResult.reasoning,
  };
}

module.exports = { detectSponsor };