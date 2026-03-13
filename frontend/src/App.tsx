import { useState } from 'react'
import axios from 'axios'

interface AnalysisResult {
  jd_summary: string
  match_score: number
  match_reasoning: string
  skill_gaps: string[]
  rewritten_bullets: string[]
  cover_letter: string
}

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
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

    const formData = new FormData()
    formData.append('resume', file)
    formData.append('jobDescription', jobDescription)

    try {
      const response = await axios.post('/api/analyze', formData)
      setResult(response.data.data)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Resume Agent</h1>
        <p className="text-gray-500 mb-8">Upload your resume and paste a job description to get an instant analysis.</p>

        {/* Input Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">

          {/* PDF Upload */}
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

          {/* Job Description */}
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

          {/* Error */}
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Analyzing...' : 'Analyze Resume'}
          </button>
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-5">

            {/* Match Score */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Match Score</h2>
              <div className="flex items-center gap-4">
                <span className="text-5xl font-bold text-blue-600">{result.match_score}</span>
                <span className="text-gray-400 text-2xl">/100</span>
              </div>
              <p className="text-gray-600 text-sm mt-2">{result.match_reasoning}</p>
            </div>

            {/* JD Summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Job Summary</h2>
              <p className="text-gray-600 text-sm">{result.jd_summary}</p>
            </div>

            {/* Skill Gaps */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Skill Gaps</h2>
              <ul className="space-y-2">
                {result.skill_gaps.map((skill, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-red-400">✕</span> {skill}
                  </li>
                ))}
              </ul>
            </div>

            {/* Rewritten Bullets */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Rewritten Resume Bullets</h2>
              <ul className="space-y-2">
                {result.rewritten_bullets.map((bullet, i) => (
                  <li key={i} className="text-sm text-gray-700">{bullet}</li>
                ))}
              </ul>
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