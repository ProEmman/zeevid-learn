import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { API_URL, authHeaders } from '../utils/api'

function getInitials(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Navbar() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    const fetchUnread = async () => {
      try {
        const res = await fetch(`${API_URL}/api/messages/unread-count`, { headers: authHeaders() })
        if (res.ok) {
          const data = await res.json()
          setUnreadCount(data.count || 0)
        }
      } catch { /* ignore */ }
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [user])

  const isTeacher = user?.user_type === 'teacher'
  const bgColor = isTeacher ? 'bg-blue-600' : 'bg-green-600'
  const subtitleColor = isTeacher ? 'text-blue-200' : 'text-green-200'
  const btnTextColor = isTeacher ? 'text-blue-600' : 'text-green-600'
  const btnHoverBg = isTeacher ? 'hover:bg-blue-50' : 'hover:bg-green-50'
  const portalLabel = isTeacher ? 'Teacher Portal' : 'Student Portal'

  const avatarUrl = user?.avatar_url
  const initials = getInitials(user?.full_name)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className={`${bgColor} text-white p-4 sm:p-6`}>
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">ZeeVid Learn+</h1>
          <p className={`${subtitleColor} text-sm`}>{portalLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Messages button */}
          <button
            onClick={() => navigate('/messages')}
            className="relative w-9 h-9 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition shrink-0"
            title="Messages"
          >
            <MessageSquare className="w-5 h-5 text-white" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white/80" />
            )}
          </button>

          {/* Profile button */}
          <button
            onClick={() => navigate('/profile')}
            className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-white/20 hover:bg-white/30 transition border-2 border-white/50 shrink-0"
            title="My Profile"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-sm font-bold leading-none">{initials}</span>
            )}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={`bg-white ${btnTextColor} font-semibold px-4 py-2 rounded-lg text-sm ${btnHoverBg} transition min-h-[44px]`}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
