import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { API_URL, authHeaders } from '../utils/api'
import Navbar from '../components/Navbar'

function getInitials(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatTime(ts) {
  if (!ts) return ''
  const date = new Date(ts)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (isToday) return time
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · ' + time
}

function Avatar({ name, avatarUrl, size = 36 }) {
  const initials = getInitials(name)
  const style = { width: size, height: size, minWidth: size }
  return (
    <div
      className="rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 shrink-0"
      style={style}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="text-white font-bold" style={{ fontSize: size * 0.35 }}>{initials}</span>
      )}
    </div>
  )
}

function MessageBubble({ msg, isOwn, senderName }) {
  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} mb-3`}>
      <div
        className={`px-4 py-2.5 text-sm leading-relaxed max-w-[75%] break-words ${
          isOwn
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-800 border border-gray-200'
        }`}
        style={{ borderRadius: 18 }}
      >
        {msg.content}
      </div>
      <span className="text-[11px] text-gray-400 mt-1 px-1">
        {senderName} · {formatTime(msg.created_at)}
      </span>
    </div>
  )
}

function MessageInput({ onSend, disabled }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 72) + 'px'
  }

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white px-3 py-3 flex items-end gap-2">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={e => { setText(e.target.value); autoResize() }}
        onKeyDown={handleKeyDown}
        placeholder="Type a message... (Enter to send)"
        rows={1}
        className="flex-1 resize-none border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400 overflow-y-auto"
        style={{ maxHeight: 72 }}
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || disabled}
        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white p-3 rounded-2xl transition disabled:opacity-40 shrink-0"
        title="Send"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─── Student View ─────────────────────────────────────────────────────────────

function StudentMessages() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [teacher, setTeacher] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/messages/my-messages`, { headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTeacher(data.teacher)
      setMessages(data.messages || [])
    } catch (err) {
      console.error('Load messages error:', err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (content) => {
    if (!teacher) return
    setSending(true)
    try {
      const res = await fetch(`${API_URL}/api/messages/send`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver_id: teacher.user_id, content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessages(prev => [...prev, data])
    } catch (err) {
      console.error('Send error:', err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col max-w-2xl w-full mx-auto h-[calc(100vh-80px)]">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/student/home')}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full text-gray-500 hover:bg-gray-100 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {teacher ? (
            <>
              <Avatar name={teacher.full_name} avatarUrl={teacher.avatar_url} />
              <div>
                <p className="font-bold text-gray-800 text-sm">{teacher.full_name}</p>
                <p className="text-xs text-gray-400">Your Teacher</p>
              </div>
            </>
          ) : (
            <h1 className="font-bold text-gray-800">Messages</h1>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm animate-pulse">
              Loading messages...
            </div>
          ) : !teacher ? (
            <div className="flex items-center justify-center h-full text-center px-6">
              <p className="text-gray-400 text-sm">Your teacher has not been assigned yet.</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center px-6">
              <p className="text-gray-400 text-sm">No messages yet — send your first message!</p>
            </div>
          ) : (
            <>
              {messages.map(msg => (
                <MessageBubble
                  key={msg.message_id}
                  msg={msg}
                  isOwn={msg.sender_id === user.user_id}
                  senderName={msg.sender_id === user.user_id ? 'You' : teacher.full_name}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        {teacher && <MessageInput onSend={handleSend} disabled={sending} />}
      </div>
    </div>
  )
}

// ─── Teacher View ─────────────────────────────────────────────────────────────

function TeacherMessages() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)   // { user_id, full_name, avatar_url, class_level }
  const [messages, setMessages] = useState([])
  const [loadingConvos, setLoadingConvos] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [sending, setSending] = useState(false)
  const [mobileView, setMobileView] = useState('list') // 'list' | 'chat'
  const messagesEndRef = useRef(null)

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/messages/conversations`, { headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setConversations(data)
    } catch (err) {
      console.error('Load convos error:', err.message)
    } finally {
      setLoadingConvos(false)
    }
  }, [])

  const loadMessages = useCallback(async (studentId) => {
    if (!studentId) return
    setLoadingMsgs(true)
    try {
      const res = await fetch(`${API_URL}/api/messages/conversation/${studentId}`, {
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessages(data.messages || [])
      // Refresh convo list to clear unread badge
      loadConversations()
    } catch (err) {
      console.error('Load messages error:', err.message)
    } finally {
      setLoadingMsgs(false)
    }
  }, [loadConversations])

  useEffect(() => {
    loadConversations()
    const interval = setInterval(loadConversations, 10000)
    return () => clearInterval(interval)
  }, [loadConversations])

  // Poll messages for selected student
  useEffect(() => {
    if (!selected) return
    const interval = setInterval(() => loadMessages(selected.user_id), 8000)
    return () => clearInterval(interval)
  }, [selected, loadMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSelectStudent = (convo) => {
    setSelected(convo)
    setMessages([])
    setMobileView('chat')
    loadMessages(convo.user_id)
  }

  const handleSend = async (content) => {
    if (!selected) return
    setSending(true)
    try {
      const res = await fetch(`${API_URL}/api/messages/send`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver_id: selected.user_id, content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessages(prev => [...prev, data])
    } catch (err) {
      console.error('Send error:', err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">
      <Navbar />

      <div
        className="flex flex-1 overflow-hidden mx-auto w-full max-w-5xl"
        style={{ height: 'calc(100vh - 80px)' }}
      >
        {/* Left panel: conversation list */}
        <div
          className={`${mobileView === 'chat' ? 'hidden' : 'flex'} md:flex flex-col bg-white border-r border-gray-200`}
          style={{ width: '100%', maxWidth: 260, minWidth: 200 }}
        >
          <div className="px-4 py-4 border-b border-gray-100 flex items-center gap-2">
            <button
              onClick={() => navigate('/teacher/dashboard')}
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition md:hidden"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="font-bold text-gray-800 text-[15px]">Student Messages</h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConvos ? (
              <p className="text-center text-gray-400 text-sm mt-8 animate-pulse">Loading...</p>
            ) : conversations.length === 0 ? (
              <p className="text-center text-gray-400 text-sm mt-8 px-4">No student messages yet.</p>
            ) : (
              conversations.map(convo => {
                const isActive = selected?.user_id === convo.user_id
                return (
                  <button
                    key={convo.user_id}
                    onClick={() => handleSelectStudent(convo)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition border-b border-gray-50 ${
                      isActive ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-gray-50'
                    }`}
                  >
                    <Avatar name={convo.full_name} avatarUrl={convo.avatar_url} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-gray-800 text-sm truncate">{convo.full_name}</span>
                        {convo.unread_count > 0 && (
                          <span className="shrink-0 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                            {convo.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {convo.last_message.length > 40
                          ? convo.last_message.slice(0, 40) + '…'
                          : convo.last_message}
                      </p>
                      <p className="text-[10px] text-gray-300 mt-0.5">{formatTime(convo.last_message_time)}</p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right panel: conversation */}
        <div
          className={`${mobileView === 'list' ? 'hidden' : 'flex'} md:flex flex-col flex-1 overflow-hidden`}
        >
          {!selected ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <p className="font-semibold text-sm">Select a student to view the conversation</p>
              </div>
            </div>
          ) : (
            <>
              {/* Conversation header */}
              <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setMobileView('list')}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition md:hidden"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <Avatar name={selected.full_name} avatarUrl={selected.avatar_url} size={36} />
                <div>
                  <p className="font-bold text-gray-800 text-sm">{selected.full_name}</p>
                  {selected.class_level && (
                    <span className="text-[11px] bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                      {selected.class_level}
                    </span>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 bg-[#f9fafb]">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm animate-pulse">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center px-6">
                    <p className="text-gray-400 text-sm">No messages yet — send a message to start the conversation!</p>
                  </div>
                ) : (
                  <>
                    {messages.map(msg => (
                      <MessageBubble
                        key={msg.message_id}
                        msg={msg}
                        isOwn={msg.sender_id === user.user_id}
                        senderName={msg.sender_id === user.user_id ? 'You' : selected.full_name}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <MessageInput onSend={handleSend} disabled={sending} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function Messages() {
  const { user } = useAuth()
  return user?.user_type === 'teacher' ? <TeacherMessages /> : <StudentMessages />
}
