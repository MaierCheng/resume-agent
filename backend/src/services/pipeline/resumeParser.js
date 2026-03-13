const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { parseJSON } = require('./parseJSON');

const model = new ChatOpenAI({
  modelName: 'gpt-4o',
  temperature: 0,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

async function parseResume(resumeText) {
  const response = await model.invoke([
    new SystemMessage(`You are a resume parser. Extract structured information from the resume.
Return ONLY a valid JSON object with no markdown or explanation.`),
    new HumanMessage(`Parse this resume and return JSON with this exact structure:
{
  "name": "candidate full name",
  "summary": "2-3 sentence professional summary",
  "skills": ["skill1", "skill2", "skill3"],
  "experience": [
    {
      "company": "company name",
      "role": "job title",
      "duration": "start - end",
      "bullets": ["achievement 1", "achievement 2"]
    }
  ],
  "education": [
    {
      "school": "school name",
      "degree": "degree and major",
      "year": "graduation year"
    }
  ]
}

RESUME:
${resumeText}`),
  ]);

  return parseJSON(response.content);
}

module.exports = { parseResume };