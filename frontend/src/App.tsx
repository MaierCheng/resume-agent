import { useState } from 'react'

interface SponsorResult {
  overall_likelihood: string
  h1b_likelihood: string
  opt_likelihood: string
  cpt_likelihood: string
  company_size: string
  e_verify_likely: boolean
  keyword_signals: { sponsor: string[], no_sponsor: string[] }
  llm_signals: string[]
  reasoning: string
}

interface SkillMatch {
  matched_skills: string[]
  skill_gaps: string[]
  ai_score: number
  embedding_score: number
  final_score: number
  score_reasoning: string
}

interface Bullet {
  original: string
  rewritten: string
}

interface Experience {
  company: string
  role: string
  type: 'work' | 'project'
  bullets: Bullet[]
}

interface RewrittenResume {
  experiences: Experience[]
  tips: string[]
}

interface AnalysisResult {
  parsed_resume: {
    name: string
    phone: string
    email: string
    linkedin: string
    github: string
    summary: string
    skills: string[]
    skills_languages: string
    skills_frameworks: string
    skills_tools: string
    experience: { company: string; role: string; duration: string; bullets: string[] }[]
    education: { school: string; degree: string; year: string }[]
  }
  analyzed_jd: {
    title: string
    company: string
    summary: string
    required_skills: string[]
  }
  skill_match: SkillMatch
  rewritten_resume: RewrittenResume
  cover_letter: string
  sponsor: SponsorResult
}

interface ProgressStep {
  step: number
  label: string
}

const STEPS = [
  'Extracting PDF...',
  'Parsing resume...',
  'Analyzing JD...',
  'Matching skills...',
  'Rewriting bullets...',
  'Generating cover letter...',
  'Checking visa sponsorship...',
]

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 75 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{score}/100</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

function LikelihoodBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    yes: 'bg-green-50 border-green-200 text-green-700',
    no: 'bg-red-50 border-red-200 text-red-700',
    unknown: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  }
  const labels: Record<string, string> = { yes: 'Likely', no: 'Unlikely', unknown: 'Unknown' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${styles[value] || styles.unknown}`}>
      {labels[value] || 'Unknown'}
    </span>
  )
}

function BulletCompare({
  bullet,
  onChange,
}: {
  bullet: Bullet
  onChange: (rewritten: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(bullet.rewritten)

  return (
    <div className="border border-gray-100 rounded-lg p-3 mb-2">
      <div className="flex gap-2 mb-2">
        <span className="text-xs font-medium text-red-500 mt-0.5 shrink-0">Before</span>
        <p className="text-xs text-gray-500 line-through">{bullet.original}</p>
      </div>
      <div className="flex gap-2 items-start">
        <span className="text-xs font-medium text-green-600 mt-0.5 shrink-0">After</span>
        {editing ? (
          <div className="flex-1">
            <textarea
              className="w-full text-xs text-gray-800 border border-blue-300 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={3}
              value={value}
              onChange={e => setValue(e.target.value)}
            />
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => { onChange(value); setEditing(false) }}
                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >Save</button>
              <button
                onClick={() => { setValue(bullet.rewritten); setEditing(false) }}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
              >Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-start justify-between gap-2">
            <p className="text-xs text-gray-800">{value}</p>
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-blue-500 hover:text-blue-700 shrink-0"
            >Edit</button>
          </div>
        )}
      </div>
    </div>
  )
}

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<ProgressStep | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [coverLetter, setCoverLetter] = useState('')
  const [editingCover, setEditingCover] = useState(false)
  const [error, setError] = useState('')
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [generatingCoverPDF, setGeneratingCoverPDF] = useState(false)

  const handleSubmit = async () => {
    if (!file || !jobDescription.trim()) {
      setError('Please upload a resume and enter a job description.')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    setProgress(null)

    const formData = new FormData()
    formData.append('resume', file)
    formData.append('jobDescription', jobDescription)

    try {
      const response = await fetch('/api/analyze', { method: 'POST', body: formData })
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const json = JSON.parse(line.slice(6))
          if (json.type === 'progress') setProgress({ step: json.step, label: json.label })
          else if (json.type === 'result') {
            setResult(json.data)
            setExperiences(json.data.rewritten_resume.experiences)
            setCoverLetter(json.data.cover_letter)
          }
          else if (json.type === 'error') setError(json.message)
        }
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  const handleBulletChange = (expIdx: number, bulletIdx: number, rewritten: string) => {
    setExperiences(prev => prev.map((exp, i) =>
      i === expIdx ? {
        ...exp,
        bullets: exp.bullets.map((b, j) => j === bulletIdx ? { ...b, rewritten } : b)
      } : exp
    ))
  }

  const handleDownloadResumePDF = async () => {
    if (!result) return
    setGeneratingPDF(true)
    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parsedResume: result.parsed_resume,
          rewrittenResume: { ...result.rewritten_resume, experiences },
          analyzedJD: result.analyzed_jd,
        }),
      })
      if (!response.ok) throw new Error('PDF generation failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `resume_${result.analyzed_jd.company}_${result.analyzed_jd.title}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Failed to generate PDF. Please try again.')
    } finally {
      setGeneratingPDF(false)
    }
  }

  const handleDownloadCoverLetterPDF = async () => {
    if (!result) return
    setGeneratingCoverPDF(true)
    try {
      const response = await fetch('/api/generate-cover-letter-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coverLetterText: coverLetter,
          parsedResume: result.parsed_resume,
          analyzedJD: result.analyzed_jd,
        }),
      })
      if (!response.ok) throw new Error('PDF generation failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cover_letter_${result.analyzed_jd.company}_${result.analyzed_jd.title}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Failed to generate cover letter PDF. Please try again.')
    } finally {
      setGeneratingCoverPDF(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">

        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Resume Agent</h1>
        <p className="text-gray-500 mb-8">Upload your resume and paste a job description to get an instant analysis.</p>

        {/* Input */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Resume (PDF)</label>
            <input
              type="file" accept=".pdf"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {file && <p className="mt-2 text-sm text-green-600">✓ {file.name}</p>}
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Job Description</label>
            <textarea
              rows={6}
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          {loading && progress && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-blue-700 font-medium">{progress.label}</span>
              </div>
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= progress.step ? 'bg-blue-600' : 'bg-blue-200'}`} />
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit} disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Analyzing...' : 'Analyze Resume'}
          </button>
        </div>

        {result && (
          <div className="space-y-5">

            {/* Visa Sponsorship */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Visa Sponsorship</h2>
              <div className={`rounded-xl p-4 mb-4 border ${
                result.sponsor.overall_likelihood === 'yes' ? 'bg-green-50 border-green-200' :
                result.sponsor.overall_likelihood === 'no' ? 'bg-red-50 border-red-200' :
                'bg-yellow-50 border-yellow-200'
              }`}>
                <p className={`text-lg font-semibold ${
                  result.sponsor.overall_likelihood === 'yes' ? 'text-green-700' :
                  result.sponsor.overall_likelihood === 'no' ? 'text-red-700' : 'text-yellow-700'
                }`}>
                  {result.sponsor.overall_likelihood === 'yes' ? '✓ Likely sponsors visas' :
                   result.sponsor.overall_likelihood === 'no' ? '✕ Unlikely to sponsor' : '? Sponsorship unknown'}
                </p>
                <p className="text-sm text-gray-600 mt-1">{result.sponsor.reasoning}</p>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'CPT', value: result.sponsor.cpt_likelihood, desc: 'Curricular practical training' },
                  { label: 'OPT / STEM OPT', value: result.sponsor.opt_likelihood, desc: 'Optional practical training' },
                  { label: 'H-1B', value: result.sponsor.h1b_likelihood, desc: 'Work visa sponsorship' },
                ].map(({ label, value, desc }) => (
                  <div key={label} className={`rounded-lg p-3 border ${
                    value === 'yes' ? 'bg-green-50 border-green-200' :
                    value === 'no' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <p className="text-xs text-gray-500 mb-1">{desc}</p>
                    <p className="text-sm font-semibold text-gray-800 mb-1">{label}</p>
                    <LikelihoodBadge value={value} />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                <span>Company size: <span className="font-medium text-gray-800">{result.sponsor.company_size}</span></span>
                <span>E-Verify: <span className={`font-medium ${result.sponsor.e_verify_likely ? 'text-green-700' : 'text-yellow-700'}`}>
                  {result.sponsor.e_verify_likely ? 'Likely registered' : 'Unknown'}
                </span></span>
              </div>
              {result.sponsor.keyword_signals.no_sponsor.length > 0 && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs font-medium text-red-700 mb-2">⚠ Red flag keywords:</p>
                  <div className="flex flex-wrap gap-1">
                    {result.sponsor.keyword_signals.no_sponsor.map((k, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white text-red-600 text-xs rounded border border-red-200">{k}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.sponsor.keyword_signals.sponsor.length > 0 && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs font-medium text-green-700 mb-2">✓ Positive keywords:</p>
                  <div className="flex flex-wrap gap-1">
                    {result.sponsor.keyword_signals.sponsor.map((k, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white text-green-600 text-xs rounded border border-green-200">{k}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Match Score */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Match Score</h2>
              <div className="space-y-4">
                <ScoreBar score={result.skill_match.final_score} label="Overall match" />
                <ScoreBar score={result.skill_match.ai_score} label="AI analysis score" />
                <ScoreBar score={result.skill_match.embedding_score} label="Semantic similarity score" />
              </div>
              <p className="text-gray-600 text-sm mt-4">{result.skill_match.score_reasoning}</p>
            </div>

            {/* JD Summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-1">
                {result.analyzed_jd.title}
                {result.analyzed_jd.company && result.analyzed_jd.company !== 'unknown' && (
                  <span className="text-gray-400 font-normal"> @ {result.analyzed_jd.company}</span>
                )}
              </h2>
              <p className="text-gray-600 text-sm">{result.analyzed_jd.summary}</p>
            </div>

            {/* Skills */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Skills</h2>
              <div className="mb-4">
                <p className="text-sm font-medium text-green-700 mb-2">Matched</p>
                <div className="flex flex-wrap gap-2">
                  {result.skill_match.matched_skills.map((s, i) => (
                    <span key={i} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200">{s}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-red-700 mb-2">Missing</p>
                <div className="flex flex-wrap gap-2">
                  {result.skill_match.skill_gaps.map((s, i) => (
                    <span key={i} className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded-full border border-red-200">{s}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Resume Bullets — diff mode */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Resume Bullets</h2>
                <button
                  onClick={handleDownloadResumePDF}
                  disabled={generatingPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {generatingPDF ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : '↓ Download Resume PDF'}
                </button>
              </div>

              {experiences.map((exp, expIdx) => (
                <div key={expIdx} className="mb-5">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      exp.type === 'work'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-purple-50 text-purple-700 border border-purple-200'
                    }`}>{exp.type === 'work' ? 'Work' : 'Project'}</span>
                    <h3 className="text-sm font-semibold text-gray-800">{exp.company}</h3>
                    <span className="text-xs text-gray-400">{exp.role}</span>
                  </div>
                  {exp.bullets.map((bullet, bulletIdx) => (
                    <BulletCompare
                      key={bulletIdx}
                      bullet={bullet}
                      onChange={rewritten => handleBulletChange(expIdx, bulletIdx, rewritten)}
                    />
                  ))}
                </div>
              ))}

              {result.rewritten_resume.tips.length > 0 && (
                <div className="border-t pt-4 mt-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">Tips</p>
                  <ul className="space-y-1">
                    {result.rewritten_resume.tips.map((t, i) => (
                      <li key={i} className="text-sm text-gray-500">💡 {t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Cover Letter */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800">Cover Letter</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(coverLetter)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  >Copy</button>
                  <button
                    onClick={() => setEditingCover(!editingCover)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  >{editingCover ? 'Done' : 'Edit'}</button>
                  <button
                    onClick={handleDownloadCoverLetterPDF}
                    disabled={generatingCoverPDF}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {generatingCoverPDF ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : '↓ PDF'}
                  </button>
                </div>
              </div>
              {editingCover ? (
                <textarea
                  rows={16}
                  value={coverLetter}
                  onChange={e => setCoverLetter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-line">{coverLetter}</p>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

export default App