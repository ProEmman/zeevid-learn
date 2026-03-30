import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, CheckCircle, Star, User } from 'lucide-react'
import { API_URL, authHeaders } from '../../utils/api'

function Results() {
  const navigate = useNavigate()
  const [results, setResults] = useState(null)
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [savedToDatabase, setSavedToDatabase] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('zeevid_results')
    if (saved) setResults(JSON.parse(saved))
  }, [])

  useEffect(() => {
    if (!results || savedToDatabase) return

    const saveResults = async () => {
      setIsSaving(true)
      setSaveError('')

      try {
        const res = await fetch(`${API_URL}/api/results/save`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            deck_id: results.deck_id,
            score: results.score,
            total: results.total,
            answers: results.answers || [],
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to save results')
        setSavedToDatabase(true)
      } catch (err) {
        setSaveError(err.message)
      } finally {
        setIsSaving(false)
      }
    }

    saveResults()
  }, [results, savedToDatabase])

  if (!results) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow p-8 text-center">
          <p className="text-gray-600 text-lg">No results found</p>
          <button
            onClick={() => navigate('/student/home')}
            className="mt-4 bg-green-600 text-white font-bold px-6 py-3 rounded-xl min-h-[48px]"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  const percentage = Math.round((results.score / results.total) * 100)
  const showAnswersMode = results.showAnswers || localStorage.getItem('zeevid_show_answers') || 'during'

  const grade =
    percentage >= 80 ? 'Excellent!' :
    percentage >= 60 ? 'Good job!' :
    percentage >= 40 ? 'Keep studying!' :
    'Try again!'

  const GradeIcon =
    percentage >= 80 ? Star :
    percentage >= 60 ? CheckCircle :
    percentage >= 40 ? BookOpen :
    User

  return (
    <div className="min-h-screen bg-gray-100">

      <div className="bg-green-600 text-white p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl sm:text-2xl font-bold">Results</h1>
          <p className="text-green-200 text-sm truncate">{results.topic} - Lesson {results.lesson}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {isSaving && (
          <div className="bg-white rounded-2xl shadow p-4 mb-6 text-center text-green-600 font-semibold animate-pulse">
            Saving your results...
          </div>
        )}

        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-red-600 text-sm">
            {saveError}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow p-6 sm:p-8 text-center mb-6">
          <p className="text-[48px] font-extrabold text-green-600 mb-2">{percentage}%</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-800 mb-1 inline-flex items-center gap-2">
            <GradeIcon className="w-6 h-6" />
            <span>{grade}</span>
          </p>
          <p className="text-gray-500">You scored {results.score} out of {results.total}</p>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-3xl sm:text-[48px] font-extrabold text-green-600">{results.score}</p>
              <p className="text-gray-500 text-[16px] font-semibold">Correct</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-3xl sm:text-[48px] font-extrabold text-red-500">{results.total - results.score}</p>
              <p className="text-gray-500 text-[16px] font-semibold">Wrong</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-3xl sm:text-[48px] font-extrabold text-blue-600">{results.total}</p>
              <p className="text-gray-500 text-[16px] font-semibold">Total</p>
            </div>
          </div>
        </div>

        <h3 className="text-[16px] font-semibold text-gray-800 mb-4">Answer Review</h3>
        <div className="flex flex-col gap-4 mb-6">
          {results.answers.map((a, i) => (
            <div
              key={i}
              className={`bg-white rounded-2xl shadow p-4 border-l-4 ${
                a.correct ? 'border-green-500' : 'border-red-400'
              }`}
            >
              <p className="text-[18px] font-semibold text-gray-800 mb-2">{i + 1}. {a.question}</p>
              {showAnswersMode === 'end' ? (
                <>
                  <p className={`text-[15px] font-medium ${a.correct ? 'text-gray-700' : 'text-red-500'}`}>
                    Your Answer: {a.yourAnswer || 'No answer'}
                  </p>
                  <p className="text-green-600 text-[15px] font-medium">Correct Answer: {a.correctAnswer}</p>
                </>
              ) : (
                <>
                  <p className={`text-[15px] font-medium ${a.correct ? 'text-green-600' : 'text-red-500'}`}>
                    Your answer: {a.yourAnswer}
                  </p>
                  {!a.correct && (
                    <p className="text-green-600 text-[15px] font-medium">Correct answer: {a.correctAnswer}</p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/student/home')}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl text-lg transition"
          >
            Back to Home
          </button>
        </div>

      </div>
    </div>
  )
}

export default Results
