const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function analyzeResumeWithJD(resumeText, jobDescription) {
  const prompt = `
You are an expert career coach and resume analyst.

You will be given a candidate's resume and a job description.
Your job is to analyze them and return a structured JSON response.

---
RESUME:
${resumeText}

---
JOB DESCRIPTION:
${jobDescription}

---
Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "jd_summary": "2-3 sentence summary of the job role and key requirements",
  "match_score": <number from 0 to 100>,
  "match_reasoning": "1-2 sentences explaining the score",
  "skill_gaps": ["skill 1", "skill 2", "skill 3"],
  "rewritten_bullets": [
    "• Rewritten bullet point 1 tailored to the JD",
    "• Rewritten bullet point 2 tailored to the JD",
    "• Rewritten bullet point 3 tailored to the JD"
  ],
  "cover_letter": "Full cover letter text tailored to the job description"
}
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;

  // Parse the JSON response from GPT
  const result = JSON.parse(content);
  return result;
}

module.exports = { analyzeResumeWithJD };