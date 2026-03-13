const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { parseJSON } = require('./parseJSON');

const model = new ChatOpenAI({
  modelName: 'gpt-4o',
  temperature: 0,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

async function analyzeJD(jobDescription) {
  const response = await model.invoke([
    new SystemMessage(`You are a job description analyst. Extract structured requirements from job descriptions.
Return ONLY a valid JSON object with no markdown or explanation.`),
    new HumanMessage(`Analyze this job description and return JSON with this exact structure:
{
  "title": "job title",
  "summary": "2-3 sentence summary of the role",
  "required_skills": ["skill1", "skill2"],
  "nice_to_have_skills": ["skill1", "skill2"],
  "experience_years": 3,
  "responsibilities": ["responsibility1", "responsibility2"]
}

JOB DESCRIPTION:
${jobDescription}`),
  ]);

  return parseJSON(response.content);
}

module.exports = { analyzeJD };