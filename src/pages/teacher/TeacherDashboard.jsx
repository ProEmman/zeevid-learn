import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Brain, FileText, Upload as UploadIcon, Users } from 'lucide-react'
import { API_URL, authHeaders } from '../../utils/api'
import { supabase } from '../../lib/supabase'
import PDFViewer from '../../components/PDFViewer'

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

function TeacherDashboard() {
  const navigate = useNavigate()
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

  // inline edit states
  const [deckEdits, setDeckEdits] = useState({})
  const [noteEdits, setNoteEdits] = useState({})
  const [questionEdits, setQuestionEdits] = useState({})

  // view overlays
  const [viewNote, setViewNote] = useState(null)
  const [viewDeck, setViewDeck] = useState(null)

  const [expandedDecks, setExpandedDecks] = useState({})
  const showViewDeck = false

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

  // ── Deck helpers ───────────────────────────────────────────────
  const handleDeleteDeck = async (deckId) => {
    try {
      const res = await fetch(`${API_URL}/api/decks/${deckId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
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
      [deck.deck_id]: { topic: deck.topic || '', lecture_name: deck.lecture_name || '', lesson_number: deck.lesson_number || '', question_type: deck.question_type || 'mcq' }
    }))
  }

  const cancelEditDeck = (deckId) => {
    setDeckEdits(p => { const n = { ...p }; delete n[deckId]; return n })
  }

  const saveEditDeck = (deckId) => {
    const edit = deckEdits[deckId]
    const updated = decks.map(d =>
      d.deck_id === deckId ? { ...d, topic: edit.topic, lecture_name: edit.lecture_name, lesson_number: edit.lesson_number, question_type: edit.question_type } : d
    )
    setDecks(updated)
    cancelEditDeck(deckId)
  }

  // ── Note helpers ───────────────────────────────────────────────
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
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
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
      [note.document_id]: { document_name: note.document_name, lecture_name: note.lecture_name || '', topic: note.topic || '', document_content: note.document_content }
    }))
  }

  const cancelEditNote = (noteId) => {
    setNoteEdits(p => { const n = { ...p }; delete n[noteId]; return n })
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

  // ── Question helpers ───────────────────────────────────────────
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
    setQuestionEdits(p => { const n = { ...p }; delete n[key]; return n })
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

  // ── Reusable sub-components ────────────────────────────────────

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

  const panelClose = () => setActivePanel(null)

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Header */}
      <div className="bg-blue-600 text-white p-4 sm:p-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">ZeeVid Learn+</h1>
            <p className="text-blue-200 text-sm">Teacher Portal</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="bg-white text-blue-600 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-blue-50 transition min-h-[44px]"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 sm:p-6">

        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-[28px] font-extrabold text-gray-800">Welcome, Teacher!</h2>
          <p className="text-[16px] font-medium text-gray-600 mt-1">Manage your decks and create questions for your students.</p>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl shadow p-6 mb-6 text-center text-blue-600 font-semibold animate-pulse">
            Loading your content...
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-red-600 text-sm">
            {error} — <button onClick={fetchAll} className="underline font-semibold">Retry</button>
          </div>
        )}

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div
            onClick={() => {
              setActiveActionCard('upload')
              localStorage.setItem('zeevid_teacher_active_card', 'upload')
              navigate('/teacher/upload')
            }}
            className={`rounded-2xl shadow p-6 cursor-pointer border transition-all duration-200 ease-in-out ${
              activeActionCard === 'upload'
                ? 'bg-blue-50 border-blue-500 shadow-md'
                : 'bg-white border-transparent hover:shadow-md'
            }`}
          >
            <div className="bg-blue-100 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
              <UploadIcon className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-[18px] font-bold text-gray-800">Upload Content</h3>
            <p className="text-gray-500 text-[14px] font-medium mt-1">Upload notes or pre-made questions for your students</p>
          </div>
          <div
            onClick={() => {
              setActiveActionCard('builder')
              localStorage.setItem('zeevid_teacher_active_card', 'builder')
              navigate('/teacher/builder')
            }}
            className={`rounded-2xl shadow p-6 cursor-pointer border transition-all duration-200 ease-in-out ${
              activeActionCard === 'builder'
                ? 'bg-blue-50 border-blue-500 shadow-md'
                : 'bg-white border-transparent hover:shadow-md'
            }`}
          >
            <div className="bg-green-100 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
              <Brain className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-[18px] font-bold text-gray-800">Question Builder</h3>
            <p className="text-gray-500 text-[14px] font-medium mt-1">Use AI to generate questions from your notes</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div
            onClick={() => setActivePanel(activePanel === 'notes' ? null : 'notes')}
            className={`rounded-2xl shadow-lg p-5 text-center cursor-pointer transition-all duration-200 ease-in-out min-h-[170px] flex flex-col items-center justify-between ${
              activePanel === 'notes'
                ? 'bg-gradient-to-br from-[#6d28d9] to-[#4c1d95] scale-[1.02]'
                : 'bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] hover:brightness-95 hover:scale-[1.02]'
            }`}
          >
            <div className="flex justify-center">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-[36px] font-extrabold text-white">{noteCount}</p>
              <p className="text-white/85 text-[13px] font-semibold mt-2">Notes uploaded</p>
            </div>
            <p className="text-[12px] font-medium text-white/75">Tap to view</p>
          </div>
          <div
            onClick={() => setActivePanel(activePanel === 'uploaded' ? null : 'uploaded')}
            className={`rounded-2xl shadow-lg p-5 text-center cursor-pointer transition-all duration-200 ease-in-out min-h-[170px] flex flex-col items-center justify-between ${
              activePanel === 'uploaded'
                ? 'bg-gradient-to-br from-[#c2410c] to-[#9a3412] scale-[1.02]'
                : 'bg-gradient-to-br from-[#ea580c] to-[#c2410c] hover:brightness-95 hover:scale-[1.02]'
            }`}
          >
            <div className="flex justify-center">
              <UploadIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-[36px] font-extrabold text-white">{uploadedCount}</p>
              <p className="text-white/85 text-[13px] font-semibold mt-2">Questions uploaded</p>
            </div>
            <p className="text-[12px] font-medium text-white/75">Tap to view</p>
          </div>
          <div
            onClick={() => setActivePanel(activePanel === 'ai' ? null : 'ai')}
            className={`rounded-2xl shadow-lg p-5 text-center cursor-pointer transition-all duration-200 ease-in-out min-h-[170px] flex flex-col items-center justify-between ${
              activePanel === 'ai'
                ? 'bg-gradient-to-br from-[#1d4ed8] to-[#1e40af] scale-[1.02]'
                : 'bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] hover:brightness-95 hover:scale-[1.02]'
            }`}
          >
            <div className="flex justify-center">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-[36px] font-extrabold text-white">{aiCount}</p>
              <p className="text-white/85 text-[13px] font-semibold mt-2">AI Questions created</p>
            </div>
            <p className="text-[12px] font-medium text-white/75">Tap to view</p>
          </div>
          <div
            onClick={() => setActivePanel(activePanel === 'decks' ? null : 'decks')}
            className={`rounded-2xl shadow-lg p-5 text-center cursor-pointer transition-all duration-200 ease-in-out min-h-[170px] flex flex-col items-center justify-between ${
              activePanel === 'decks'
                ? 'bg-gradient-to-br from-[#047857] to-[#065f46] scale-[1.02]'
                : 'bg-gradient-to-br from-[#059669] to-[#047857] hover:brightness-95 hover:scale-[1.02]'
            }`}
          >
            <div className="flex justify-center">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-[36px] font-extrabold text-white">{deckCount}</p>
              <p className="text-white/85 text-[13px] font-semibold mt-2">Total decks</p>
            </div>
            <p className="text-[12px] font-medium text-white/75">Tap to view</p>
          </div>
          <div className="rounded-2xl shadow-lg p-5 text-center bg-gradient-to-br from-[#4b5563] to-[#374151] hover:brightness-95 hover:scale-[1.02] transition-all duration-200 ease-in-out cursor-pointer min-h-[170px] flex flex-col items-center justify-between">
            <div className="flex justify-center">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-[36px] font-extrabold text-white">0</p>
              <p className="text-white/85 text-[13px] font-semibold mt-2">Students active</p>
            </div>
            <p className="text-[12px] font-medium text-white/75">Tap to view</p>
          </div>
        </div>

        {/* ══ PANEL 1 — Uploaded Notes ══ */}
        {activePanel === 'notes' && (
          <div className="bg-white rounded-2xl shadow p-6 mt-6">
            <div className="text-[20px] font-bold text-gray-800 mb-4 flex justify-between items-center">
              <span>Uploaded Notes</span>
              <button onClick={panelClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer w-11 h-11 flex items-center justify-center shrink-0">×</button>
            </div>
            {notes.length === 0 ? (
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
                          <p className="text-green-600 text-sm">{[note.lecture_name, note.topic].filter(Boolean).join(' · ')}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {levelBadge(note.class_level)}
                          <p className="text-gray-400 text-xs">{note.created_at ? new Date(note.created_at).toLocaleDateString() : ''}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center ml-2 sm:ml-4 shrink-0 gap-1">
                      <button onClick={e => { e.stopPropagation(); setViewNote(note) }} className="text-green-500 text-sm hover:text-green-700 font-semibold min-h-[44px] px-2 inline-flex items-center">View</button>
                      <button title="Download note" onClick={e => {
                        e.stopPropagation()
                        const blob = new Blob([note.document_content || ''], { type: 'text/plain' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = note.document_name || 'note.txt'
                        a.click()
                        URL.revokeObjectURL(url)
                      }} className="text-blue-500 text-sm hover:text-blue-700 font-semibold min-h-[44px] px-2 inline-flex items-center">⬇</button>
                      <button onClick={e => { e.stopPropagation(); startEditNote(note) }} className="text-blue-500 text-sm hover:text-blue-700 font-semibold min-h-[44px] px-2 inline-flex items-center">Edit</button>
                      <button onClick={e => { e.stopPropagation(); handleDeleteNote(note.document_id) }} className="text-red-500 text-sm hover:text-red-700 font-semibold min-h-[44px] px-2 inline-flex items-center">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ══ PANEL 2 — Uploaded Question Decks ══ */}
        {activePanel === 'uploaded' && (
          <div className="bg-white rounded-2xl shadow p-6 mt-6">
            <div className="text-[20px] font-bold text-gray-800 mb-4 flex justify-between items-center">
              <span>Uploaded Question Decks</span>
              <button onClick={panelClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer w-11 h-11 flex items-center justify-center shrink-0">×</button>
            </div>
            {decks.filter(d => d.is_uploaded).length === 0 ? (
              <p className="text-gray-400 text-sm">No uploaded question decks yet.</p>
            ) : decks.filter(d => d.is_uploaded).map(deck => (
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
            ))}
          </div>
        )}

        {/* ══ PANEL 3 — AI Generated Question Decks ══ */}
        {activePanel === 'ai' && (
          <div className="bg-white rounded-2xl shadow p-6 mt-6">
            <div className="text-[20px] font-bold text-gray-800 mb-4 flex justify-between items-center">
              <span>AI Generated Question Decks</span>
              <button onClick={panelClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer w-11 h-11 flex items-center justify-center shrink-0">×</button>
            </div>
            {decks.filter(d => !d.is_uploaded).length === 0 ? (
              <p className="text-gray-400 text-sm">No AI-generated decks yet.</p>
            ) : decks.filter(d => !d.is_uploaded).map(deck => (
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
                                    <p className="text-green-600 text-sm mt-0.5">✓ {q.answer}</p>
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
            ))}
          </div>
        )}

        {/* ══ PANEL 4 — All Decks ══ */}
        {activePanel === 'decks' && (
          <div className="bg-white rounded-2xl shadow p-6 mt-6">
            <div className="text-[20px] font-bold text-gray-800 mb-4 flex justify-between items-center">
              <span>All Decks</span>
              <button onClick={panelClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer w-11 h-11 flex items-center justify-center shrink-0">×</button>
            </div>
            {decks.length === 0 ? (
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
            ))}
          </div>
        )}

      </div>

      {/* ── Note View Overlay ── */}
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
                  {viewNote.lecture_name}{viewNote.topic ? ' · ' + viewNote.topic : ''}
                </p>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0' }}>
                  {viewNote.class_level} · {viewNote.created_at ? new Date(viewNote.created_at).toLocaleDateString() : ''}
                </p>
              </div>
              <button onClick={() => setViewNote(null)}
                style={{ fontSize: '24px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: '8px', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                ×
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
              <button onClick={() => setViewNote(null)}
                style={{ backgroundColor: '#f3f4f6', color: '#4b5563', fontWeight: '600', padding: '12px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '14px', minHeight: '44px' }}>
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
              <button onClick={() => setViewDeck(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default TeacherDashboard
