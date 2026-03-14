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
    new SystemMessage(`You are a resume parser. Extract ALL information from the resume accurately.
Return ONLY a valid JSON object with no markdown or explanation.`),
    new HumanMessage(`Parse this resume and return JSON with this exact structure:
{
  "name": "candidate full name",
  "phone": "phone number, look carefully — it may appear near the top of the resume",
  "email": "email address, look carefully — it may appear near the top",
  "linkedin": "full linkedin URL including https://, or empty string",
  "github": "full github URL including https://, or empty string",
  "summary": "2-3 sentence professional summary based on their experience",
  "skills": ["every skill mentioned anywhere in the resume"],
  "skills_languages": "comma separated list of programming languages only (e.g. Java, Python, JavaScript)",
  "skills_frameworks": "comma separated list of frameworks and libraries only (e.g. Spring Boot, React, Node.js)",
  "skills_tools": "comma separated list of tools, platforms, and systems only (e.g. Docker, Git, AWS, Kafka)",
  "experience": [
    {
      "company": "company name",
      "role": "job title",
      "location": "city, state/country",
      "duration": "start date - end date (e.g. Jul 2022 - Mar 2024)",
      "bullets": ["bullet point 1", "bullet point 2"]
    }
  ],
  "projects": [
    {
      "name": "project name",
      "tech": "comma separated tech stack",
      "bullets": ["bullet point 1", "bullet point 2"]
    }
  ],
  "education": [
    {
      "school": "school name",
      "degree": "degree and major",
      "location": "city, state",
      "duration": "start date - end date (e.g. Sept. 2024 -- May 2027)",
      "year": "graduation year or expected year"
    }
  ]
}

Important:
- Phone and email are usually at the very top of the resume near the name
- LinkedIn URLs often look like: linkedin.com/in/username — prepend https:// if missing
- GitHub URLs often look like: github.com/username — prepend https:// if missing
- Separate skills carefully: languages vs frameworks vs tools
- Projects section is separate from work experience

RESUME:
${resumeText}`),
  ]);

  return parseJSON(response.content);
}

module.exports = { parseResume };