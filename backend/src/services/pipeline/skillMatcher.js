const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { computeEmbeddingMatchScore } = require('../embeddings');
const { parseJSON } = require('./parseJSON');

const model = new ChatOpenAI({
  modelName: 'gpt-4o',
  temperature: 0,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

async function matchSkills(parsedResume, analyzedJD) {
  const embeddingScore = await computeEmbeddingMatchScore(
    parsedResume.skills,
    analyzedJD.required_skills
  );

  const response = await model.invoke([
    new SystemMessage(`You are a technical recruiter. Compare a candidate's skills against job requirements.
Return ONLY a valid JSON object with no markdown or explanation.`),
    new HumanMessage(`Compare the candidate's profile against the job requirements and return JSON:
{
  "matched_skills": ["skills the candidate has that match the JD"],
  "skill_gaps": ["required skills the candidate is missing"],
  "ai_score": <number 0-100 based on overall fit>,
  "score_reasoning": "2-3 sentence explanation of the score"
}

CANDIDATE SKILLS: ${JSON.stringify(parsedResume.skills)}
CANDIDATE EXPERIENCE: ${JSON.stringify(parsedResume.experience)}
REQUIRED SKILLS: ${JSON.stringify(analyzedJD.required_skills)}
NICE TO HAVE: ${JSON.stringify(analyzedJD.nice_to_have_skills)}
EXPERIENCE REQUIRED: ${analyzedJD.experience_years} years`),
  ]);

  const aiAnalysis = parseJSON(response.content);

  const finalScore = Math.round(
    (embeddingScore * 0.5) + (aiAnalysis.ai_score * 0.5)
  );

  return {
    ...aiAnalysis,
    embedding_score: embeddingScore,
    final_score: finalScore,
  };
}

module.exports = { matchSkills };