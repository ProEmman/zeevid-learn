import { useNavigate } from 'react-router-dom'
import { Brain, Monitor, Shield } from 'lucide-react'

const teacherLinks = [
  { label: 'Dashboard', to: '/teacher/dashboard' },
  { label: 'Upload Content', to: '/teacher/upload' },
  { label: 'Question Builder', to: '/teacher/question-builder' },
  { label: 'My Profile', to: '/profile' },
]

const studentLinks = [
  { label: 'Home', to: '/student/home' },
  { label: 'My Profile', to: '/profile' },
]

export default function Footer({ minimal = false }) {
  const navigate = useNavigate()
  const storedUser = (() => { try { return JSON.parse(localStorage.getItem('zeevid_user') || '{}') } catch { return {} } })()
  const isTeacher = storedUser.user_type === 'teacher'
  const links = isTeacher ? teacherLinks : studentLinks

  if (minimal) {
    return (
      <footer className="bg-[#1a1f2e] px-4 py-5 text-center text-[12px] text-white/60">
        © 2026 ZeeVid Learn+ — Next-generation learning starts here
      </footer>
    )
  }

  return (
    <footer className="bg-[#1a1f2e] px-4 py-5 text-white sm:px-6 sm:py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          <div className="border-b border-white/10 pb-6 text-center md:border-b-0 md:pb-0 md:text-left">
            <div className="flex items-center justify-center gap-[10px] md:justify-start">
              <img
                src="/ZeeVid.png"
                alt="ZeeVid Learn+"
                className="h-8 w-8 rounded-[8px] object-cover"
              />
              <span className="text-base font-bold text-white">ZeeVid Learn+</span>
            </div>
            <p className="mt-3 text-[13px] text-white/70">Next-generation learning starts here</p>
            <p className="mt-4 text-[12px] text-white/50">© 2026 ZeeVid Learn+. All rights reserved.</p>
          </div>

          <div className="border-b border-white/10 pb-6 text-center md:border-b-0 md:pb-0 md:text-left">
            <h3 className="mb-3 text-[14px] font-bold text-white">Quick Links</h3>
            <div className="flex flex-col gap-2">
              {links.map(link => (
                <button
                  key={link.to}
                  type="button"
                  onClick={() => navigate(link.to)}
                  className="text-[13px] text-white/80 transition hover:opacity-100 hover:underline"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-center md:text-left">
            <h3 className="mb-3 text-[14px] font-bold text-white">About</h3>
            <p className="text-[13px] leading-6 text-white/70">
              ZeeVid Learn+ is an AI-powered study platform helping teachers and students achieve more together.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-center gap-1.5 text-[12px] text-white/80 md:justify-start">
                <Brain className="h-[14px] w-[14px]" />
                <span>Powered by AI</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-[12px] text-white/80 md:justify-start">
                <Shield className="h-[14px] w-[14px]" />
                <span>Secure &amp; Private</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-[12px] text-white/80 md:justify-start">
                <Monitor className="h-[14px] w-[14px]" />
                <span>Works on all devices</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-white/15 pt-4 text-center text-[12px] text-white/50">
          Built with ❤️ for teachers and students everywhere
        </div>
      </div>
    </footer>
  )
}
