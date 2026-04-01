import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, Eye, EyeOff, Lock, Menu, User as UserIcon, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { API_URL, authHeaders } from '../utils/api'
import Navbar from '../components/Navbar'

function getInitials(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getPasswordStrength(password) {
  if (!password) return { label: '', width: '0%', color: 'bg-gray-200' }

  let score = 0
  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1

  if (score <= 1) return { label: 'Weak', width: '33.33%', color: 'bg-red-500', textColor: 'text-red-600' }
  if (score === 2) return { label: 'Medium', width: '66.66%', color: 'bg-orange-500', textColor: 'text-orange-600' }
  return { label: 'Strong', width: '100%', color: 'bg-green-500', textColor: 'text-green-600' }
}

function FieldLabel({ children }) {
  return <label className="mb-2 block text-sm font-semibold text-gray-700">{children}</label>
}

function TextInput({ className = '', icon: Icon, ...props }) {
  return (
    <div className="relative">
      {Icon && <Icon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />}
      <input
        {...props}
        className={`w-full rounded-[10px] border-[1.5px] border-[#e5e7eb] bg-white px-4 py-3 text-[15px] text-gray-700 outline-none transition-all duration-150 placeholder:text-gray-400 focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] ${Icon ? 'pl-12' : ''} ${className}`}
      />
    </div>
  )
}

function PasswordInput({ value, onChange, placeholder, visible, onToggle }) {
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-[10px] border-[1.5px] border-[#e5e7eb] bg-white py-3 pl-12 pr-12 text-[15px] text-gray-700 outline-none transition-all duration-150 placeholder:text-gray-400 focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  )
}

function Profile() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()

  const [form, setForm] = useState({
    full_name: '',
    username: '',
    email: '',
    phone_number: '',
    bio: '',
    avatar_url: '',
  })
  const [classLevel, setClassLevel] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' })
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [activeView, setActiveView] = useState('profile')
  const fileInputRef = useRef(null)

  const [pwForm, setPwForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' })
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/profile`, { headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load profile')
      setForm({
        full_name: data.full_name || '',
        username: data.username || '',
        email: data.email || '',
        phone_number: data.phone_number || '',
        bio: data.bio || '',
        avatar_url: data.avatar_url || '',
      })
      if (data.class_level) setClassLevel(data.class_level)
    } catch {
      const stored = (() => { try { return JSON.parse(localStorage.getItem('zeevid_user') || '{}') } catch { return {} } })()
      setForm({
        full_name: stored.full_name || '',
        username: stored.username || '',
        email: stored.email || '',
        phone_number: stored.phone_number || '',
        bio: stored.bio || '',
        avatar_url: stored.avatar_url || '',
      })
      if (stored.class_level) setClassLevel(stored.class_level)
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setAvatarUploading(true)
    setProfileMsg({ type: '', text: '' })
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${user.user_id}_${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)

      const res = await fetch(`${API_URL}/api/profile`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, avatar_url: publicUrl }),
      })
      if (!res.ok) throw new Error('Failed to save avatar URL')

      setForm(prev => ({ ...prev, avatar_url: publicUrl }))

      const stored = (() => { try { return JSON.parse(localStorage.getItem('zeevid_user') || '{}') } catch { return {} } })()
      localStorage.setItem('zeevid_user', JSON.stringify({ ...stored, avatar_url: publicUrl }))
      refreshUser()
    } catch (err) {
      setProfileMsg({ type: 'error', text: `Failed to upload photo: ${err.message}` })
    } finally {
      setAvatarUploading(false)
      e.target.value = ''
    }
  }

  const handleProfileSave = async () => {
    setProfileSaving(true)
    setProfileMsg({ type: '', text: '' })
    try {
      const res = await fetch(`${API_URL}/api/profile`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save profile')

      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' })

      const stored = (() => { try { return JSON.parse(localStorage.getItem('zeevid_user') || '{}') } catch { return {} } })()
      localStorage.setItem('zeevid_user', JSON.stringify({ ...stored, ...form }))
      refreshUser()
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message })
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!pwForm.current_password) {
      setPwMsg({ type: 'error', text: 'Please enter your current password' })
      return
    }
    if (!pwForm.new_password) {
      setPwMsg({ type: 'error', text: 'New password cannot be empty' })
      return
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwMsg({ type: 'error', text: 'New passwords do not match' })
      return
    }

    setPwSaving(true)
    setPwMsg({ type: '', text: '' })
    try {
      const res = await fetch(`${API_URL}/api/profile/password`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: pwForm.current_password,
          new_password: pwForm.new_password,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const message = data.error || 'Failed to change password'
        if (/current password/i.test(message) || /incorrect/i.test(message)) {
          throw new Error('Current password is incorrect')
        }
        throw new Error(message)
      }

      setPwMsg({ type: 'success', text: 'Password changed successfully!' })
      setPwForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      setPwMsg({ type: 'error', text: err.message })
    } finally {
      setPwSaving(false)
    }
  }

  const isTeacher = user?.user_type === 'teacher'
  const initials = getInitials(form.full_name || user?.full_name)
  const passwordStrength = useMemo(() => getPasswordStrength(pwForm.new_password), [pwForm.new_password])

  const goBack = () => navigate(isTeacher ? '/teacher/dashboard' : '/student/home')

  const sidebarItems = [
    { key: 'profile', label: 'Profile Information', icon: UserIcon },
    { key: 'password', label: 'Change Password', icon: Lock },
  ]

  const handleViewSelect = (view) => {
    setActiveView(view)
    setIsSidebarOpen(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9fafb]">
        <Navbar />
        <div className="flex items-center justify-center px-4 py-20">
          <div className="rounded-[20px] bg-white px-8 py-6 text-center text-gray-500 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="mb-3 inline-block h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            <div className="font-semibold">Loading profile...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <Navbar />

      <div className="mx-auto flex w-full max-w-7xl flex-col">
        <header className="border-b border-[#e5e7eb] bg-white px-4 py-4 shadow-sm sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-gray-200 bg-white p-3 text-gray-700 shadow-sm transition hover:bg-gray-50 md:hidden"
              aria-label="Open profile settings"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goBack}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-800"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-[24px] font-extrabold text-gray-900 sm:text-[28px]">My Profile</h1>
              <p className="text-sm font-medium text-gray-500">Manage your personal information and account security.</p>
            </div>
          </div>
        </header>

        <div className="flex w-full flex-1 flex-col md:min-h-[calc(100vh-160px)] md:flex-row">
          {isSidebarOpen && (
            <button
              type="button"
              aria-label="Close sidebar overlay"
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
            />
          )}

          <aside
            className={`fixed left-0 z-50 flex h-screen w-[280px] flex-col bg-white transition-transform duration-150 md:static md:z-auto md:h-auto md:min-h-full md:w-[240px] md:translate-x-0 ${
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
              <div className="px-4 pb-2 pt-2 text-[13px] font-bold uppercase tracking-[0.08em] text-[#6b7280]">
                Settings
              </div>
              <nav className="space-y-1.5 px-1 pb-6">
                {sidebarItems.map(item => {
                  const Icon = item.icon
                  const isActive = activeView === item.key
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleViewSelect(item.key)}
                      className={`mx-3 flex min-h-[60px] w-[calc(100%-24px)] items-center gap-3 rounded-[16px] border-2 px-5 py-4 text-left text-[16px] font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-150 hover:scale-[1.01] hover:bg-[#f8fafc] hover:border-[#d1d5db] ${
                        isActive ? 'bg-[#eff6ff] border-[#2563eb] text-[#1d4ed8]' : 'bg-white border-[#e5e7eb] text-[#1f2937]'
                      }`}
                    >
                      <Icon className={`h-6 w-6 shrink-0 ${isActive ? 'text-[#1d4ed8]' : 'text-[#374151]'}`} />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </aside>

          <main className="flex-1 bg-[#f9fafb] px-4 py-6 sm:px-6 md:p-6">
            {activeView === 'profile' ? (
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
                <section
                  className="rounded-[20px] bg-white px-6 py-8 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div className="relative flex h-[120px] w-[120px] items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#60a5fa] via-[#3b82f6] to-[#1d4ed8]">
                        {form.avatar_url ? (
                          <img src={form.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-4xl font-bold text-white">{initials}</span>
                        )}
                        {avatarUploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                            <div className="h-9 w-9 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={avatarUploading}
                        className="absolute bottom-0 right-0 inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transition hover:from-blue-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Upload avatar"
                      >
                        <Camera className="h-5 w-5" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                    </div>
                    <p className="mt-4 text-sm font-medium text-gray-500">Click the camera icon to change your profile photo.</p>
                  </div>
                </section>

                <section className="rounded-[20px] bg-white p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <FieldLabel>Full Name</FieldLabel>
                      <TextInput
                        type="text"
                        value={form.full_name}
                        onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <FieldLabel>Username</FieldLabel>
                      <TextInput
                        type="text"
                        value={form.username}
                        onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                        placeholder="Choose a username"
                      />
                    </div>

                    <div>
                      <FieldLabel>Email</FieldLabel>
                      <TextInput
                        type="email"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="Enter your email"
                      />
                    </div>

                    <div>
                      <FieldLabel>Phone Number</FieldLabel>
                      <TextInput
                        type="tel"
                        value={form.phone_number}
                        onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
                        placeholder="Enter your phone number"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <FieldLabel>Bio</FieldLabel>
                      <textarea
                        value={form.bio}
                        onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                        placeholder="Tell us about yourself..."
                        rows={4}
                        className="w-full rounded-[10px] border-[1.5px] border-[#e5e7eb] bg-white px-4 py-3 text-[15px] text-gray-700 outline-none transition-all duration-150 placeholder:text-gray-400 focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <FieldLabel>{isTeacher ? 'Role' : 'Class Level'}</FieldLabel>
                      {isTeacher ? (
                        <span className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700">
                          Teacher
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                          {classLevel || 'Student'}
                        </span>
                      )}
                    </div>
                  </div>

                  {profileMsg.text && (
                    <div className={`mt-6 rounded-[12px] px-4 py-3 text-sm font-semibold ${
                      profileMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                    }`}>
                      {profileMsg.text}
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={handleProfileSave}
                      disabled={profileSaving}
                      className="w-full rounded-[12px] bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-3.5 text-base font-bold text-white transition hover:from-blue-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[190px]"
                    >
                      {profileSaving ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </section>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-3xl">
                <section className="rounded-[20px] bg-white p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                  <div className="mb-6">
                    <h2 className="text-[20px] font-bold text-gray-900">Change Password</h2>
                    <p className="mt-2 text-sm text-gray-500">Choose a strong password to keep your account secure</p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <FieldLabel>Current Password</FieldLabel>
                      <PasswordInput
                        value={pwForm.current_password}
                        onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))}
                        placeholder="Enter your current password"
                        visible={showCurrentPw}
                        onToggle={() => setShowCurrentPw(v => !v)}
                      />
                    </div>

                    <div>
                      <FieldLabel>New Password</FieldLabel>
                      <PasswordInput
                        value={pwForm.new_password}
                        onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
                        placeholder="Enter your new password"
                        visible={showNewPw}
                        onToggle={() => setShowNewPw(v => !v)}
                      />
                      <div className="mt-3">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full transition-all duration-200 ${passwordStrength.color}`}
                            style={{ width: passwordStrength.width }}
                          />
                        </div>
                        <div className={`mt-2 text-sm font-semibold ${passwordStrength.textColor || 'text-gray-400'}`}>
                          {passwordStrength.label || 'Enter a new password'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <FieldLabel>Confirm New Password</FieldLabel>
                      <PasswordInput
                        value={pwForm.confirm_password}
                        onChange={e => setPwForm(f => ({ ...f, confirm_password: e.target.value }))}
                        placeholder="Confirm your new password"
                        visible={showConfirmPw}
                        onToggle={() => setShowConfirmPw(v => !v)}
                      />
                    </div>
                  </div>

                  {pwMsg.text && (
                    <div className={`mt-6 rounded-[12px] px-4 py-3 text-sm font-semibold ${
                      pwMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                    }`}>
                      {pwMsg.text}
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={handlePasswordChange}
                      disabled={pwSaving}
                      className="w-full rounded-[12px] bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-3.5 text-base font-bold text-white transition hover:from-blue-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[220px]"
                    >
                      {pwSaving ? 'Changing...' : 'Change Password'}
                    </button>
                  </div>
                </section>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default Profile
