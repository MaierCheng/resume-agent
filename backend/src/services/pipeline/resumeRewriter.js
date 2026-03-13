const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { parseJSON } = require('./parseJSON');

const model = new ChatOpenAI({
  modelName: 'gpt-4o',
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

async function rewriteResume(parsedResume, analyzedJD, skillMatch) {
  const response = await model.invoke([
    new SystemMessage(`You are an expert resume writer. Rewrite resume bullets to better match a specific job description.
Use strong action verbs, quantify achievements where possible, and mirror the language of the JD.
Return ONLY a valid JSON object with no markdown or explanation.`),
    new HumanMessage(`Rewrite the resume bullets to better match this job. Return JSON:
{
  "rewritten_bullets": [
    "• Rewritten bullet 1",
    "• Rewritten bullet 2",
    "• Rewritten bullet 3",
    "• Rewritten bullet 4",
    "• Rewritten bullet 5"
  ],
  "tips": ["tip1 for improving the resume", "tip2"]
}

CANDIDATE NAME: ${parsedResume.name}
ORIGINAL BULLETS: ${JSON.stringify(parsedResume.experience.flatMap(e => e.bullets))}
JOB TITLE: ${analyzedJD.title}
KEY REQUIREMENTS: ${JSON.stringify(analyzedJD.required_skills)}
SKILL GAPS TO ADDRESS: ${JSON.stringify(skillMatch.skill_gaps)}`),
  ]);

  return parseJSON(response.content);
}

module.exports = { rewriteResume };