import { Component, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, BookOpen, ClipboardList, FileText, LayoutDashboard, Menu, MessageSquare, Send, User, X } from 'lucide-react'
import { API_URL, authHeaders } from '../../utils/api'
import PDFViewer from '../../components/PDFViewer'
import Navbar from '../../components/Navbar'

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

function getMsgInitials(n) {
  if (!n) return '?'
  const p = n.trim().split(/\s+/)
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

function formatMsgTime(ts) {
  if (!ts) return ''
  const d = new Date(ts), now = new Date()
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return time
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · ' + time
}

function MsgInput({ onSend, disabled }) {
  const [text, setText] = useState('')
  const taRef = useRef(null)
  const autoResize = () => {
    if (!taRef.current) return
    taRef.current.style.height = 'auto'
    taRef.current.style.height = Math.min(taRef.current.scrollHeight, 72) + 'px'
  }
  const handleSend = () => {
    const t = text.trim()
    if (!t || disabled) return
    onSend(t)
    setText('')
    if (taRef.current) taRef.current.style.height = 'auto'
  }
  return (
    <div className="border-t border-gray-200 bg-white px-3 py-3 flex items-end gap-2 shrink-0">
      <textarea
        ref={taRef}
        value={text}
        onChange={e => { setText(e.target.value); autoResize() }}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
        placeholder="Type a message... (Enter to send)"
        rows={1}
        className="flex-1 resize-none border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400 overflow-y-auto"
        style={{ maxHeight: 72 }}
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || disabled}
        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white p-3 rounded-2xl transition disabled:opacity-40 shrink-0"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  )
}

function StudentHomeContent() {
  const navigate = useNavigate()
  const storedUser = (() => { try { return JSON.parse(localStorage.getItem('zeevid_user') || '{}') } catch { return {} } })()
  const firstName = (storedUser.full_name || 'Student').split(' ')[0]
  const [teacherNotes, setTeacherNotes] = useState([])
  const [decks, setDecks] = useState([])
  const [results, setResults] = useState([])
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [msgTeacher, setMsgTeacher] = useState(null)
  const [threadMessages, setThreadMessages] = useState([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [sendingMsg, setSendingMsg] = useState(false)
  const messagesEndRef = useRef(null)

  const fetchStudyMaterials = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('zeevid_token')
      if (!token) {
        throw new Error('Your session is missing. Please log in again.')
      }

      const [notesRes, decksRes, resultsRes] = await Promise.all([
        fetch(`${API_URL}/api/documents`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/decks`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/results`, { headers: authHeaders() }),
      ])

      const notesData = await notesRes.json()
      const decksData = await decksRes.json()
      const resultsData = await resultsRes.json()

      if (!notesRes.ok) throw new Error(notesData.error || 'Failed to load notes')
      if (!decksRes.ok) throw new Error(decksData.error || 'Failed to load decks')
      if (!resultsRes.ok) throw new Error(resultsData.error || 'Failed to load results')

      const notesList = Array.isArray(notesData) ? notesData : []
      const decksList = Array.isArray(decksData) ? decksData : []
      const resultsList = Array.isArray(resultsData) ? resultsData : []

      setTeacherNotes(notesList)
      setDecks(decksList)
      setResults(resultsList)

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

  // ── Unread count polling ─────────────────────────────────────────────────────
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/messages/unread-count`, { headers: authHeaders() })
        if (res.ok) { const d = await res.json(); setUnreadCount(d.count || 0) }
      } catch { /* ignore */ }
    }
    poll()
    const iv = setInterval(poll, 30000)
    return () => clearInterval(iv)
  }, [])

  // ── Message fetch ────────────────────────────────────────────────────────────
  const fetchMyMessages = useCallback(async () => {
    setLoadingThread(true)
    try {
      const res = await fetch(`${API_URL}/api/messages/my-messages`, { headers: authHeaders() })
      const data = await res.json()
      if (res.ok) {
        setMsgTeacher(data.teacher)
        setThreadMessages(data.messages || [])
        setUnreadCount(0)
      }
    } catch { /* ignore */ } finally { setLoadingThread(false) }
  }, [])

  useEffect(() => {
    if (activeSection !== 'messages') return
    fetchMyMessages()
    const iv = setInterval(fetchMyMessages, 10000)
    return () => clearInterval(iv)
  }, [activeSection, fetchMyMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [threadMessages])

  const handleSendMsg = async (content) => {
    if (!msgTeacher) return
    setSendingMsg(true)
    try {
      const res = await fetch(`${API_URL}/api/messages/send`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver_id: msgTeacher.user_id, content }),
      })
      const data = await res.json()
      if (res.ok) setThreadMessages(prev => [...prev, data])
    } catch { /* ignore */ } finally { setSendingMsg(false) }
  }

  const handleSectionSelect = (sectionKey) => {
    if (sectionKey === 'profile') { navigate('/profile'); return }
    setActiveSection(current => current === sectionKey ? null : sectionKey)
    setIsSidebarOpen(false)
  }

  const sidebarItems = [
    { key: 'notes', label: 'Teacher Notes', icon: FileText, count: teacherNotes.length, badgeColor: '#7c3aed' },
    { key: 'decks', label: 'Question Decks', icon: BookOpen, count: decks.length, badgeColor: '#059669' },
    { key: 'results', label: 'My Results', icon: BarChart, count: results.length, badgeColor: '#2563eb' },
    { key: 'personal', label: 'Personal Notes', icon: ClipboardList },
    { key: '_divider' },
    { key: 'messages', label: 'Messages', icon: MessageSquare, count: unreadCount, badgeColor: '#dc2626', hideIfZero: true },
    { key: 'profile', label: 'My Profile', icon: User, noBadge: true },
  ]

  const panelClose = () => {
    setActiveSection(null)
    setIsSidebarOpen(false)
  }

  const renderEmptyState = () => (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
        <LayoutDashboard className="h-10 w-10 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800">Select a section from the sidebar</h3>
      <p className="mt-2 text-sm text-gray-500">Choose what you want to view on the left</p>
    </div>
  )

  const renderPanelContainer = (title, content) => (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-[20px] font-bold text-gray-800">{title}</h3>
        <button
          onClick={panelClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close panel"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {content}
    </div>
  )

  const renderTeacherNotes = () => renderPanelContainer('Teacher Notes', teacherNotes.length === 0 ? (
    <div className="bg-white rounded-2xl shadow p-8 text-center">
      <div className="flex justify-center mb-4">
        <FileText className="w-10 h-10 text-gray-400" />
      </div>
      <p className="text-gray-500">Your teacher has not uploaded any notes yet.</p>
    </div>
  ) : teacherNotes.map((note) => (
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
  )))

  const renderDecks = () => renderPanelContainer('Question Decks', decks.length === 0 ? (
    <div className="bg-white rounded-2xl shadow p-8 text-center">
      <div className="flex justify-center mb-4">
        <BookOpen className="w-10 h-10 text-gray-400" />
      </div>
      <p className="text-gray-500 text-lg">No question decks available yet</p>
      <p className="text-gray-400 text-sm mt-2">Your teacher has not created any decks yet</p>
    </div>
  ) : decks.map((deck) => (
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
  )))

  const renderResults = () => renderPanelContainer('My Results', results.length === 0 ? (
    <div className="bg-white rounded-2xl shadow p-8 text-center">
      <div className="flex justify-center mb-4">
        <BarChart className="w-10 h-10 text-gray-400" />
      </div>
      <p className="text-gray-500 text-lg">No quiz results yet</p>
      <p className="text-gray-400 text-sm mt-2">Complete a study session to see your results here</p>
    </div>
  ) : results.map((result) => {
    const percentage = result.total ? Math.round((result.score / result.total) * 100) : 0
    const relatedDeck = decks.find(deck => String(deck.deck_id) === String(result.deck_id))
    const scoreClass = percentage >= 60 ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'

    return (
      <div key={result.result_id || `${result.deck_id}-${result.created_at}`} className="bg-white rounded-2xl shadow p-4 mb-3 flex items-center justify-between">
        <div>
          <p className="text-[16px] font-bold text-gray-800">{relatedDeck?.topic || 'Study Deck'}</p>
          <p className="text-[13px] font-medium text-gray-500 mt-1">
            {relatedDeck?.lesson_number ? `Lesson ${relatedDeck.lesson_number} · ` : ''}
            {result.created_at ? new Date(result.created_at).toLocaleDateString() : 'Recently taken'}
          </p>
          <p className="text-[13px] font-medium text-gray-400 mt-1">
            Score: {result.score} / {result.total}
          </p>
        </div>
        <div className={`rounded-xl px-4 py-2 text-sm font-bold ${scoreClass}`}>
          {percentage}%
        </div>
      </div>
    )
  }))

  const renderPersonalNotes = () => renderPanelContainer('Personal Notes', (
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
  ))

  const renderStudentMessagesPanel = () => {
    const myId = storedUser.user_id
    return (
      <div
        className="bg-white rounded-2xl shadow overflow-hidden flex flex-col"
        style={{ height: 'calc(100vh - 240px)', minHeight: 420 }}
      >
        <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-2.5 shrink-0">
          {msgTeacher ? (
            <>
              <div
                className="rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white shrink-0 overflow-hidden"
                style={{ width: 32, height: 32, minWidth: 32, fontSize: 12, fontWeight: 700 }}
              >
                {msgTeacher.avatar_url
                  ? <img src={msgTeacher.avatar_url} alt={msgTeacher.full_name} className="w-full h-full object-cover" />
                  : getMsgInitials(msgTeacher.full_name)}
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm leading-tight">{msgTeacher.full_name}</p>
                <p className="text-[11px] text-gray-400">Your Teacher</p>
              </div>
            </>
          ) : (
            <p className="font-bold text-gray-800 text-sm">Messages</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 bg-[#f9fafb]">
          {loadingThread ? (
            <div className="flex h-full items-center justify-center text-gray-400 text-sm animate-pulse">Loading messages...</div>
          ) : !msgTeacher ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-gray-400 text-sm">Your teacher has not been assigned yet.</p>
            </div>
          ) : threadMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-gray-400 text-sm">No messages yet — send your first message!</p>
            </div>
          ) : (
            <>
              {threadMessages.map(msg => (
                <div key={msg.message_id} className={`flex flex-col ${msg.sender_id === myId ? 'items-end' : 'items-start'} mb-3`}>
                  <div
                    className={`px-4 py-2.5 text-sm leading-relaxed max-w-[75%] break-words ${msg.sender_id === myId ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border border-gray-200'}`}
                    style={{ borderRadius: 18 }}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[11px] text-gray-400 mt-1 px-1">
                    {msg.sender_id === myId ? 'You' : (msgTeacher?.full_name || 'Teacher')} · {formatMsgTime(msg.created_at)}
                  </span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {msgTeacher && <MsgInput onSend={handleSendMsg} disabled={sendingMsg} />}
      </div>
    )
  }

  const renderActiveSection = () => {
    if (!activeSection) return renderEmptyState()
    if (activeSection === 'notes') return renderTeacherNotes()
    if (activeSection === 'decks') return renderDecks()
    if (activeSection === 'results') return renderResults()
    if (activeSection === 'messages') return renderStudentMessagesPanel()
    return renderPersonalNotes()
  }

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <Navbar />

      <div className="mx-auto flex w-full max-w-7xl flex-col md:min-h-[calc(100vh-96px)] md:flex-row">
        <div className="px-4 pt-4 sm:px-6 md:hidden">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-gray-200 bg-white p-3 text-gray-700 shadow-sm transition hover:bg-gray-50"
            aria-label="Open learning navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {isSidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar overlay"
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
          />
        )}

        <aside
          className={`fixed left-0 z-50 flex h-screen w-[280px] flex-col bg-white transition-transform duration-150 md:static md:z-auto md:h-auto md:min-h-[calc(100vh-96px)] md:w-[240px] md:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{
            top: 0,
            borderRight: '1px solid #e5e7eb',
            boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
          }}
        >
          <div className="flex items-center justify-between px-4 pt-4 md:hidden">
            <span className="text-sm font-semibold text-gray-700">Menu</span>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="pt-2 md:pt-5">
            <div className="px-5 pb-3 text-[15px] font-extrabold uppercase tracking-[0.08em] text-[#6b7280] md:px-4 md:pb-2 md:text-[13px] md:font-bold">
              My Learning
            </div>
            <nav className="space-y-1.5 px-1">
              {sidebarItems.map(item => {
                if (item.key === '_divider') {
                  return <div key="_divider" className="mx-3 my-1 border-t border-gray-200" />
                }
                const Icon = item.icon
                const isActive = activeSection === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSectionSelect(item.key)}
                    className={`mx-3 flex min-h-[60px] w-[calc(100%-24px)] items-center justify-between rounded-[16px] border-2 px-5 py-4 text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-150 hover:scale-[1.01] hover:bg-[#f8fafc] hover:border-[#d1d5db] ${
                      isActive ? 'bg-[#f0fdf4] border-[#059669]' : 'bg-white border-[#e5e7eb]'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className={`shrink-0 h-6 w-6 ${isActive ? 'text-[#059669]' : 'text-[#374151]'}`} />
                      <span className={`text-[16px] font-semibold ${isActive ? 'text-[#059669]' : 'text-[#1f2937]'}`}>
                        {item.label}
                      </span>
                    </span>
                    {!item.noBadge && typeof item.count === 'number' && (!item.hideIfZero || item.count > 0) && (
                      <span
                        className="rounded-full px-3 py-1 text-[13px] font-extrabold text-white"
                        style={{ backgroundColor: item.badgeColor }}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="mt-auto px-4 pb-5 pt-4">
            <div className="border-t border-gray-200 pt-4 text-sm font-semibold text-gray-500">ZeeVid Learn+</div>
          </div>
        </aside>

        <main className="flex-1 bg-[#f9fafb] px-4 py-6 sm:px-6 md:p-6">
          <div className="mb-8">
            <h2 className="text-[28px] font-extrabold text-gray-800">Welcome, {firstName}!</h2>
            <p className="text-gray-500 text-[16px] font-medium mt-1">Here is everything ready for your study session.</p>
            {studentClassLevel && (
              <p className="text-green-600 text-[14px] font-semibold mt-2">Class Level: {studentClassLevel}</p>
            )}
          </div>

          {loading && (
            <div className="bg-white rounded-2xl shadow p-6 mb-6 text-center text-green-600 font-semibold animate-pulse">
              Loading your study materials...
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-red-600 text-sm">
              {error} - <button onClick={fetchStudyMaterials} className="underline font-semibold">Retry</button>
            </div>
          )}

          {renderActiveSection()}
        </main>
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
