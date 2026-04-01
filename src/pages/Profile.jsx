import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, Eye, EyeOff } from 'lucide-react'
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

export default function Profile() {
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
      alert('Failed to upload photo: ' + err.message)
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

      setProfileMsg({ type: 'success', text: 'Profile saved successfully!' })

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
      if (!res.ok) throw new Error(data.error || 'Failed to change password')

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

  const goBack = () => navigate(isTeacher ? '/teacher/dashboard' : '/student/home')

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9fafb]">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-gray-500 font-semibold animate-pulse">Loading profile...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={goBack}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shadow border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-extrabold text-gray-800">My Profile</h1>
        </div>

        {/* Profile Picture */}
        <div className="bg-white rounded-2xl shadow p-6 mb-5">
          <div className="flex flex-col items-center">
            <div className="relative mb-3">
              <div className="w-[120px] h-[120px] rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 relative">
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-4xl font-bold">{initials}</span>
                )}
                {avatarUploading && (
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute bottom-0 right-0 w-9 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transition disabled:opacity-60"
                title="Change photo"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <p className="text-gray-400 text-sm">Click the camera icon to change your photo</p>
          </div>
        </div>

        {/* Profile Info */}
        <div className="bg-white rounded-2xl shadow p-6 mb-5">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Profile Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Full Name</label>
              <input
                type="text"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Email <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Phone Number <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="tel"
                value={form.phone_number}
                onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Bio</label>
              <textarea
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Tell us about yourself..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
            </div>

            {!isTeacher && classLevel && (
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Class Level</label>
                <span className="inline-block bg-green-100 text-green-700 font-bold px-3 py-1.5 rounded-lg text-sm">
                  {classLevel}
                </span>
              </div>
            )}
          </div>

          {profileMsg.text && (
            <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
              profileMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            }`}>
              {profileMsg.text}
            </div>
          )}

          <button
            onClick={handleProfileSave}
            disabled={profileSaving}
            className="mt-5 w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 rounded-xl transition disabled:opacity-60"
          >
            {profileSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Change Password</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  value={pwForm.current_password}
                  onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={pwForm.new_password}
                  onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={pwForm.confirm_password}
                  onChange={e => setPwForm(f => ({ ...f, confirm_password: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {pwMsg.text && (
            <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
              pwMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            }`}>
              {pwMsg.text}
            </div>
          )}

          <button
            onClick={handlePasswordChange}
            disabled={pwSaving}
            className="mt-5 w-full bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white font-bold py-3 rounded-xl transition disabled:opacity-60"
          >
            {pwSaving ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>
    </div>
  )
}
