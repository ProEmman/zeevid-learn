import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, Brain, FileText, LayoutDashboard, Menu, MessageSquare, Send, Upload as UploadIcon, User, Users, X } from 'lucide-react'
import { API_URL, authHeaders } from '../../utils/api'
import { supabase } from '../../lib/supabase'
import PDFViewer from '../../components/PDFViewer'
import Navbar from '../../components/Navbar'

const getDocumentStoragePath = (documentUrl) => {
  if (!documentUrl) return null

  try {
    const { pathname } = new URL(documentUrl)
    const marker = '/documents/'
    const markerIndex = pathname.indexOf(marker)

    if (markerIndex === -1) return null

    return decodeURIComponent(pathname.slice(markerIndex + marker.length))
  } catch {
    return null
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

function TeacherDashboard() {
  const navigate = useNavigate()
  const storedUser = (() => { try { return JSON.parse(localStorage.getItem('zeevid_user') || '{}') } catch { return {} } })()
  const firstName = (storedUser.full_name || 'Teacher').split(' ')[0]
  const [activeActionCard, setActiveActionCard] = useState(() => localStorage.getItem('zeevid_teacher_active_card') || '')
  const [decks, setDecks] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [deckCount, setDeckCount] = useState(0)
  const [noteCount, setNoteCount] = useState(0)
  const [uploadedCount, setUploadedCount] = useState(0)
  const [aiCount, setAiCount] = useState(0)
  const [activePanel, setActivePanel] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const [deckEdits, setDeckEdits] = useState({})
  const [noteEdits, setNoteEdits] = useState({})
  const [questionEdits, setQuestionEdits] = useState({})

  const [viewNote, setViewNote] = useState(null)
  const [viewDeck, setViewDeck] = useState(null)

  const [expandedDecks, setExpandedDecks] = useState({})
  const showViewDeck = false

  const [unreadCount, setUnreadCount] = useState(0)
  const [conversations, setConversations] = useState([])
  const [selectedConvo, setSelectedConvo] = useState(null)
  const [threadMessages, setThreadMessages] = useState([])
  const [loadingConvos, setLoadingConvos] = useState(false)
  const [loadingThread, setLoadingThread] = useState(false)
  const [sendingMsg, setSendingMsg] = useState(false)
  const [msgMobileView, setMsgMobileView] = useState('list')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    setError('')
    try {
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

      setNotes(notesList)
      setDecks(decksList)
      setNoteCount(notesList.length)
      setDeckCount(decksList.length)
      setUploadedCount(decksList.filter(d => d.is_uploaded).length)
      setAiCount(decksList.filter(d => !d.is_uploaded).length)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const syncDeckCounts = (updated) => {
    setDeckCount(updated.length)
    setUploadedCount(updated.filter(d => d.is_uploaded).length)
    setAiCount(updated.filter(d => !d.is_uploaded).length)
  }

  const handleDeleteDeck = async (deckId) => {
    try {
      const res = await fetch(`${API_URL}/api/decks/${deckId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error)
      }
      const updated = decks.filter(d => d.deck_id !== deckId)
      setDecks(updated)
      syncDeckCounts(updated)
    } catch (err) {
      alert('Error deleting deck: ' + err.message)
    }
  }

  const startEditDeck = (deck) => {
    setDeckEdits(p => ({
      ...p,
      [deck.deck_id]: {
        topic: deck.topic || '',
        lecture_name: deck.lecture_name || '',
        lesson_number: deck.lesson_number || '',
        question_type: deck.question_type || 'mcq',
      },
    }))
  }

  const cancelEditDeck = (deckId) => {
    setDeckEdits(p => {
      const n = { ...p }
      delete n[deckId]
      return n
    })
  }

  const saveEditDeck = (deckId) => {
    const edit = deckEdits[deckId]
    const updated = decks.map(d =>
      d.deck_id === deckId
        ? { ...d, topic: edit.topic, lecture_name: edit.lecture_name, lesson_number: edit.lesson_number, question_type: edit.question_type }
        : d
    )
    setDecks(updated)
    cancelEditDeck(deckId)
  }

  const handleDeleteNote = async (noteId) => {
    try {
      const note = notes.find(n => n.document_id === noteId)
      let storageWarning = ''

      if (note?.document_url) {
        const filePath = getDocumentStoragePath(note.document_url)

        if (filePath) {
          const { error: storageError } = await supabase.storage.from('documents').remove([filePath])
          if (storageError) {
            storageWarning = 'The file could not be removed from storage.'
          }
        } else {
          storageWarning = 'The file URL could not be parsed for storage cleanup.'
        }
      }

      const res = await fetch(`${API_URL}/api/documents/${noteId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error)
      }
      const data = await res.json()
      const updated = notes.filter(n => n.document_id !== noteId)
      setNotes(updated)
      setNoteCount(updated.length)
      if (storageWarning || data.warning) {
        const warningMessage = ['Note deleted.']
        if (storageWarning) warningMessage.push(storageWarning)
        if (data.warning) warningMessage.push(data.warning)
        alert(warningMessage.join(' '))
      }
    } catch (err) {
      alert('Error deleting note: ' + err.message)
    }
  }

  const startEditNote = (note) => {
    setNoteEdits(p => ({
      ...p,
      [note.document_id]: {
        document_name: note.document_name,
        lecture_name: note.lecture_name || '',
        topic: note.topic || '',
        document_content: note.document_content,
      },
    }))
  }

  const cancelEditNote = (noteId) => {
    setNoteEdits(p => {
      const n = { ...p }
      delete n[noteId]
      return n
    })
  }

  const saveEditNote = (noteId) => {
    const edit = noteEdits[noteId]
    const updated = notes.map(n =>
      n.document_id === noteId
        ? { ...n, document_name: edit.document_name, lecture_name: edit.lecture_name, topic: edit.topic, document_content: edit.document_content }
        : n
    )
    setNotes(updated)
    cancelEditNote(noteId)
  }

  const handleDeleteQuestion = (deckId, qIndex) => {
    const updated = decks.map(d => {
      if (d.deck_id !== deckId) return d
      return { ...d, questions: d.questions.filter((_, i) => i !== qIndex) }
    })
    setDecks(updated)
  }

  const startEditQuestion = (deckId, qIndex, q) => {
    const key = `${deckId}-${qIndex}`
    setQuestionEdits(p => ({ ...p, [key]: { question: q.question, answer: q.answer } }))
  }

  const cancelEditQuestion = (deckId, qIndex) => {
    const key = `${deckId}-${qIndex}`
    setQuestionEdits(p => {
      const n = { ...p }
      delete n[key]
      return n
    })
  }

  const saveEditQuestion = (deckId, qIndex) => {
    const key = `${deckId}-${qIndex}`
    const edit = questionEdits[key]
    const updated = decks.map(d => {
      if (d.deck_id !== deckId) return d
      const qs = d.questions.map((q, i) => i === qIndex ? { ...q, question: edit.question, answer: edit.answer } : q)
      return { ...d, questions: qs }
    })
    setDecks(updated)
    cancelEditQuestion(deckId, qIndex)
  }

  const DeckEditForm = ({ deckId }) => (
    <div className="bg-blue-50 rounded-xl p-4 mt-2">
      <input
        value={deckEdits[deckId].topic}
        onChange={e => setDeckEdits(p => ({ ...p, [deckId]: { ...p[deckId], topic: e.target.value } }))}
        placeholder="Topic name"
        className="w-full border border-gray-200 rounded-lg p-2 text-[16px] mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <input
        value={deckEdits[deckId].lecture_name}
        onChange={e => setDeckEdits(p => ({ ...p, [deckId]: { ...p[deckId], lecture_name: e.target.value } }))}
        placeholder="Lecture name"
        className="w-full border border-gray-200 rounded-lg p-2 text-[16px] mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <input
        value={deckEdits[deckId].lesson_number}
        onChange={e => setDeckEdits(p => ({ ...p, [deckId]: { ...p[deckId], lesson_number: e.target.value } }))}
        placeholder="Lesson number"
        className="w-full border border-gray-200 rounded-lg p-2 text-[16px] mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <select
        value={deckEdits[deckId].question_type}
        onChange={e => setDeckEdits(p => ({ ...p, [deckId]: { ...p[deckId], question_type: e.target.value } }))}
        className="w-full border border-gray-200 rounded-lg p-2 text-[16px] mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <option value="mcq">Multiple Choice</option>
        <option value="short">Short Answer</option>
        <option value="fill">Fill in Blank</option>
      </select>
      <button onClick={() => saveEditDeck(deckId)} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg mr-2 min-h-[44px] inline-flex items-center">Save</button>
      <button onClick={() => cancelEditDeck(deckId)} className="bg-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg min-h-[44px] inline-flex items-center">Cancel</button>
    </div>
  )

  const typeBadge = (type) => (
    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-lg">
      {type === 'mcq' ? 'Multiple Choice' : type === 'short' ? 'Short Answer' : 'Fill in Blank'}
    </span>
  )

  const levelBadge = (level) => level ? (
    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-lg font-semibold">{level}</span>
  ) : null

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

  // ── Message fetch callbacks ──────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    setLoadingConvos(true)
    try {
      const res = await fetch(`${API_URL}/api/messages/conversations`, { headers: authHeaders() })
      const data = await res.json()
      if (res.ok) setConversations(data)
    } catch { /* ignore */ } finally { setLoadingConvos(false) }
  }, [])

  const fetchThread = useCallback(async (studentId) => {
    setLoadingThread(true)
    try {
      const res = await fetch(`${API_URL}/api/messages/conversation/${studentId}`, { headers: authHeaders() })
      const data = await res.json()
      if (res.ok) {
        setThreadMessages(data.messages || [])
        setUnreadCount(0)
        fetchConversations()
      }
    } catch { /* ignore */ } finally { setLoadingThread(false) }
  }, [fetchConversations])

  useEffect(() => {
    if (activePanel !== 'messages') return
    fetchConversations()
    const iv = setInterval(fetchConversations, 10000)
    return () => clearInterval(iv)
  }, [activePanel, fetchConversations])

  useEffect(() => {
    if (!selectedConvo) return
    const iv = setInterval(() => fetchThread(selectedConvo.user_id), 8000)
    return () => clearInterval(iv)
  }, [selectedConvo, fetchThread])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [threadMessages])

  const handleSendMsg = async (content) => {
    if (!selectedConvo) return
    setSendingMsg(true)
    try {
      const res = await fetch(`${API_URL}/api/messages/send`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver_id: selectedConvo.user_id, content }),
      })
      const data = await res.json()
      if (res.ok) setThreadMessages(prev => [...prev, data])
    } catch { /* ignore */ } finally { setSendingMsg(false) }
  }

  const panelClose = () => {
    setActivePanel(null)
    setIsSidebarOpen(false)
  }

  const handlePanelSelect = (panelKey) => {
    if (panelKey === 'profile') { navigate('/profile'); return }
    setActivePanel(current => current === panelKey ? null : panelKey)
    setIsSidebarOpen(false)
  }

  const sidebarItems = [
    { key: 'notes', label: 'Notes uploaded', icon: FileText, count: noteCount, badgeColor: '#7c3aed' },
    { key: 'uploaded', label: 'Questions uploaded', icon: UploadIcon, count: uploadedCount, badgeColor: '#ea580c' },
    { key: 'ai', label: 'AI Questions created', icon: Brain, count: aiCount, badgeColor: '#2563eb' },
    { key: 'decks', label: 'Total decks', icon: BookOpen, count: deckCount, badgeColor: '#059669' },
    { key: 'students', label: 'Students active', icon: Users, count: 0, badgeColor: '#4b5563' },
    { key: '_divider' },
    { key: 'messages', label: 'Messages', icon: MessageSquare, count: unreadCount, badgeColor: '#dc2626', hideIfZero: true },
    { key: 'profile', label: 'My Profile', icon: User, noBadge: true },
  ]

  const renderEmptyState = () => (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
        <LayoutDashboard className="h-10 w-10 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800">Select an item from the sidebar to view details</h3>
      <p className="mt-2 text-sm text-gray-500">Click any category on the left to see your content</p>
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

  const renderNotesPanel = () => renderPanelContainer('Notes uploaded', notes.length === 0 ? (
    <p className="text-gray-400 text-sm">No notes uploaded yet.</p>
  ) : notes.map(note => (
    <div key={note.document_id} className="border border-gray-200 rounded-xl p-4 mb-3">
      {noteEdits[note.document_id] ? (
        <div className="bg-blue-50 rounded-xl p-4 mt-2">
          <input
            value={noteEdits[note.document_id].document_name}
            onChange={e => setNoteEdits(p => ({ ...p, [note.document_id]: { ...p[note.document_id], document_name: e.target.value } }))}
            placeholder="File name"
            className="w-full border border-gray-200 rounded-lg p-2 text-[16px] mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            value={noteEdits[note.document_id].lecture_name}
            onChange={e => setNoteEdits(p => ({ ...p, [note.document_id]: { ...p[note.document_id], lecture_name: e.target.value } }))}
            placeholder="Lecture name"
            className="w-full border border-gray-200 rounded-lg p-2 text-[16px] mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            value={noteEdits[note.document_id].topic}
            onChange={e => setNoteEdits(p => ({ ...p, [note.document_id]: { ...p[note.document_id], topic: e.target.value } }))}
            placeholder="Topic"
            className="w-full border border-gray-200 rounded-lg p-2 text-[16px] mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <textarea
            value={noteEdits[note.document_id].document_content}
            onChange={e => setNoteEdits(p => ({ ...p, [note.document_id]: { ...p[note.document_id], document_content: e.target.value } }))}
            placeholder="Note content"
            rows={5}
            className="w-full border border-gray-200 rounded-lg p-2 text-[16px] mb-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button onClick={() => saveEditNote(note.document_id)} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg mr-2 min-h-[44px] inline-flex items-center">Save</button>
          <button onClick={() => cancelEditNote(note.document_id)} className="bg-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg min-h-[44px] inline-flex items-center">Cancel</button>
        </div>
      ) : (
        <div onClick={() => setViewNote(note)} className="flex items-start justify-between cursor-pointer">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-gray-500" />
            <div>
              <p className="font-bold text-gray-800">{note.document_name}</p>
              {(note.lecture_name || note.topic) && (
                <p className="text-green-600 text-sm">{[note.lecture_name, note.topic].filter(Boolean).join(' Â· ')}</p>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {levelBadge(note.class_level)}
                <p className="text-gray-400 text-xs">{note.created_at ? new Date(note.created_at).toLocaleDateString() : ''}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center ml-2 sm:ml-4 shrink-0 gap-1">
            <button onClick={e => { e.stopPropagation(); setViewNote(note) }} className="text-green-500 text-sm hover:text-green-700 font-semibold min-h-[44px] px-2 inline-flex items-center">View</button>
            <button
              title="Download note"
              onClick={e => {
                e.stopPropagation()
                const blob = new Blob([note.document_content || ''], { type: 'text/plain' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = note.document_name || 'note.txt'
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="text-blue-500 text-sm hover:text-blue-700 font-semibold min-h-[44px] px-2 inline-flex items-center"
            >
              Download
            </button>
            <button onClick={e => { e.stopPropagation(); startEditNote(note) }} className="text-blue-500 text-sm hover:text-blue-700 font-semibold min-h-[44px] px-2 inline-flex items-center">Edit</button>
            <button onClick={e => { e.stopPropagation(); handleDeleteNote(note.document_id) }} className="text-red-500 text-sm hover:text-red-700 font-semibold min-h-[44px] px-2 inline-flex items-center">Delete</button>
          </div>
        </div>
      )}
    </div>
  )))

  const renderUploadedPanel = () => {
    const uploadedDecks = decks.filter(d => d.is_uploaded)
    return renderPanelContainer('Questions uploaded', uploadedDecks.length === 0 ? (
      <p className="text-gray-400 text-sm">No uploaded question decks yet.</p>
    ) : uploadedDecks.map(deck => (
      <div key={deck.deck_id} className="border border-gray-200 rounded-xl p-4 mb-3">
        {deckEdits[deck.deck_id] ? (
          <DeckEditForm deckId={deck.deck_id} />
        ) : (
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <UploadIcon className="w-7 h-7 text-gray-500" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 className="font-bold text-gray-800">{deck.topic}</h4>
                  {typeBadge(deck.question_type)}
                  {levelBadge(deck.class_level)}
                </div>
                {deck.lecture_name && <p className="text-green-600 text-sm">{deck.lecture_name}</p>}
                <p className="text-gray-500 text-sm">Lesson {deck.lesson_number}</p>
                <p className="text-gray-400 text-xs mt-1">{deck.created_at ? new Date(deck.created_at).toLocaleDateString() : ''}</p>
              </div>
            </div>
            <div className="flex items-center ml-2 sm:ml-4 shrink-0 gap-1">
              <button onClick={() => startEditDeck(deck)} className="text-blue-500 text-sm hover:text-blue-700 font-semibold min-h-[44px] px-2 inline-flex items-center">Edit</button>
              <button onClick={() => handleDeleteDeck(deck.deck_id)} className="text-red-500 text-sm hover:text-red-700 font-semibold min-h-[44px] px-2 inline-flex items-center">Delete</button>
            </div>
          </div>
        )}
      </div>
    )))
  }

  const renderAiPanel = () => {
    const aiDecks = decks.filter(d => !d.is_uploaded)
    return renderPanelContainer('AI Questions created', aiDecks.length === 0 ? (
      <p className="text-gray-400 text-sm">No AI-generated decks yet.</p>
    ) : aiDecks.map(deck => (
      <div key={deck.deck_id} className="border border-gray-200 rounded-xl p-4 mb-3">
        {deckEdits[deck.deck_id] ? (
          <DeckEditForm deckId={deck.deck_id} />
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <Brain className="w-7 h-7 text-gray-500" />
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-bold text-gray-800">{deck.topic}</h4>
                    <span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-lg text-xs">{(deck.questions || []).length} Q</span>
                    {typeBadge(deck.question_type)}
                    {levelBadge(deck.class_level)}
                  </div>
                  <p className="text-green-600 font-semibold text-sm">Lesson {deck.lesson_number}</p>
                  <p className="text-gray-400 text-xs mt-1">{deck.created_at ? new Date(deck.created_at).toLocaleDateString() : ''}</p>
                </div>
              </div>
              <div className="flex items-center ml-2 sm:ml-4 shrink-0 gap-1 flex-wrap justify-end">
                <button
                  onClick={() => setExpandedDecks(p => ({ ...p, [deck.deck_id]: !p[deck.deck_id] }))}
                  className="text-blue-500 text-sm hover:text-blue-700 font-semibold min-h-[44px] px-2 inline-flex items-center"
                >
                  {expandedDecks[deck.deck_id] ? 'Collapse' : 'View Qs'}
                </button>
                <button onClick={() => startEditDeck(deck)} className="text-blue-500 text-sm hover:text-blue-700 font-semibold min-h-[44px] px-2 inline-flex items-center">Edit</button>
                <button onClick={() => handleDeleteDeck(deck.deck_id)} className="text-red-500 text-sm hover:text-red-700 font-semibold min-h-[44px] px-2 inline-flex items-center">Delete</button>
              </div>
            </div>

            {expandedDecks[deck.deck_id] && (
              <div className="mt-3 pl-9">
                {(deck.questions || []).length === 0 ? (
                  <p className="text-gray-400 text-sm">No questions in this deck.</p>
                ) : (deck.questions || []).map((q, i) => {
                  const key = `${deck.deck_id}-${i}`
                  return (
                    <div key={i} className="border-l-4 border-blue-400 pl-4 mb-3 py-1">
                      {questionEdits[key] ? (
                        <div className="bg-blue-50 rounded-xl p-3">
                          <input
                            value={questionEdits[key].question}
                            onChange={e => setQuestionEdits(p => ({ ...p, [key]: { ...p[key], question: e.target.value } }))}
                            placeholder="Question text"
                            className="w-full border border-gray-200 rounded-lg p-2 text-[16px] mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                          <input
                            value={questionEdits[key].answer}
                            onChange={e => setQuestionEdits(p => ({ ...p, [key]: { ...p[key], answer: e.target.value } }))}
                            placeholder="Correct answer"
                            className="w-full border border-gray-200 rounded-lg p-2 text-[16px] mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                          <button onClick={() => saveEditQuestion(deck.deck_id, i)} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg mr-2 min-h-[44px] inline-flex items-center">Save</button>
                          <button onClick={() => cancelEditQuestion(deck.deck_id, i)} className="bg-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg min-h-[44px] inline-flex items-center">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-gray-700 text-sm font-semibold">{i + 1}. {q.question}</p>
                            <p className="text-green-600 text-sm mt-0.5">Answer: {q.answer}</p>
                          </div>
                          <div className="flex items-center ml-2 gap-1 shrink-0">
                            <button onClick={() => startEditQuestion(deck.deck_id, i, q)} className="text-blue-500 text-sm hover:text-blue-700 font-semibold min-h-[44px] px-2 inline-flex items-center">Edit</button>
                            <button onClick={() => handleDeleteQuestion(deck.deck_id, i)} className="text-red-500 text-sm hover:text-red-700 font-semibold min-h-[44px] px-2 inline-flex items-center">Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    )))
  }

  const renderDecksPanel = () => renderPanelContainer('Total decks', decks.length === 0 ? (
    <p className="text-gray-400 text-sm">No decks created yet.</p>
  ) : decks.map(deck => (
    <div key={deck.deck_id} className="border border-gray-200 rounded-xl p-4 mb-3">
      {deckEdits[deck.deck_id] ? (
        <DeckEditForm deckId={deck.deck_id} />
      ) : (
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {deck.is_uploaded ? (
              <UploadIcon className="w-7 h-7 text-gray-500" />
            ) : (
              <Brain className="w-7 h-7 text-gray-500" />
            )}
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h4 className="font-bold text-gray-800">{deck.topic}</h4>
                <span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-lg text-xs">{(deck.questions || []).length} Q</span>
                {typeBadge(deck.question_type)}
                {levelBadge(deck.class_level)}
              </div>
              <p className="text-green-600 font-semibold text-sm">Lesson {deck.lesson_number}</p>
              <p className="text-gray-400 text-xs mt-1">{deck.created_at ? new Date(deck.created_at).toLocaleDateString() : ''}</p>
            </div>
          </div>
          <div className="flex items-center ml-2 sm:ml-4 shrink-0 gap-1">
            <button onClick={() => startEditDeck(deck)} className="text-blue-500 text-sm hover:text-blue-700 font-semibold min-h-[44px] px-2 inline-flex items-center">Edit</button>
            <button onClick={() => handleDeleteDeck(deck.deck_id)} className="text-red-500 text-sm hover:text-red-700 font-semibold min-h-[44px] px-2 inline-flex items-center">Delete</button>
          </div>
        </div>
      )}
    </div>
  )))

  const renderStudentsPanel = () => renderPanelContainer('Students active', (
    <p className="text-gray-400 text-sm">No active student data is available yet.</p>
  ))

  const renderMessagesPanel = () => {
    const myId = storedUser.user_id
    return (
      <div
        className="bg-white rounded-2xl shadow overflow-hidden flex"
        style={{ height: 'calc(100vh - 240px)', minHeight: 420 }}
      >
        {/* Left: student list */}
        <div
          className={`${msgMobileView === 'chat' ? 'hidden' : 'flex'} md:flex flex-col border-r border-gray-200 shrink-0`}
          style={{ width: 220 }}
        >
          <div className="px-4 py-3 border-b border-gray-100 shrink-0">
            <p className="font-bold text-gray-800 text-sm">Student Messages</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConvos && conversations.length === 0 ? (
              <p className="text-gray-400 text-xs text-center mt-8 animate-pulse px-4">Loading...</p>
            ) : conversations.length === 0 ? (
              <p className="text-gray-400 text-xs text-center mt-8 px-4">No student messages yet.</p>
            ) : conversations.map(convo => {
              const isSel = selectedConvo?.user_id === convo.user_id
              return (
                <button
                  key={convo.user_id}
                  onClick={() => { setSelectedConvo(convo); setThreadMessages([]); setMsgMobileView('chat'); fetchThread(convo.user_id) }}
                  className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left border-b border-gray-50 transition ${isSel ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-gray-50'}`}
                >
                  <div
                    className="rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white shrink-0 overflow-hidden"
                    style={{ width: 34, height: 34, minWidth: 34, fontSize: 12, fontWeight: 700 }}
                  >
                    {convo.avatar_url
                      ? <img src={convo.avatar_url} alt={convo.full_name} className="w-full h-full object-cover" />
                      : getMsgInitials(convo.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-gray-800 text-xs truncate">{convo.full_name}</span>
                      {convo.unread_count > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 shrink-0 leading-none">{convo.unread_count}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">
                      {(convo.last_message || '').length > 35 ? convo.last_message.slice(0, 35) + '…' : (convo.last_message || '')}
                    </p>
                    <p className="text-[10px] text-gray-300 mt-0.5">{formatMsgTime(convo.last_message_time)}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: conversation */}
        <div className={`${msgMobileView === 'list' ? 'hidden' : 'flex'} md:flex flex-col flex-1 overflow-hidden`}>
          {!selectedConvo ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-400 text-sm">Select a student to view the conversation</p>
            </div>
          ) : (
            <>
              <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => setMsgMobileView('list')}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition md:hidden"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div
                  className="rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white shrink-0 overflow-hidden"
                  style={{ width: 30, height: 30, minWidth: 30, fontSize: 11, fontWeight: 700 }}
                >
                  {selectedConvo.avatar_url
                    ? <img src={selectedConvo.avatar_url} alt={selectedConvo.full_name} className="w-full h-full object-cover" />
                    : getMsgInitials(selectedConvo.full_name)}
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm leading-tight">{selectedConvo.full_name}</p>
                  {selectedConvo.class_level && (
                    <span className="text-[10px] bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">{selectedConvo.class_level}</span>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 bg-[#f9fafb]">
                {loadingThread ? (
                  <div className="flex h-full items-center justify-center text-gray-400 text-sm animate-pulse">Loading messages...</div>
                ) : threadMessages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-gray-400 text-sm">No messages yet — send a message to start!</p>
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
                          {msg.sender_id === myId ? 'You' : selectedConvo.full_name} · {formatMsgTime(msg.created_at)}
                        </span>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <MsgInput onSend={handleSendMsg} disabled={sendingMsg} />
            </>
          )}
        </div>
      </div>
    )
  }

  const renderActivePanel = () => {
    if (!activePanel) return renderEmptyState()
    if (activePanel === 'notes') return renderNotesPanel()
    if (activePanel === 'uploaded') return renderUploadedPanel()
    if (activePanel === 'ai') return renderAiPanel()
    if (activePanel === 'decks') return renderDecksPanel()
    if (activePanel === 'messages') return renderMessagesPanel()
    return renderStudentsPanel()
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
            aria-label="Open dashboard navigation"
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
              Dashboard
            </div>
            <nav className="space-y-1.5 px-1">
              {sidebarItems.map(item => {
                if (item.key === '_divider') {
                  return <div key="_divider" className="mx-3 my-1 border-t border-gray-200" />
                }
                const Icon = item.icon
                const isActive = activePanel === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handlePanelSelect(item.key)}
                    className={`mx-3 flex min-h-[60px] w-[calc(100%-24px)] items-center justify-between rounded-[16px] border-2 px-5 py-4 text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-150 hover:scale-[1.01] hover:bg-[#f8fafc] hover:border-[#d1d5db] ${
                      isActive ? 'bg-[#eff6ff] border-[#2563eb]' : 'bg-white border-[#e5e7eb]'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      {item.key === 'profile' ? (
                        storedUser.avatar_url ? (
                          <img
                            src={storedUser.avatar_url}
                            alt="Profile"
                            className="shrink-0 rounded-full object-cover"
                            style={{ width: 32, height: 32, border: '2px solid #e5e7eb' }}
                          />
                        ) : (
                          <div
                            className="shrink-0 rounded-full flex items-center justify-center text-white"
                            style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', fontSize: 13, fontWeight: 700 }}
                          >
                            {getMsgInitials(storedUser.full_name)}
                          </div>
                        )
                      ) : (
                        <Icon className={`shrink-0 h-6 w-6 ${isActive ? 'text-[#1d4ed8]' : 'text-[#374151]'}`} />
                      )}
                      <span className={`text-[16px] font-semibold ${isActive ? 'text-[#1d4ed8]' : 'text-[#1f2937]'}`}>
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
            <p className="text-[16px] font-medium text-gray-600 mt-1">Manage your decks and create questions for your students.</p>
          </div>

          {loading && (
            <div className="bg-white rounded-2xl shadow p-6 mb-6 text-center text-blue-600 font-semibold animate-pulse">
              Loading your content...
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-red-600 text-sm">
              {error} - <button onClick={fetchAll} className="underline font-semibold">Retry</button>
            </div>
          )}

          <div className="mb-8 flex gap-4">
            <div
              onClick={() => {
                setActiveActionCard('upload')
                localStorage.setItem('zeevid_teacher_active_card', 'upload')
                navigate('/teacher/upload')
              }}
              className={`flex h-12 w-1/2 items-center justify-center gap-2 rounded-[14px] px-4 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(37,99,235,0.4)] transition-all duration-200 ease-in-out hover:scale-[1.02] hover:brightness-110 md:h-[52px] md:w-[220px] md:text-[15px] ${
                activeActionCard === 'upload'
                  ? 'ring-2 ring-blue-200'
                  : ''
              }`}
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
            >
              <UploadIcon className="h-5 w-5 text-white" />
              <span>Upload Content</span>
            </div>
            <div
              onClick={() => {
                setActiveActionCard('builder')
                localStorage.setItem('zeevid_teacher_active_card', 'builder')
                navigate('/teacher/builder')
              }}
              className={`flex h-12 w-1/2 items-center justify-center gap-2 rounded-[14px] px-4 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(5,150,105,0.4)] transition-all duration-200 ease-in-out hover:scale-[1.02] hover:brightness-110 md:h-[52px] md:w-[220px] md:text-[15px] ${
                activeActionCard === 'builder'
                  ? 'ring-2 ring-green-200'
                  : ''
              }`}
              style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
            >
              <Brain className="h-5 w-5 text-white" />
              <span>Question Builder</span>
            </div>
          </div>

          {renderActivePanel()}
        </main>
      </div>

      {viewNote && viewNote.document_url ? (
        <PDFViewer
          url={viewNote.document_url}
          fileName={viewNote.document_name}
          onClose={() => setViewNote(null)}
        />
      ) : viewNote && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '16px',
            width: '100%', maxWidth: '900px', maxHeight: '92vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px', borderBottom: '1px solid #f3f4f6',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', margin: 0, wordBreak: 'break-word' }}>
                  {viewNote.document_name}
                </h2>
                <p style={{ fontSize: '13px', color: '#16a34a', margin: '4px 0 0' }}>
                  {viewNote.lecture_name}{viewNote.topic ? ' Â· ' + viewNote.topic : ''}
                </p>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0' }}>
                  {viewNote.class_level} Â· {viewNote.created_at ? new Date(viewNote.created_at).toLocaleDateString() : ''}
                </p>
              </div>
              <button
                onClick={() => setViewNote(null)}
                style={{ fontSize: '24px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: '8px', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                Ã—
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', fontSize: '15px', lineHeight: '1.8', color: '#374151' }}>
              {viewNote.document_content && viewNote.document_content.split('\n').map((line, index) => (
                line.trim() === ''
                  ? <br key={index} />
                  : line.startsWith('Page ')
                    ? <p key={index} style={{ fontWeight: 'bold', color: '#1d4ed8', marginTop: '16px', marginBottom: '8px', fontSize: '13px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>{line}</p>
                    : <p key={index} style={{ marginBottom: '8px' }}>{line}</p>
              ))}
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
              <button
                onClick={() => setViewNote(null)}
                style={{ backgroundColor: '#f3f4f6', color: '#4b5563', fontWeight: '600', padding: '12px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '14px', minHeight: '44px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewDeck && viewDeck && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{viewDeck.topic}</h3>
                <p className="text-gray-400 text-sm">Lesson {viewDeck.lesson_number}</p>
              </div>
              <button onClick={() => setViewDeck(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">Ã—</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeacherDashboard


