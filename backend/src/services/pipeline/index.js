const { parseResume } = require('./resumeParser');
const { analyzeJD } = require('./jdAnalyzer');
const { matchSkills } = require('./skillMatcher');
const { rewriteResume } = require('./resumeRewriter');
const { generateCoverLetter } = require('./coverLetter');

async function runPipeline(resumeText, jobDescription, onProgress) {
  // Step 1: Parse Resume
  onProgress({ step: 1, label: 'Parsing resume...' });
  const parsedResume = await parseResume(resumeText);

  // Step 2: Analyze JD
  onProgress({ step: 2, label: 'Analyzing job description...' });
  const analyzedJD = await analyzeJD(jobDescription);

  // Step 3: Match Skills (embedding + AI)
  onProgress({ step: 3, label: 'Matching skills...' });
  const skillMatch = await matchSkills(parsedResume, analyzedJD);

  // Step 4: Rewrite Resume
  onProgress({ step: 4, label: 'Rewriting resume bullets...' });
  const rewrittenResume = await rewriteResume(parsedResume, analyzedJD, skillMatch);

  // Step 5: Generate Cover Letter
  onProgress({ step: 5, label: 'Generating cover letter...' });
  const coverLetter = await generateCoverLetter(parsedResume, analyzedJD, skillMatch);

  return {
    parsed_resume: parsedResume,
    analyzed_jd: analyzedJD,
    skill_match: skillMatch,
    rewritten_resume: rewrittenResume,
    cover_letter: coverLetter.cover_letter,
  };
}

module.exports = { runPipeline };