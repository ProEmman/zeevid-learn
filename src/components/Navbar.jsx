import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const storedUser = (() => { try { return JSON.parse(localStorage.getItem('zeevid_user') || '{}') } catch { return {} } })()
  const resolvedUserType = storedUser.user_type || user?.user_type
  const isTeacher = resolvedUserType === 'teacher'
  const btnTextColor = isTeacher ? 'text-blue-600' : 'text-green-600'
  const btnHoverBg = isTeacher ? 'hover:bg-blue-50' : 'hover:bg-green-50'
  const portalLabel = isTeacher ? 'Teacher Portal' : 'Student Portal'

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleHomeNavigate = () => {
    navigate(isTeacher ? '/teacher/dashboard' : '/student/home')
  }

  return (
    <div
      className="text-white px-4 py-4 sm:px-4 sm:py-5"
      style={{ background: 'var(--color-primary, #2563eb)' }}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
        <button
          type="button"
          onClick={handleHomeNavigate}
          className="flex cursor-pointer items-center gap-[10px] text-left transition-opacity duration-150 hover:opacity-90"
        >
          <img
            src="/ZeeVid2.png"
            alt="ZeeVid Learn+"
            className="h-[36px] w-[36px] rounded-[8px] object-cover"
          />
          <div>
            <h1 className="text-[18px] font-bold leading-tight text-white">ZeeVid Learn+</h1>
            <p className="text-[11px] text-white/80">{portalLabel}</p>
          </div>
        </button>
        <button
          onClick={handleLogout}
          className={`bg-white ${btnTextColor} font-semibold px-4 py-2 rounded-lg text-sm ${btnHoverBg} transition min-h-[44px]`}
        >
          Logout
        </button>
      </div>
    </div>
  )
}
