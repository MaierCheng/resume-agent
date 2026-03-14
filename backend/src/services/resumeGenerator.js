const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PDFLATEX = '/Library/TeX/texbin/pdflatex';
const TEMPLATE_PATH = path.join(__dirname, '../latex/template.tex');
const OUTPUT_BASE = path.join(__dirname, '../../../output');

// Escape special LaTeX characters (but preserve \textbf{} we insert)
function escapeLatex(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

// Bold numbers and key metrics in bullet points (e.g. 40%, 500+, $1M)
function boldMetrics(str) {
  if (!str) return '';
  const escaped = escapeLatex(str);
  // Bold percentages, numbers with +, dollar amounts
  return escaped
    .replace(/(\d+\\\+)/g, '\\textbf{$1}')
    .replace(/(\d+\\%)/g, '\\textbf{$1}')
    .replace(/(\\\$[\d,]+[KkMmBb]?)/g, '\\textbf{$1}')
    .replace(/(\d{1,3}(?:,\d{3})+)/g, '\\textbf{$1}');
}

// Extract username from URL
function extractUsername(url) {
  if (!url) return '';
  const parts = url.replace(/\/$/, '').split('/');
  return parts[parts.length - 1];
}

// Build education section
function buildEducation(parsedResume) {
  const edu = parsedResume.education?.[0];
  if (!edu) return '';
  return `\\resumeSubheading
    {${escapeLatex(edu.school)}}{${escapeLatex(edu.location || 'Boston, MA')}}
    {${escapeLatex(edu.degree)}}{${escapeLatex(edu.duration || `Sept. 2024 -- ${edu.year || '2027'}`)}}`
}

// Build experience section
function buildExperience(experiences) {
  const workExps = experiences.filter(e => e.type === 'work');
  if (!workExps.length) return '';
  return workExps.map(exp => {
    const bullets = exp.bullets
      .map(b => `        \\resumeItem{${boldMetrics(b.rewritten || b.original)}}`)
      .join('\n');
    return `    \\resumeSubheading
      {${escapeLatex(exp.company)}}{${escapeLatex(exp.location || '')}}
      {${escapeLatex(exp.role)}}{${escapeLatex(exp.duration || '')}}
      \\resumeItemListStart
${bullets}
      \\resumeItemListEnd`;
  }).join('\n\n');
}

// Build projects section
function buildProjects(experiences) {
  const projects = experiences.filter(e => e.type === 'project');
  if (!projects.length) return '';
  return projects.map(exp => {
    const bullets = exp.bullets
      .map(b => `        \\resumeItem{${boldMetrics(b.rewritten || b.original)}}`)
      .join('\n');
    return `    \\resumeProjectHeading
      {\\textbf{${escapeLatex(exp.company)}} $|$ \\emph{\\small{${escapeLatex(exp.role)}}}}{}
      \\resumeItemListStart
${bullets}
      \\resumeItemListEnd`;
  }).join('\n\n');
}

async function generateResumePDF(parsedResume, rewrittenResume, analyzedJD) {
  const company = (analyzedJD.company || 'Company').replace(/[^a-zA-Z0-9]/g, '');
  const title = (analyzedJD.title || 'Role').replace(/[^a-zA-Z0-9]/g, '');
  const date = new Date().toISOString().split('T')[0];
  const folderName = `${company}_${title}_${date}`;
  const outputDir = path.join(OUTPUT_BASE, folderName);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let tex = fs.readFileSync(TEMPLATE_PATH, 'utf8');

  // Personal info
  const linkedinUrl = parsedResume.linkedin || 'https://linkedin.com';
  const githubUrl = parsedResume.github || 'https://github.com';
  const linkedinUser = extractUsername(linkedinUrl);
  const githubUser = extractUsername(githubUrl);

  tex = tex.replace('{{NAME}}', escapeLatex(parsedResume.name || 'Your Name'));
  tex = tex.replace('{{PHONE}}', escapeLatex(parsedResume.phone || ''));
  tex = tex.replaceAll('{{EMAIL}}', escapeLatex(parsedResume.email || ''));
  tex = tex.replace('{{LINKEDIN}}', linkedinUrl);
  tex = tex.replace('{{LINKEDIN_USER}}', escapeLatex(linkedinUser));
  tex = tex.replace('{{GITHUB}}', githubUrl);
  tex = tex.replace('{{GITHUB_USER}}', escapeLatex(githubUser));

  // Sections
  tex = tex.replace('{{EDUCATION}}', buildEducation(parsedResume));
  tex = tex.replace('{{EXPERIENCE}}', buildExperience(rewrittenResume.experiences));

  // Projects section — only render if there are projects
  const projectsContent = buildProjects(rewrittenResume.experiences);
  const projectsSection = projectsContent
    ? `\\section{Projects}\n  \\resumeSubHeadingListStart\n${projectsContent}\n  \\resumeSubHeadingListEnd`
    : '';
  tex = tex.replace('{{PROJECTS_SECTION}}', projectsSection);

  // Skills
  tex = tex.replace('{{SKILLS_LANGUAGES}}', escapeLatex(parsedResume.skills_languages || ''));
  tex = tex.replace('{{SKILLS_FRAMEWORKS}}', escapeLatex(parsedResume.skills_frameworks || ''));
  tex = tex.replace('{{SKILLS_TOOLS}}', escapeLatex(parsedResume.skills_tools || ''));

  const texPath = path.join(outputDir, 'resume.tex');
  fs.writeFileSync(texPath, tex);

  const compileCmd = `${PDFLATEX} -interaction=nonstopmode -output-directory="${outputDir}" "${texPath}"`;
  const compileEnv = { ...process.env, PATH: `/Library/TeX/texbin:${process.env.PATH}` };

  execSync(compileCmd, { timeout: 30000, env: compileEnv });
  execSync(compileCmd, { timeout: 30000, env: compileEnv });

  const pdfPath = path.join(outputDir, 'resume.pdf');
  if (!fs.existsSync(pdfPath)) {
    throw new Error('PDF compilation failed — check the .tex file for errors');
  }

  return { pdfPath, outputDir, folderName };
}

async function generateCoverLetterPDF(coverLetterText, parsedResume, analyzedJD) {
  const company = (analyzedJD.company || 'Company').replace(/[^a-zA-Z0-9]/g, '');
  const title = (analyzedJD.title || 'Role').replace(/[^a-zA-Z0-9]/g, '');
  const date = new Date().toISOString().split('T')[0];
  const folderName = `${company}_${title}_${date}`;
  const outputDir = path.join(OUTPUT_BASE, folderName);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const paragraphs = coverLetterText
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => escapeLatex(p.trim()))
    .join('\n\n');

  const tex = `\\documentclass[letterpaper,11pt]{article}
\\usepackage[left=1in,right=1in,top=1in,bottom=1in]{geometry}
\\usepackage{parskip}
\\usepackage[hidelinks]{hyperref}
\\pagestyle{empty}
\\begin{document}

\\textbf{${escapeLatex(parsedResume.name || '')}}\\\\
${escapeLatex(parsedResume.phone || '')} $|$ \\href{mailto:${escapeLatex(parsedResume.email || '')}}{${escapeLatex(parsedResume.email || '')}}\\\\
${date}

\\vspace{1em}

${paragraphs}

\\end{document}`;

  const texPath = path.join(outputDir, 'cover_letter.tex');
  fs.writeFileSync(texPath, tex);

  const compileCmd = `${PDFLATEX} -interaction=nonstopmode -output-directory="${outputDir}" "${texPath}"`;
  const compileEnv = { ...process.env, PATH: `/Library/TeX/texbin:${process.env.PATH}` };

  execSync(compileCmd, { timeout: 30000, env: compileEnv });

  const pdfPath = path.join(outputDir, 'cover_letter.pdf');
  if (!fs.existsSync(pdfPath)) {
    throw new Error('Cover letter PDF compilation failed');
  }

  return { pdfPath, folderName };
}

module.exports = { generateResumePDF, generateCoverLetterPDF };