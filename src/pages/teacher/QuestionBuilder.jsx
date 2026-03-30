import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Brain, CheckCircle, ClipboardList, Edit, Star } from 'lucide-react'
import { API_URL, authHeaders } from '../../utils/api'

const CLASS_LEVELS = Array.from({ length: 10 }, (_, i) => `Level ${i + 1}`)

function QuestionBuilder() {
  const navigate = useNavigate()
  const [notes, setNotes] = useState('')
  const [questionType, setQuestionType] = useState('mcq')
  const [questionCount, setQuestionCount] = useState(5)
  const [isGenerating, setIsGenerating] = useState(false)
  const [questions, setQuestions] = useState([])
  const [topic, setTopic] = useState('')
  const [lesson, setLesson] = useState('')
  const [classLevel, setClassLevel] = useState('')
  const [saved, setSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleGenerate = async () => {
    if (!notes.trim()) {
      alert('Please paste your notes first!')
      return
    }
    setIsGenerating(true)
    setQuestions([])
    setSaved(false)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, type: questionType, count: questionCount }),
      })
      const data = await response.json()
      if (data.error) {
        alert('Error: ' + data.error)
        return
      }
      setQuestions(data)
    } catch {
      alert('Could not reach server. Make sure backend is running!')
    }

    setIsGenerating(false)
  }

  const handleSaveDeck = async () => {
    setError('')
    setSuccess('')

    if (!topic.trim()) {
      alert('Please enter a topic name!')
      return
    }
    if (!lesson.trim()) {
      alert('Please enter a lesson number!')
      return
    }
    if (!classLevel) {
      alert('Please select a Class Level!')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/decks/save`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          lecture_name: topic.trim(),
          topic: topic.trim(),
          lesson_number: lesson.trim(),
          class_level: classLevel,
          question_type: questionType,
          is_uploaded: false,
          questions,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setSaved(true)
      setSuccess(`Deck saved! Topic: ${topic} - Lesson ${lesson}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">

      <div className="bg-blue-600 text-white p-4 sm:p-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">ZeeVid Learn+</h1>
            <p className="text-blue-200 text-base sm:text-[22px] font-bold">Question Builder</p>
          </div>
          <button
            onClick={() => navigate('/teacher/dashboard')}
            className="bg-white text-blue-600 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-blue-50 transition min-h-[44px]"
          >
            Back
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-red-600 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 text-green-700 text-sm">
            {success}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="text-[22px] font-bold text-gray-800 mb-4">Deck details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-600 text-[13px] font-semibold mb-2 block">Topic name</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Human Biology"
                className="w-full border border-gray-200 rounded-xl p-3 text-[16px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="text-gray-600 text-[13px] font-semibold mb-2 block">Lesson number</label>
              <input
                type="text"
                value={lesson}
                onChange={(e) => setLesson(e.target.value)}
                placeholder="e.g. Lesson 1"
                className="w-full border border-gray-200 rounded-xl p-3 text-[16px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="text-gray-600 text-[13px] font-semibold mb-2 block">Class Level <span className="text-red-500">*</span></label>
              <select
                value={classLevel}
                onChange={(e) => setClassLevel(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3 text-[16px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select class level...</option>
                {CLASS_LEVELS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="text-[22px] font-bold text-gray-800 mb-4">Paste your notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Paste the notes you want to generate questions from..."
            className="w-full h-40 border border-gray-200 rounded-xl p-4 text-[16px] font-medium text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="text-[22px] font-bold text-gray-800 mb-4">Question settings</h2>

          <p className="text-gray-600 text-[13px] font-semibold mb-2">Question type</p>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {['mcq', 'short', 'fill'].map((type) => (
              <button
                key={type}
                onClick={() => setQuestionType(type)}
                className={`flex-1 py-3 rounded-xl text-[16px] font-medium transition min-h-[48px] ${
                  questionType === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  {type === 'mcq' ? <BookOpen className="w-4 h-4" /> : type === 'short' ? <Edit className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
                  <span>{type === 'mcq' ? 'Multiple Choice' : type === 'short' ? 'Short Answer' : 'Fill in Blank'}</span>
                </span>
              </button>
            ))}
          </div>

          <p className="text-gray-600 text-[13px] font-semibold mb-2">Number of questions: <span className="text-blue-600">{questionCount}</span></p>
          <input
            type="range"
            min="1"
            max="20"
            value={questionCount}
            onChange={(e) => setQuestionCount(e.target.value)}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-gray-400 text-sm mt-1">
            <span>1</span>
            <span>20</span>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-[16px] font-bold py-4 rounded-xl transition mb-6"
        >
          <span className="inline-flex items-center gap-2">
            {isGenerating ? <Brain className="w-5 h-5" /> : <Star className="w-5 h-5" />}
            <span>{isGenerating ? 'Generating questions...' : 'Generate Questions'}</span>
          </span>
        </button>

        {questions.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-[22px] font-bold text-gray-800 mb-4">
              Generated Questions ({questions.length})
            </h2>
            <div className="flex flex-col gap-4 mb-6">
              {questions.map((q, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4">
                  <p className="font-semibold text-gray-800 mb-2">{i + 1}. {q.question}</p>
                  {q.options && q.options.length > 0 && (
                    <div className="flex flex-col gap-1 mb-2">
                      {q.options.map((opt, j) => (
                        <p key={j} className="text-gray-600 text-sm">{opt}</p>
                      ))}
                    </div>
                  )}
                  <p className="text-green-600 text-sm font-semibold inline-flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Answer: {q.answer}</span>
                  </p>
                </div>
              ))}
            </div>

            {!saved ? (
              <button
                onClick={handleSaveDeck}
                disabled={isSaving}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-bold py-4 rounded-xl text-lg transition"
              >
                <span className="inline-flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  <span>{isSaving ? 'Saving...' : 'Save as Deck'}</span>
                </span>
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-green-700 font-bold inline-flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Deck saved successfully!</span>
                  </p>
                  <p className="text-green-600 text-sm mt-1">Topic: {topic} - Lesson {lesson} - {classLevel}</p>
                </div>
                <button
                  onClick={() => navigate('/teacher/dashboard')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition"
                >
                  Back to Dashboard
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

export default QuestionBuilder
