import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Footer from '../../components/Footer'

function getSavedDeck() {
  const savedDeck = localStorage.getItem('zeevid_current_deck')
  return savedDeck ? JSON.parse(savedDeck) : null
}

function Study() {
  const navigate = useNavigate()
  const [deck] = useState(() => getSavedDeck())
  const [questions] = useState(() => getSavedDeck()?.questions || [])
  const [showAnswers] = useState(() => getSavedDeck()?.showAnswers || localStorage.getItem('zeevid_show_answers') || 'during')
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [shortAnswer, setShortAnswer] = useState('')
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState([])

  const currentQuestion = questions[current]
  const shouldShowAnswersDuringQuiz = showAnswers !== 'end'

  const handleSelect = (option) => {
    if (answered) return
    setSelected(option)
  }

  const saveResultsAndFinish = (finalScore, finalAnswers) => {
    localStorage.setItem('zeevid_results', JSON.stringify({
      deck_id: deck.deck_id,
      score: finalScore,
      total: questions.length,
      answers: finalAnswers,
      topic: deck.topic,
      lesson: deck.lesson,
      showAnswers
    }))
    navigate('/student/results')
  }

  const moveToNextQuestion = () => {
    if (current + 1 < questions.length) {
      setCurrent(prev => prev + 1)
      setSelected(null)
      setShortAnswer('')
      setAnswered(false)
      return
    }

    saveResultsAndFinish(score, answers)
  }

  const handleSubmit = () => {
    if (!answered) {
      if (deck.type === 'mcq' && !selected) return
      if ((deck.type === 'short' || deck.type === 'fill') && !shortAnswer.trim()) return

      const isCorrect =
        deck.type === 'mcq'
          ? selected === currentQuestion.answer
          : shortAnswer.trim().toLowerCase() === currentQuestion.answer.trim().toLowerCase()

      const nextScore = isCorrect ? score + 1 : score
      const nextAnswers = [...answers, {
        question: currentQuestion.question,
        correct: isCorrect,
        yourAnswer: deck.type === 'mcq' ? selected : shortAnswer,
        correctAnswer: currentQuestion.answer
      }]

      setScore(nextScore)
      setAnswers(nextAnswers)

      if (!shouldShowAnswersDuringQuiz) {
        if (current + 1 < questions.length) {
          setCurrent(prev => prev + 1)
          setSelected(null)
          setShortAnswer('')
          return
        }

        saveResultsAndFinish(nextScore, nextAnswers)
        return
      }

      setAnswered(true)
    } else {
      moveToNextQuestion()
    }
  }

  if (!deck || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <p className="text-4xl mb-4">...</p>
            <p className="text-gray-600 text-lg font-semibold">No deck selected</p>
            <button
              onClick={() => navigate('/student/home')}
              className="mt-4 bg-green-600 text-white font-bold px-6 py-3 rounded-xl min-h-[48px]"
            >
              Go Back
            </button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* Header */}
      <div className="bg-green-600 text-white p-4 sm:p-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold truncate">{deck.topic}</h1>
            <p className="text-green-200 text-sm truncate">
              {deck.lectureName ? deck.lectureName + ' - Lesson ' + deck.lesson : 'Lesson ' + deck.lesson}
            </p>
          </div>
          <button
            onClick={() => navigate('/student/home')}
            className="bg-white text-green-600 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-green-50 transition min-h-[44px] shrink-0"
          >
            Back
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full flex-1 p-4 sm:p-6">

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Question {current + 1} of {questions.length}</span>
            <span>Score: {score}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all"
              style={{ width: `${((current + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <p className="text-[18px] font-semibold text-gray-800 mb-6">
            {current + 1}. {currentQuestion.question}
          </p>

          {/* MCQ Options */}
          {deck.type === 'mcq' && currentQuestion.options && (
            <div className="flex flex-col gap-3">
              {currentQuestion.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(option)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition text-[16px] font-medium ${
                    shouldShowAnswersDuringQuiz && answered
                      ? option === currentQuestion.answer
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : option === selected
                          ? 'border-red-400 bg-red-50 text-red-600'
                          : 'border-gray-200 text-gray-500'
                      : selected === option
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300 text-gray-700'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {/* Short Answer / Fill in Blank */}
          {(deck.type === 'short' || deck.type === 'fill') && (
            <div>
              <input
                type="text"
                value={shortAnswer}
                onChange={(e) => setShortAnswer(e.target.value)}
                disabled={answered}
                placeholder={deck.type === 'fill' ? 'Type the missing word...' : 'Type your answer...'}
                className="w-full border-2 border-gray-200 rounded-xl p-4 text-[16px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              {shouldShowAnswersDuringQuiz && answered && (
                <div className={`mt-3 p-3 rounded-xl ${
                  shortAnswer.trim().toLowerCase() === currentQuestion.answer.trim().toLowerCase()
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-600'
                }`}>
                  <p className="font-semibold">
                    {shortAnswer.trim().toLowerCase() === currentQuestion.answer.trim().toLowerCase()
                      ? 'Correct!'
                      : `Correct answer: ${currentQuestion.answer}`}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit / Next Button */}
        <button
          onClick={handleSubmit}
          disabled={(!answered && deck.type === 'mcq' && !selected) || (!answered && (deck.type === 'short' || deck.type === 'fill') && !shortAnswer.trim())}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-4 rounded-xl text-lg transition"
        >
          {!shouldShowAnswersDuringQuiz
            ? current + 1 < questions.length
              ? 'Submit & Next'
              : 'Finish Quiz'
            : !answered
              ? 'Submit Answer'
              : current + 1 < questions.length
                ? 'Next Question ->'
                : 'See Results'}
        </button>

      </div>
      <Footer />
    </div>
  )
}

export default Study
