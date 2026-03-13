const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { parseJSON } = require('./parseJSON');

const model = new ChatOpenAI({
  modelName: 'gpt-4o',
  temperature: 0.8,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

async function generateCoverLetter(parsedResume, analyzedJD, skillMatch) {
  const response = await model.invoke([
    new SystemMessage(`You are an expert cover letter writer. Write personalized, compelling cover letters 
that highlight the candidate's most relevant experience and directly address the job requirements.
Be professional but personable. Avoid generic phrases like "I am writing to apply for".`),
    new HumanMessage(`Write a cover letter for this candidate applying to this job. Return JSON:
{
  "cover_letter": "Full cover letter text with paragraph breaks using \\n\\n"
}

CANDIDATE NAME: ${parsedResume.name}
CANDIDATE SUMMARY: ${parsedResume.summary}
MATCHED SKILLS: ${JSON.stringify(skillMatch.matched_skills)}
TOP EXPERIENCE: ${JSON.stringify(parsedResume.experience.slice(0, 2))}
JOB TITLE: ${analyzedJD.title}
JOB SUMMARY: ${analyzedJD.summary}
KEY RESPONSIBILITIES: ${JSON.stringify(analyzedJD.responsibilities.slice(0, 3))}`),
  ]);

  return parseJSON(response.content);
}

module.exports = { generateCoverLetter };