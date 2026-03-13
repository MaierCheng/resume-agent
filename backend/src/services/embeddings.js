const { OpenAIEmbeddings } = require('@langchain/openai');

const embeddings = new OpenAIEmbeddings({
  modelName: 'text-embedding-3-small',
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// Compare resume skills against JD required skills using embeddings
async function computeEmbeddingMatchScore(resumeSkills, jdSkills) {
  if (!resumeSkills.length || !jdSkills.length) return 0;

  // Embed all skills as single strings for comparison
  const resumeText = resumeSkills.join(', ');
  const jdText = jdSkills.join(', ');

  const [resumeVec, jdVec] = await Promise.all([
    embeddings.embedQuery(resumeText),
    embeddings.embedQuery(jdText),
  ]);

  // Convert similarity (-1 to 1) to a score (0 to 100)
  const similarity = cosineSimilarity(resumeVec, jdVec);
  const score = Math.round(((similarity + 1) / 2) * 100);

  return score;
}

module.exports = { computeEmbeddingMatchScore };