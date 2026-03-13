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

interface AnalysisResult {
  parsed_resume: {
    name: string
    summary: string
    skills: string[]
  }
  analyzed_jd: {
    title: string
    company: string
    summary: string
    required_skills: string[]
  }
  skill_match: SkillMatch
  rewritten_resume: {
    rewritten_bullets: string[]
    tips: string[]
  }
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
  const styles = {
    yes: 'bg-green-50 border-green-200 text-green-700',
    no: 'bg-red-50 border-red-200 text-red-700',
    unknown: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  }
  const labels = { yes: 'Likely', no: 'Unlikely', unknown: 'Unknown' }
  const style = styles[value as keyof typeof styles] || styles.unknown
  const label = labels[value as keyof typeof labels] || 'Unknown'
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${style}`}>{label}</span>
  )
}

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<ProgressStep | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')

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
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      })

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '))

        for (const line of lines) {
          const json = JSON.parse(line.slice(6))
          if (json.type === 'progress') {
            setProgress({ step: json.step, label: json.label })
          } else if (json.type === 'result') {
            setResult(json.data)
          } else if (json.type === 'error') {
            setError(json.message)
          }
        }
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Resume Agent</h1>
        <p className="text-gray-500 mb-8">Upload your resume and paste a job description to get an instant analysis.</p>

        {/* Input */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Resume (PDF)</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
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
              onChange={(e) => setJobDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          {/* Progress */}
          {loading && progress && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-blue-700 font-medium">{progress.label}</span>
              </div>
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      i <= progress.step ? 'bg-blue-600' : 'bg-blue-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Analyzing...' : 'Analyze Resume'}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-5">

            {/* Visa Sponsorship */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Visa Sponsorship</h2>

              {/* Overall */}
              <div className={`rounded-xl p-4 mb-4 border ${
                result.sponsor.overall_likelihood === 'yes' ? 'bg-green-50 border-green-200' :
                result.sponsor.overall_likelihood === 'no' ? 'bg-red-50 border-red-200' :
                'bg-yellow-50 border-yellow-200'
              }`}>
                <p className={`text-lg font-semibold ${
                  result.sponsor.overall_likelihood === 'yes' ? 'text-green-700' :
                  result.sponsor.overall_likelihood === 'no' ? 'text-red-700' :
                  'text-yellow-700'
                }`}>
                  {result.sponsor.overall_likelihood === 'yes' ? '✓ Likely sponsors visas' :
                   result.sponsor.overall_likelihood === 'no' ? '✕ Unlikely to sponsor' :
                   '? Sponsorship unknown'}
                </p>
                <p className="text-sm text-gray-600 mt-1">{result.sponsor.reasoning}</p>
              </div>

              {/* CPT / OPT / H-1B */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'CPT', value: result.sponsor.cpt_likelihood, desc: 'Curricular practical training' },
                  { label: 'OPT / STEM OPT', value: result.sponsor.opt_likelihood, desc: 'Optional practical training' },
                  { label: 'H-1B', value: result.sponsor.h1b_likelihood, desc: 'Work visa sponsorship' },
                ].map(({ label, value, desc }) => (
                  <div key={label} className={`rounded-lg p-3 border ${
                    value === 'yes' ? 'bg-green-50 border-green-200' :
                    value === 'no' ? 'bg-red-50 border-red-200' :
                    'bg-yellow-50 border-yellow-200'
                  }`}>
                    <p className="text-xs text-gray-500 mb-1">{desc}</p>
                    <p className="text-sm font-semibold text-gray-800 mb-1">{label}</p>
                    <LikelihoodBadge value={value} />
                  </div>
                ))}
              </div>

              {/* Company info */}
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                <span>Company size: <span className="font-medium text-gray-800">{result.sponsor.company_size}</span></span>
                <span>E-Verify: <span className={`font-medium ${result.sponsor.e_verify_likely ? 'text-green-700' : 'text-yellow-700'}`}>
                  {result.sponsor.e_verify_likely ? 'Likely registered' : 'Unknown'}
                </span></span>
              </div>

              {/* Red flag keywords */}
              {result.sponsor.keyword_signals.no_sponsor.length > 0 && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs font-medium text-red-700 mb-2">⚠ Red flag keywords detected:</p>
                  <div className="flex flex-wrap gap-1">
                    {result.sponsor.keyword_signals.no_sponsor.map((k: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-white text-red-600 text-xs rounded border border-red-200">{k}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Positive keywords */}
              {result.sponsor.keyword_signals.sponsor.length > 0 && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs font-medium text-green-700 mb-2">✓ Positive keywords detected:</p>
                  <div className="flex flex-wrap gap-1">
                    {result.sponsor.keyword_signals.sponsor.map((k: string, i: number) => (
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

            {/* Rewritten Bullets */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Rewritten Resume Bullets</h2>
              <ul className="space-y-2 mb-4">
                {result.rewritten_resume.rewritten_bullets.map((b, i) => (
                  <li key={i} className="text-sm text-gray-700">{b}</li>
                ))}
              </ul>
              {result.rewritten_resume.tips.length > 0 && (
                <div className="border-t pt-4">
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
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Cover Letter</h2>
              <p className="text-sm text-gray-700 whitespace-pre-line">{result.cover_letter}</p>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

export default App