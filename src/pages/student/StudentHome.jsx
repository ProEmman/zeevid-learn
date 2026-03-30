import { Component, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, ClipboardList, FileText, Layers3 } from 'lucide-react'
import { API_URL, authHeaders } from '../../utils/api'
import PDFViewer from '../../components/PDFViewer'

class StudentHomeErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Something went wrong while loading the student page.',
    }
  }

  componentDidCatch(error) {
    console.error('StudentHome crashed:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-600 text-sm max-w-lg w-full">
            {this.state.message}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function StudentHomeContent() {
  const navigate = useNavigate()
  const [teacherNotes, setTeacherNotes] = useState([])
  const [decks, setDecks] = useState([])
  const [studentClassLevel, setStudentClassLevel] = useState('')
  const [studentNotes, setStudentNotes] = useState('')
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [openNote, setOpenNote] = useState(null)
  const [selectedDeck, setSelectedDeck] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [questionCount, setQuestionCount] = useState(5)
  const [shuffle, setShuffle] = useState(true)
  const [showAnswers, setShowAnswers] = useState('during')
  const [activeSection, setActiveSection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const notesRef = useRef(null)
  const decksRef = useRef(null)

  const fetchStudyMaterials = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('zeevid_token')
      if (!token) {
        throw new Error('Your session is missing. Please log in again.')
      }

      const [notesRes, decksRes] = await Promise.all([
        fetch(`${API_URL}/api/documents`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/decks`, { headers: authHeaders() }),
      ])

      const notesData = await notesRes.json()
      const decksData = await decksRes.json()

      if (!notesRes.ok) throw new Error(notesData.error || 'Failed to load notes')
      if (!decksRes.ok) throw new Error(decksData.error || 'Failed to load decks')

      const notesList = Array.isArray(notesData) ? notesData : []
      const decksList = Array.isArray(decksData) ? decksData : []

      setTeacherNotes(notesList)
      setDecks(decksList)

      if (!studentClassLevel) {
        const inferredLevel = notesList[0]?.class_level || decksList[0]?.class_level || ''
        if (inferredLevel) {
          setStudentClassLevel(inferredLevel)
        }
      }
    } catch (err) {
      console.error('Failed to load student home:', err)
      setError(err.message || 'Failed to load study materials.')
    } finally {
      setLoading(false)
    }
  }, [studentClassLevel])

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('zeevid_user')
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser)
        if (parsedUser.class_level) {
          setStudentClassLevel(parsedUser.class_level)
        }
      }

      const savedNotes = localStorage.getItem('zeevid_student_notes')
      if (savedNotes) {
        setStudentNotes(savedNotes)
      }

      fetchStudyMaterials()
    } catch (err) {
      console.error('StudentHome initialization failed:', err)
      setError(err.message || 'Failed to initialize student home.')
      setLoading(false)
    }
  }, [fetchStudyMaterials])

  function shuffleArray(array) {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  const handleStudentNotesSave = () => {
    if (!studentNotes.trim()) {
      alert('Please paste your notes first!')
      return
    }
    localStorage.setItem('zeevid_student_notes', studentNotes)
    alert('Your notes have been saved!')
    setShowNoteInput(false)
  }

  useEffect(() => {
    if (selectedDeck) {
      setQuestionCount(selectedDeck.questions?.length || 1)
    }
  }, [selectedDeck])

  useEffect(() => {
    if (activeSection === 'notes' && notesRef.current) {
      notesRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    if (activeSection === 'decks' && decksRef.current) {
      decksRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [activeSection])

  const allDecks = decks

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-green-600 text-white p-4 sm:p-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">ZeeVid Learn+</h1>
            <p className="text-green-200 text-sm">Student Portal</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="bg-white text-green-600 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-green-50 transition min-h-[44px]"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-8">
        <div>
          <h2 className="text-[28px] font-extrabold text-gray-800">Welcome, Student!</h2>
          <p className="text-gray-500 text-[16px] font-medium mt-1">Here is everything ready for your study session.</p>
          {studentClassLevel && (
            <p className="text-green-600 text-[14px] font-semibold mt-2">Class Level: {studentClassLevel}</p>
          )}
        </div>

        {loading && (
          <div className="bg-white rounded-2xl shadow p-6 text-center text-green-600 font-semibold animate-pulse">
            Loading your study materials...
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm">
            {error} - <button onClick={fetchStudyMaterials} className="underline font-semibold">Retry</button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div
            onClick={() => setActiveSection(activeSection === 'notes' ? null : 'notes')}
            className={`rounded-2xl shadow-lg p-6 cursor-pointer transition-all duration-200 ease-in-out ${
              activeSection === 'notes'
                ? 'bg-gradient-to-br from-[#6d28d9] to-[#4c1d95] scale-[1.02]'
                : 'bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] hover:brightness-95 hover:scale-[1.02]'
            }`}
          >
            <div className="flex justify-center mb-4">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <p className="text-[36px] font-extrabold text-white">
              {teacherNotes.length}
            </p>
            <p className="text-[13px] mt-2 font-semibold text-white/85">Notes Available</p>
            <p className="text-xs text-white/75 mt-6">Tap to view</p>
          </div>

          <div
            onClick={() => setActiveSection(activeSection === 'decks' ? null : 'decks')}
            className={`rounded-2xl shadow-lg p-6 cursor-pointer transition-all duration-200 ease-in-out ${
              activeSection === 'decks'
                ? 'bg-gradient-to-br from-[#047857] to-[#065f46] scale-[1.02]'
                : 'bg-gradient-to-br from-[#059669] to-[#047857] hover:brightness-95 hover:scale-[1.02]'
            }`}
          >
            <div className="flex justify-center mb-4">
              <Layers3 className="w-8 h-8 text-white" />
            </div>
            <p className="text-[36px] font-extrabold text-white">{allDecks.length}</p>
            <p className="text-[13px] mt-2 font-semibold text-white/85">Question Decks</p>
            <p className="text-xs text-white/75 mt-6">Tap to view</p>
          </div>
        </div>

        <div>
          <h2 className="text-[20px] font-bold text-gray-800 mb-2">My Study Materials</h2>
          <p className="text-gray-500 text-sm mb-6">All content shared by your teacher</p>

          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow p-6">
              <div
                ref={notesRef}
                className={`mb-4 transition-all duration-300 ${
                  activeSection === 'notes'
                    ? 'border-l-4 border-purple-500 pl-4 bg-purple-50 rounded-r-xl py-2'
                    : ''
                }`}
              >
                <h2 className="text-[20px] font-bold text-gray-800">Teacher Notes</h2>
              </div>
              {teacherNotes.length === 0 ? (
                <div className="bg-white rounded-2xl shadow p-8 text-center">
                  <div className="flex justify-center mb-4">
                    <FileText className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-gray-500">Your teacher has not uploaded any notes yet.</p>
                </div>
              ) : (
                teacherNotes.map((note) => (
                  <div
                    key={note.document_id}
                    onClick={() => setOpenNote(note)}
                    className="bg-white rounded-2xl shadow p-4 mb-3 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <FileText className="w-8 h-8 text-gray-500" />
                      <div>
                        <p className="text-[16px] font-bold text-gray-800">{note.document_name}</p>
                        {(note.lecture_name || note.topic) && (
                          <p className="text-[13px] font-medium text-green-600">
                            {[note.lecture_name, note.topic].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        <p className="text-[13px] font-medium text-gray-400">
                          {[note.class_level, note.created_at ? new Date(note.created_at).toLocaleDateString() : ''].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenNote(note)
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition min-h-[44px]"
                      >
                        Open
                      </button>
                      <button
                        title="Download note"
                        onClick={(e) => {
                          e.stopPropagation()
                          const blob = new Blob([note.document_content || ''], { type: 'text/plain' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = note.document_name || 'note.txt'
                          a.click()
                          URL.revokeObjectURL(url)
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition min-h-[44px]"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <div
                ref={decksRef}
                className={`mb-4 transition-all duration-300 ${
                  activeSection === 'decks'
                    ? 'border-l-4 border-green-500 pl-4 bg-green-50 rounded-r-xl py-2'
                    : ''
                }`}
              >
                <h2 className="text-[20px] font-bold text-gray-800 mb-2">Question Decks</h2>
                <p className="text-gray-500 text-sm mb-6">Select a deck to start studying</p>
              </div>

              {allDecks.length === 0 ? (
                <div className="bg-white rounded-2xl shadow p-8 text-center">
                  <div className="flex justify-center mb-4">
                    <BookOpen className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-lg">No question decks available yet</p>
                  <p className="text-gray-400 text-sm mt-2">Your teacher has not created any decks yet</p>
                </div>
              ) : (
                allDecks.map((deck) => (
                  <div
                    key={deck.deck_id}
                    className={`rounded-2xl shadow p-4 mb-3 flex items-center justify-between cursor-pointer border transition-all duration-200 ease-in-out ${
                      showModal && selectedDeck?.deck_id === deck.deck_id
                        ? 'bg-blue-50 border-blue-500 scale-[1.02] shadow-md'
                        : 'bg-white border-transparent hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <BookOpen className="w-8 h-8 text-gray-500" />
                      <div>
                        <p className="text-[16px] font-bold text-gray-800">{deck.topic}</p>
                        <p className="text-[13px] font-medium text-green-600">Lesson {deck.lesson_number}</p>
                        {deck.questions.length === 0 ? (
                          <p className="text-gray-400 text-[13px] font-medium mt-1">No Q yet</p>
                        ) : (
                          <span className="inline-block bg-green-100 text-green-700 font-bold px-3 py-1 rounded-xl text-[13px] mt-1">
                            {deck.questions.length} Q
                          </span>
                        )}
                        <p className="text-[13px] font-medium text-gray-400 mt-1">
                          {[deck.class_level, deck.created_at ? new Date(deck.created_at).toLocaleDateString() : ''].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedDeck(deck)
                        setShowModal(true)
                      }}
                      className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-green-700 transition min-h-[44px] shrink-0"
                    >
                      Start
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-[20px] font-bold text-gray-800 mb-2 mt-8">My Personal Space</h2>
          <p className="text-gray-500 text-sm mb-6">Your own private study notes</p>

          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[20px] font-bold text-gray-800 inline-flex items-center gap-2">
                <ClipboardList className="w-6 h-6" />
                <span>My Personal Notes</span>
              </h2>
              <button
                onClick={() => setShowNoteInput(!showNoteInput)}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition min-h-[44px]"
              >
                {showNoteInput ? 'Hide' : 'Add Notes'}
              </button>
            </div>

            {showNoteInput && (
              <div>
                <textarea
                  value={studentNotes}
                  onChange={(e) => setStudentNotes(e.target.value)}
                  placeholder="Paste your personal study notes here..."
                  className="w-full h-40 border border-gray-200 rounded-xl p-4 text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <div className="flex gap-4 mt-4">
                  <button
                    onClick={handleStudentNotesSave}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition"
                  >
                    Save Notes
                  </button>
                  <button
                    onClick={() => setShowNoteInput(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-xl transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!showNoteInput && (
              <p className="text-gray-400 text-sm">Click "Add Notes" to paste your personal study notes.</p>
            )}
          </div>
        </div>
      </div>

      {openNote && openNote.document_url ? (
        <PDFViewer
          url={openNote.document_url}
          fileName={openNote.document_name}
          onClose={() => setOpenNote(null)}
        />
      ) : null}

      {openNote && !openNote.document_url && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '900px',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px',
                borderBottom: '1px solid #f3f4f6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexShrink: 0,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', margin: 0, wordBreak: 'break-word' }}>
                  {openNote.document_name}
                </h2>
                <p style={{ fontSize: '13px', color: '#16a34a', margin: '4px 0 0' }}>
                  {openNote.lecture_name}
                  {openNote.topic ? ' · ' + openNote.topic : ''}
                </p>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0' }}>
                  {[openNote.class_level, openNote.created_at ? new Date(openNote.created_at).toLocaleDateString() : ''].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button
                onClick={() => setOpenNote(null)}
                style={{
                  fontSize: '24px',
                  color: '#9ca3af',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  lineHeight: 1,
                  padding: '8px',
                  minWidth: '44px',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                x
              </button>
            </div>
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                fontSize: '15px',
                lineHeight: '1.8',
                color: '#374151',
              }}
            >
              {openNote.document_content && openNote.document_content
                .split('\n')
                .map((line, index) => (
                  line.trim() === ''
                    ? <br key={index} />
                    : line.startsWith('Page ')
                      ? <p key={index} style={{
                          fontWeight: 'bold',
                          color: '#1d4ed8',
                          marginTop: '16px',
                          marginBottom: '8px',
                          fontSize: '13px',
                          borderBottom: '1px solid #e5e7eb',
                          paddingBottom: '4px',
                        }}>{line}</p>
                      : <p key={index} style={{ marginBottom: '8px' }}>{line}</p>
                ))}
            </div>
            <div
              style={{
                padding: '12px 16px',
                borderTop: '1px solid #f3f4f6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0,
                gap: '12px',
              }}
            >
              <button
                onClick={() => {
                  const blob = new Blob([openNote.document_content || ''], { type: 'text/plain' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = openNote.document_name || 'note.txt'
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                style={{
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  fontWeight: '600',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FileText className="w-4 h-4" /> Download
              </button>
              <button
                onClick={() => setOpenNote(null)}
                style={{
                  backgroundColor: '#f3f4f6',
                  color: '#4b5563',
                  fontWeight: '600',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  minHeight: '44px',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && selectedDeck && (
        <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen bg-[rgba(0,0,0,0.7)] flex items-center justify-center z-[9999] p-4">
          <div className="w-full max-w-[calc(100vw-32px)] max-h-[calc(100vh-32px)] sm:w-[480px] sm:max-w-[480px] sm:max-h-[80vh] lg:max-h-[70vh] overflow-y-auto rounded-[20px] sm:rounded-[24px] bg-white p-7 sm:p-8 shadow-[0_25px_50px_rgba(0,0,0,0.3)]">
            <h3 className="text-[22px] font-extrabold text-gray-900 mb-1">Start Study Session</h3>
            <p className="text-green-600 text-[14px] font-semibold mb-6">
              {selectedDeck.topic} · Lesson {selectedDeck.lesson_number}
            </p>

            <hr className="border-gray-200 my-4" />

            <div className="mb-5">
              <div className="flex justify-between items-center mb-3 gap-4">
                <span className="text-[15px] font-semibold text-gray-700">How many questions?</span>
                <span className="text-[18px] font-extrabold text-green-600">{questionCount}</span>
              </div>
              {selectedDeck.questions.length > 0 ? (
                <>
                  <input
                    type="range"
                    min={1}
                    max={selectedDeck.questions.length}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="start-study-slider w-full my-2"
                  />
                  <div className="flex justify-between text-gray-500 text-[12px]">
                    <span>1</span>
                    <span>{selectedDeck.questions.length}</span>
                  </div>
                </>
              ) : (
                <p className="text-amber-600 text-sm bg-amber-50 rounded-xl p-3">
                  This deck has no questions yet. Please ask your teacher to add questions.
                </p>
              )}
            </div>

            <hr className="border-gray-200 my-4" />

            <div className="flex items-center justify-between">
              <span className="text-[15px] font-semibold text-gray-700">Shuffle questions</span>
              <button
                onClick={() => setShuffle(!shuffle)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-end pr-0 bg-transparent border-none cursor-pointer"
                aria-label={shuffle ? 'Shuffle on' : 'Shuffle off'}
              >
                <div
                  className={`w-14 h-7 rounded-full transition-colors ${
                    shuffle ? 'bg-green-500' : 'bg-gray-300'
                  } relative`}
                >
                  <div
                    className={`w-6 h-6 bg-white rounded-full absolute top-0.5 transition-all shadow ${
                      shuffle ? 'left-7' : 'left-0.5'
                    }`}
                  />
                </div>
              </button>
            </div>

            <hr className="border-gray-200 my-4" />

            <div className="mb-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[15px] font-semibold text-gray-700">Show answers as I go</span>
                  <p className="text-[11px] text-gray-500 mt-1">See if each answer is right or wrong immediately</p>
                </div>
                <button
                  onClick={() => setShowAnswers(prev => prev === 'during' ? 'end' : 'during')}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-end pr-0 bg-transparent border-none cursor-pointer shrink-0"
                  aria-label={showAnswers === 'during' ? 'Show answers during quiz on' : 'Show answers during quiz off'}
                >
                  <div
                    className={`w-14 h-7 rounded-full transition-colors ${
                      showAnswers === 'during' ? 'bg-green-500' : 'bg-gray-300'
                    } relative`}
                  >
                    <div
                      className={`w-6 h-6 bg-white rounded-full absolute top-0.5 transition-all shadow ${
                        showAnswers === 'during' ? 'left-7' : 'left-0.5'
                      }`}
                    />
                  </div>
                </button>
              </div>
            </div>

            <hr className="border-gray-200 my-4" />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedDeck(null)
                }}
                className="basis-[40%] bg-white border-2 border-gray-200 hover:bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                disabled={selectedDeck.questions.length === 0}
                onClick={() => {
                  const qs = [...selectedDeck.questions]
                  const shuffled = shuffle ? shuffleArray(qs) : qs
                  const final = shuffled.slice(0, questionCount)
                  localStorage.setItem('zeevid_show_answers', showAnswers)
                  localStorage.setItem(
                    'zeevid_current_deck',
                    JSON.stringify({
                      ...selectedDeck,
                      lesson: selectedDeck.lesson_number,
                      lectureName: selectedDeck.lecture_name,
                      type: selectedDeck.question_type,
                      showAnswers,
                      questions: final,
                    }),
                  )
                  setShowModal(false)
                  navigate('/student/study')
                }}
                className="basis-[60%] bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-xl transition disabled:bg-none disabled:from-gray-300 disabled:to-gray-300"
              >
                <span className="inline-flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>Start Studying</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StudentHome() {
  return (
    <StudentHomeErrorBoundary>
      <StudentHomeContent />
    </StudentHomeErrorBoundary>
  )
}

export default StudentHome
