const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { parseJSON } = require('./parseJSON');

const model = new ChatOpenAI({
  modelName: 'gpt-4o',
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

async function rewriteResume(parsedResume, analyzedJD, skillMatch) {
  const workExperience = parsedResume.experience || [];
  const projects = parsedResume.projects || [];

  const workItems = workExperience.map(exp => ({
    company: exp.company,
    role: exp.role,
    type: 'work',
    location: exp.location || '',
    duration: exp.duration || '',
    bullets: exp.bullets,
  }));

  const projectItems = projects.map(proj => ({
    company: proj.name,
    role: proj.tech,
    type: 'project',
    location: '',
    duration: '',
    bullets: proj.bullets,
  }));

  const allItems = [...workItems, ...projectItems];

  const response = await model.invoke([
    new SystemMessage(`You are an expert resume writer. Rewrite resume bullets to better match a job description.
Use strong action verbs, quantify achievements where possible, and mirror the JD language.
Return ONLY a valid JSON object with no markdown or explanation.`),
    new HumanMessage(`Rewrite the bullets for every entry below. Return JSON with this exact structure:
{
  "experiences": [
    {
      "company": "same as input",
      "role": "same as input",
      "type": "same as input (work or project)",
      "location": "same as input",
      "duration": "same as input",
      "bullets": [
        { "original": "original bullet text", "rewritten": "rewritten bullet" }
      ]
    }
  ],
  "tips": ["tip1", "tip2"]
}

CRITICAL: You must return ALL ${allItems.length} entries. Do not skip any.

ENTRIES TO REWRITE:
${JSON.stringify(allItems, null, 2)}

JOB TITLE: ${analyzedJD.title}
KEY REQUIREMENTS: ${JSON.stringify(analyzedJD.required_skills)}
SKILL GAPS: ${JSON.stringify(skillMatch.skill_gaps)}`),
  ]);

  return parseJSON(response.content);
}

module.exports = { rewriteResume };