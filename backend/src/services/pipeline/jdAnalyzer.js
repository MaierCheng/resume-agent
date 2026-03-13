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
  "company": "company name, or unknown if not mentioned",
  "summary": "2-3 sentence summary of the role",
  "required_skills": ["extract EVERY technical skill mentioned: programming languages, frameworks, libraries, tools, platforms, and concepts. Include all of them — do not summarize or limit. Exclude soft skills like communication or teamwork."],
  "nice_to_have_skills": ["same rules as required_skills but for preferred/bonus skills only"],
  "experience_years": <number, use 0 if not specified>,
  "responsibilities": ["responsibility 1", "responsibility 2"]
}

JOB DESCRIPTION:
${jobDescription}`),
  ]);

  return parseJSON(response.content);
}

module.exports = { analyzeJD };