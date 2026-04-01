import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const isTeacher = user?.user_type === 'teacher'
  const bgColor = isTeacher ? 'bg-blue-600' : 'bg-green-600'
  const subtitleColor = isTeacher ? 'text-blue-200' : 'text-green-200'
  const btnTextColor = isTeacher ? 'text-blue-600' : 'text-green-600'
  const btnHoverBg = isTeacher ? 'hover:bg-blue-50' : 'hover:bg-green-50'
  const portalLabel = isTeacher ? 'Teacher Portal' : 'Student Portal'

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
