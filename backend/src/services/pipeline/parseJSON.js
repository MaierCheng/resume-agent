function parseJSON(content) {
  // Remove ALL variations of markdown code blocks
  const cleaned = content
    .replace(/```[\w]*\n?/g, '')
    .replace(/```/g, '')
    .trim();
  return JSON.parse(cleaned);
}

module.exports = { parseJSON };