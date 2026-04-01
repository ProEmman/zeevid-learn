import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createRequire } from 'module'
import { randomUUID } from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const require = createRequire(import.meta.url)
const dotenv = require('dotenv')
dotenv.config({ path: join(__dirname, '.env') })

import express from 'express'
import cors from 'cors'
import axios from 'axios'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { createSupabaseClient } from './supabase.js'

const supabase = createSupabaseClient()

const app = express()
app.use(cors())
app.use(express.json())

function getDocumentStoragePath(documentUrl) {
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

// ─── AI Question Generation ───────────────────────────────────────────────────

app.post('/generate', async (req, res) => {
  const { notes, type, count } = req.body
  console.log("Request received")
  console.log("Notes length:", notes?.length)
  console.log("Type:", type)
  console.log("Count:", count)

  if (!notes || notes.trim() === '') {
    return res.status(400).json({ error: 'No notes provided' })
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert teacher. You ONLY generate questions based strictly on the notes provided by the user. Do not use any outside knowledge. Every question must come directly from the content in the notes.`
          },
          {
            role: 'user',
            content: `Using ONLY the notes below, generate exactly ${count} ${
              type === 'mcq'
                ? 'multiple choice questions. Each question must have exactly 4 options labeled A, B, C, D. Clearly mark the correct answer.'
                : type === 'short'
                ? 'short answer questions. Each question must have a clear model answer based only on the notes.'
                : 'fill in the blank questions. Each question must have the missing word as the answer.'
            }
Return ONLY a valid JSON array. No extra text, no markdown, no explanation.
Format:
[
  {
    "question": "Question text here?",
    "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
    "answer": "A. option1"
  }
]
For short answer and fill in the blank, set options to an empty array [].
NOTES TO USE:
${notes}`
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ZeeVid_Learn_API_KEY}`
        }
      }
    )

    const text = response.data.choices?.[0]?.message?.content || ""
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    res.json(parsed)

  } catch (err) {
    console.error("ERROR:", err.response?.data || err.message)
    res.status(500).json({ error: 'Failed to generate questions' })
  }
})

// ─── Auth: Register ───────────────────────────────────────────────────────────

app.post('/auth/register', async (req, res) => {
  const { full_name, username, email, phone_number, password, user_type, student_id, class_level } = req.body

  if (!full_name || !username || !password || !user_type) {
    return res.status(400).json({ error: 'full_name, username, password, and user_type are required' })
  }
  if (!email && !phone_number) {
    return res.status(400).json({ error: 'Email or phone number is required' })
  }
  if (!['teacher', 'student'].includes(user_type)) {
    return res.status(400).json({ error: 'user_type must be teacher or student' })
  }
  if (user_type === 'student' && (!student_id || !class_level)) {
    return res.status(400).json({ error: 'student_id and class_level are required for students' })
  }

  try {
    if (email) {
      const { data: existing } = await supabase.from('users').select('user_id').eq('email', email).maybeSingle()
      if (existing) return res.status(409).json({ error: 'Email already registered' })
    }
    if (phone_number) {
      const { data: existing } = await supabase.from('users').select('user_id').eq('phone_number', phone_number).maybeSingle()
      if (existing) return res.status(409).json({ error: 'Phone number already registered' })
    }
    const { data: existingUsername } = await supabase.from('users').select('user_id').eq('username', username).maybeSingle()
    if (existingUsername) return res.status(409).json({ error: 'Username already taken' })

    const password_hash = await bcrypt.hash(password, 12)

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        full_name,
        username,
        email: email || null,
        phone_number: phone_number || null,
        password_hash,
        user_type
      })
      .select()
      .single()

    if (userError) throw userError

    if (user_type === 'teacher') {
      await supabase.from('teachers').insert({ user_id: user.user_id, assigned_classes: [] })
    } else {
      await supabase.from('students').insert({
        user_id: user.user_id,
        student_id,
        class_level,
        class_group: null
      })
    }

    res.status(201).json({ message: 'Account created successfully' })
  } catch (err) {
    console.error('Register error:', err.message)
    res.status(500).json({ error: 'Registration failed: ' + err.message })
  }
})

// ─── Auth: Login ──────────────────────────────────────────────────────────────

app.post('/auth/login', async (req, res) => {
  const { identifier, password } = req.body

  console.log('=== LOGIN ATTEMPT ===')
  console.log('1. Received body:', { identifier, password: password ? `[${password.length} chars]` : undefined })

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email/phone and password are required' })
  }

  try {
    // Try email, phone_number, and username — whichever matches first
    let user = null
    const columns = identifier.includes('@')
      ? ['email', 'username']
      : ['phone_number', 'username', 'email']

    console.log('2. Will query columns in order:', columns)

    for (const col of columns) {
      console.log(`3. Querying users where ${col} = "${identifier}"`)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq(col, identifier)
        .maybeSingle()
      console.log(`   Result: data=${JSON.stringify(data ? { user_id: data.user_id, username: data.username, email: data.email, phone_number: data.phone_number, has_password_hash: !!data.password_hash } : null)}, error=${error?.message}`)
      if (data) { user = data; break }
    }

    console.log('4. User found:', user ? `yes (user_id=${user.user_id}, username=${user.username})` : 'NO - returning 401')

    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    console.log('5. password_hash from DB:', user.password_hash ? `"${user.password_hash.substring(0, 20)}..."` : 'NULL or MISSING')
    const valid = await bcrypt.compare(password, user.password_hash)
    console.log('6. bcrypt.compare result:', valid)

    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const tokenPayload = {
      user_id: user.user_id,
      user_type: user.user_type,
      username: user.username,
    }
    console.log('7. JWT payload:', tokenPayload)
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'zeevid_jwt_secret',
      { expiresIn: '7d' }
    )

    const { password_hash, ...safeUser } = user
    const responseUser = { ...safeUser }

    if (user.user_type === 'student') {
      const { data: studentProfile } = await supabase
        .from('students')
        .select('student_id, class_level, class_group')
        .eq('user_id', user.user_id)
        .maybeSingle()

      if (studentProfile) {
        responseUser.student_id = studentProfile.student_id
        responseUser.class_level = studentProfile.class_level
        responseUser.class_group = studentProfile.class_group
      }
    }

    res.json({ user: responseUser, token })
  } catch (err) {
    console.error('Login error:', err.message)
    res.status(500).json({ error: 'Login failed' })
  }
})

// ─── Auth: Forgot Password ────────────────────────────────────────────────────

app.post('/auth/forgot-password', async (req, res) => {
  const { identifier } = req.body

  if (!identifier) {
    return res.status(400).json({ error: 'Email or phone number is required' })
  }

  try {
    const isEmail = identifier.includes('@')
    const { data: user } = await supabase
      .from('users')
      .select('user_id')
      .eq(isEmail ? 'email' : 'phone_number', identifier)
      .maybeSingle()

    // Always return success to prevent account enumeration
    if (!user) {
      return res.json({ message: 'If that account exists, a reset link has been sent.' })
    }

    const token = randomUUID()
    const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    await supabase.from('reset_tokens').insert({
      user_id: user.user_id,
      token,
      expires_at,
      used: false
    })

    // In production, send token via email/SMS. For now, log it.
    console.log(`Password reset token for ${identifier}: ${token}`)

    res.json({ message: 'If that account exists, a reset link has been sent.', debug_token: token })
  } catch (err) {
    console.error('Forgot password error:', err.message)
    res.status(500).json({ error: 'Failed to process request' })
  }
})

// ─── Auth: Reset Password ─────────────────────────────────────────────────────

app.post('/auth/reset-password', async (req, res) => {
  const { token, new_password } = req.body

  if (!token || !new_password) {
    return res.status(400).json({ error: 'Token and new password are required' })
  }

  try {
    const { data: resetToken, error } = await supabase
      .from('reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (error || !resetToken) {
      return res.status(400).json({ error: 'Invalid or expired reset token' })
    }

    const password_hash = await bcrypt.hash(new_password, 12)
    await supabase.from('users').update({ password_hash }).eq('user_id', resetToken.user_id)
    await supabase.from('reset_tokens').update({ used: true }).eq('token_id', resetToken.token_id)

    res.json({ message: 'Password reset successfully' })
  } catch (err) {
    console.error('Reset password error:', err.message)
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

// ─── Auth Middleware ──────────────────────────────────────────────────────────

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  console.log('[auth] header:', authHeader ? `Bearer ${token?.substring(0, 20)}...` : 'MISSING')
  if (!token) return res.status(401).json({ error: 'Access token required' })
  try {
    const decodedUser = jwt.verify(token, process.env.JWT_SECRET || 'zeevid_jwt_secret')

    if (!decodedUser.user_type && decodedUser.user_id) {
      console.warn('[auth] token missing user_type; looking up user record for compatibility')
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('user_id, user_type, username')
        .eq('user_id', decodedUser.user_id)
        .maybeSingle()

      if (error) throw error
      if (dbUser) {
        decodedUser.user_type = dbUser.user_type
        decodedUser.username = decodedUser.username || dbUser.username
      }
    }

    req.user = decodedUser
    console.log('[auth] req.user:', req.user)
    next()
  } catch (err) {
    console.error('[auth] jwt.verify failed:', err.message)
    return res.status(401).json({ error: 'Invalid or expired token: ' + err.message })
  }
}

// ─── Documents ────────────────────────────────────────────────────────────────

app.post('/api/documents/upload', authenticateToken, async (req, res) => {
  console.log('[documents/upload] req.user:', req.user)
  if (req.user.user_type !== 'teacher') return res.status(403).json({ error: 'Teachers only' })
  const { lecture_name, topic, class_level, document_content, document_name, document_url, file_name } = req.body
  if (!class_level || (!document_content && !document_url)) {
    return res.status(400).json({ error: 'class_level and either document_content or document_url are required' })
  }

  try {
    const { data: teacher } = await supabase
      .from('teachers').select('teacher_id').eq('user_id', req.user.user_id).single()
    if (!teacher) return res.status(404).json({ error: 'Teacher record not found' })

    const { data, error } = await supabase.from('documents').insert({
      teacher_id: teacher.teacher_id,
      class_level,
      document_name: document_name || file_name || 'Untitled',
      file_name: file_name || document_name || null,
      document_content: document_content || null,
      document_url: document_url || null,
      topic: topic || null,
      lecture_name: lecture_name || null,
    }).select().single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    console.error('Upload document error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/documents', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type === 'teacher') {
      const { data: teacher } = await supabase
        .from('teachers').select('teacher_id').eq('user_id', req.user.user_id).single()
      if (!teacher) return res.json([])
      const { data, error } = await supabase
        .from('documents').select('*').eq('teacher_id', teacher.teacher_id).order('created_at', { ascending: false })
      if (error) throw error
      return res.json(data || [])
    }

    // Student: filter by class_level
    const { data: student } = await supabase
      .from('students').select('class_level').eq('user_id', req.user.user_id).single()
    if (!student) return res.json([])
    const { data, error } = await supabase
      .from('documents').select('*').eq('class_level', student.class_level).order('created_at', { ascending: false })
    if (error) throw error
    res.json(data || [])
  } catch (err) {
    console.error('Get documents error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/documents/:document_id', authenticateToken, async (req, res) => {
  if (req.user.user_type !== 'teacher') return res.status(403).json({ error: 'Teachers only' })
  try {
    const { data: teacher } = await supabase
      .from('teachers').select('teacher_id').eq('user_id', req.user.user_id).single()

    if (!teacher) return res.status(404).json({ error: 'Teacher record not found' })

    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('document_id, document_url')
      .eq('document_id', req.params.document_id)
      .eq('teacher_id', teacher.teacher_id)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!document) return res.status(404).json({ error: 'Document not found' })

    let warning = null

    if (document.document_url) {
      const filePath = getDocumentStoragePath(document.document_url)

      if (filePath) {
        const { error: storageError } = await supabase.storage.from('documents').remove([filePath])
        if (storageError) {
          warning = 'Document record deleted, but the file could not be removed from storage.'
          console.warn('Delete document storage warning:', storageError.message)
        }
      } else {
        warning = 'Document record deleted, but the file URL could not be parsed for storage cleanup.'
        console.warn('Delete document storage warning: unable to parse storage path from URL')
      }
    }

    const { error } = await supabase.from('documents')
      .delete()
      .eq('document_id', req.params.document_id)
      .eq('teacher_id', teacher.teacher_id)

    if (error) throw error
    res.json(warning ? { message: 'Deleted', warning } : { message: 'Deleted' })
  } catch (err) {
    console.error('Delete document error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Decks ────────────────────────────────────────────────────────────────────

app.post('/api/decks/save', authenticateToken, async (req, res) => {
  if (req.user.user_type !== 'teacher') return res.status(403).json({ error: 'Teachers only' })
  const { lecture_name, topic, lesson_number, class_level, question_type, is_uploaded, questions } = req.body
  if (!class_level) return res.status(400).json({ error: 'class_level is required' })

  try {
    const { data: teacher } = await supabase
      .from('teachers').select('teacher_id').eq('user_id', req.user.user_id).single()
    if (!teacher) return res.status(404).json({ error: 'Teacher record not found' })

    const { data, error } = await supabase.from('decks').insert({
      teacher_id: teacher.teacher_id,
      lecture_name: lecture_name || null,
      topic: topic || null,
      lesson_number: lesson_number || null,
      class_level,
      question_type: question_type || 'mcq',
      is_uploaded: is_uploaded || false,
      questions: questions || [],
    }).select().single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    console.error('Save deck error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/decks', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type === 'teacher') {
      const { data: teacher } = await supabase
        .from('teachers').select('teacher_id').eq('user_id', req.user.user_id).single()
      if (!teacher) return res.json([])
      const { data, error } = await supabase
        .from('decks').select('*').eq('teacher_id', teacher.teacher_id).order('created_at', { ascending: false })
      if (error) throw error
      return res.json(data || [])
    }

    // Student: filter by class_level
    const { data: student } = await supabase
      .from('students').select('class_level').eq('user_id', req.user.user_id).single()
    if (!student) return res.json([])
    const { data, error } = await supabase
      .from('decks').select('*').eq('class_level', student.class_level).order('created_at', { ascending: false })
    if (error) throw error
    res.json(data || [])
  } catch (err) {
    console.error('Get decks error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/decks/:deck_id', authenticateToken, async (req, res) => {
  if (req.user.user_type !== 'teacher') return res.status(403).json({ error: 'Teachers only' })
  try {
    const { data: teacher } = await supabase
      .from('teachers').select('teacher_id').eq('user_id', req.user.user_id).single()

    const { error } = await supabase.from('decks')
      .delete()
      .eq('deck_id', req.params.deck_id)
      .eq('teacher_id', teacher.teacher_id)

    if (error) throw error
    res.json({ message: 'Deleted' })
  } catch (err) {
    console.error('Delete deck error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Results ──────────────────────────────────────────────────────────────────

app.post('/api/results/save', authenticateToken, async (req, res) => {
  if (req.user.user_type !== 'student') return res.status(403).json({ error: 'Students only' })
  const { deck_id, score, total, answers } = req.body
  if (score === undefined || !total) return res.status(400).json({ error: 'score and total are required' })

  try {
    const { data: student } = await supabase
      .from('students').select('student_id').eq('user_id', req.user.user_id).single()
    if (!student) return res.status(404).json({ error: 'Student record not found' })

    const { data, error } = await supabase.from('student_results').insert({
      student_id: student.student_id,
      deck_id: deck_id || null,
      score,
      total,
      answers: answers || [],
    }).select().single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    console.error('Save result error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/results', authenticateToken, async (req, res) => {
  if (req.user.user_type !== 'student') return res.status(403).json({ error: 'Students only' })
  try {
    const { data: student } = await supabase
      .from('students').select('student_id').eq('user_id', req.user.user_id).single()
    if (!student) return res.json([])

    const { data, error } = await supabase
      .from('student_results').select('*').eq('student_id', student.student_id).order('created_at', { ascending: false })
    if (error) throw error
    res.json(data || [])
  } catch (err) {
    console.error('Get results error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Profile ─────────────────────────────────────────────────────────────────

app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('user_id, full_name, username, email, phone_number, user_type, bio, avatar_url, created_at')
      .eq('user_id', req.user.user_id)
      .single()

    if (error || !user) return res.status(404).json({ error: 'User not found' })

    const profile = { ...user }

    if (user.user_type === 'student') {
      const { data: student } = await supabase
        .from('students')
        .select('student_id, class_level, class_group')
        .eq('user_id', req.user.user_id)
        .maybeSingle()
      if (student) {
        profile.student_id = student.student_id
        profile.class_level = student.class_level
        profile.class_group = student.class_group
      }
    } else if (user.user_type === 'teacher') {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('teacher_id, assigned_classes')
        .eq('user_id', req.user.user_id)
        .maybeSingle()
      if (teacher) {
        profile.teacher_id = teacher.teacher_id
        profile.assigned_classes = teacher.assigned_classes
      }
    }

    res.json(profile)
  } catch (err) {
    console.error('Get profile error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/profile', authenticateToken, async (req, res) => {
  const { full_name, username, email, phone_number, bio, avatar_url } = req.body

  try {
    const updateData = {}
    if (full_name !== undefined) updateData.full_name = full_name
    if (username !== undefined) updateData.username = username
    if (email !== undefined) updateData.email = email || null
    if (phone_number !== undefined) updateData.phone_number = phone_number || null
    if (bio !== undefined) updateData.bio = bio || null
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url || null

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('user_id', req.user.user_id)
      .select('user_id, full_name, username, email, phone_number, user_type, bio, avatar_url')
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    console.error('Update profile error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/profile/password', authenticateToken, async (req, res) => {
  const { current_password, new_password } = req.body

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password are required' })
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('password_hash')
      .eq('user_id', req.user.user_id)
      .single()

    if (error || !user) return res.status(404).json({ error: 'User not found' })

    const valid = await bcrypt.compare(current_password, user.password_hash)
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' })

    const password_hash = await bcrypt.hash(new_password, 12)
    await supabase.from('users').update({ password_hash }).eq('user_id', req.user.user_id)

    res.json({ message: 'Password changed successfully' })
  } catch (err) {
    console.error('Change password error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Messages ────────────────────────────────────────────────────────────────

app.post('/api/messages/send', authenticateToken, async (req, res) => {
  const { receiver_id, content } = req.body
  if (!receiver_id || !content || !content.trim()) {
    return res.status(400).json({ error: 'receiver_id and content are required' })
  }
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: req.user.user_id,
        receiver_id,
        content: content.trim(),
        is_read: false,
      })
      .select()
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    console.error('Send message error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/messages/unread-count', authenticateToken, async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', req.user.user_id)
      .eq('is_read', false)
    if (error) throw error
    res.json({ count: count || 0 })
  } catch (err) {
    res.json({ count: 0 })
  }
})

app.get('/api/messages/conversations', authenticateToken, async (req, res) => {
  if (req.user.user_type !== 'teacher') return res.status(403).json({ error: 'Teachers only' })
  try {
    const teacherId = req.user.user_id

    const [{ data: sent }, { data: received }] = await Promise.all([
      supabase.from('messages').select('*').eq('sender_id', teacherId).order('created_at', { ascending: false }),
      supabase.from('messages').select('*').eq('receiver_id', teacherId).order('created_at', { ascending: false }),
    ])

    const allMsgs = [...(sent || []), ...(received || [])]

    // Collect unique student IDs (the other party)
    const studentIdSet = new Set()
    for (const m of allMsgs) {
      const otherId = m.sender_id === teacherId ? m.receiver_id : m.sender_id
      studentIdSet.add(otherId)
    }

    if (studentIdSet.size === 0) return res.json([])

    const { data: studentUsers } = await supabase
      .from('users')
      .select('user_id, full_name, avatar_url, user_type')
      .in('user_id', [...studentIdSet])
      .eq('user_type', 'student')

    const { data: studentRecords } = await supabase
      .from('students')
      .select('user_id, class_level')
      .in('user_id', [...studentIdSet])

    const classLevelMap = {}
    for (const s of studentRecords || []) classLevelMap[s.user_id] = s.class_level

    const conversations = (studentUsers || []).map(student => {
      const thread = allMsgs
        .filter(m =>
          (m.sender_id === student.user_id && m.receiver_id === teacherId) ||
          (m.sender_id === teacherId && m.receiver_id === student.user_id)
        )
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      const last = thread[0]
      const unreadCount = thread.filter(m => m.sender_id === student.user_id && !m.is_read).length

      return {
        user_id: student.user_id,
        full_name: student.full_name,
        avatar_url: student.avatar_url,
        class_level: classLevelMap[student.user_id] || '',
        last_message: last?.content || '',
        last_message_time: last?.created_at || null,
        unread_count: unreadCount,
      }
    })

    conversations.sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time))
    res.json(conversations)
  } catch (err) {
    console.error('Get conversations error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/messages/conversation/:student_id', authenticateToken, async (req, res) => {
  if (req.user.user_type !== 'teacher') return res.status(403).json({ error: 'Teachers only' })
  try {
    const teacherId = req.user.user_id
    const studentId = req.params.student_id

    const [{ data: t2s }, { data: s2t }] = await Promise.all([
      supabase.from('messages').select('*').eq('sender_id', teacherId).eq('receiver_id', studentId),
      supabase.from('messages').select('*').eq('sender_id', studentId).eq('receiver_id', teacherId),
    ])

    const messages = [...(t2s || []), ...(s2t || [])].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    )

    // Mark student → teacher messages as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', studentId)
      .eq('receiver_id', teacherId)
      .eq('is_read', false)

    const [{ data: studentUser }, { data: studentRecord }] = await Promise.all([
      supabase.from('users').select('user_id, full_name, avatar_url').eq('user_id', studentId).single(),
      supabase.from('students').select('class_level').eq('user_id', studentId).maybeSingle(),
    ])

    res.json({
      student: { ...(studentUser || {}), class_level: studentRecord?.class_level || '' },
      messages,
    })
  } catch (err) {
    console.error('Get conversation error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/messages/my-messages', authenticateToken, async (req, res) => {
  if (req.user.user_type !== 'student') return res.status(403).json({ error: 'Students only' })
  try {
    const studentId = req.user.user_id

    const { data: studentRecord } = await supabase
      .from('students')
      .select('class_level')
      .eq('user_id', studentId)
      .maybeSingle()

    let teacherUserId = null

    if (studentRecord?.class_level) {
      // Find teacher whose assigned_classes contains this student's class_level
      const { data: allTeachers } = await supabase
        .from('teachers')
        .select('user_id, assigned_classes')

      const match = (allTeachers || []).find(t =>
        Array.isArray(t.assigned_classes) && t.assigned_classes.includes(studentRecord.class_level)
      )
      if (match) teacherUserId = match.user_id
    }

    if (!teacherUserId) {
      // Fallback: find from existing message history
      const [{ data: sent }, { data: received }] = await Promise.all([
        supabase.from('messages').select('receiver_id').eq('sender_id', studentId).limit(1),
        supabase.from('messages').select('sender_id').eq('receiver_id', studentId).limit(1),
      ])
      if (sent?.[0]) teacherUserId = sent[0].receiver_id
      else if (received?.[0]) teacherUserId = received[0].sender_id
    }

    if (!teacherUserId) return res.json({ teacher: null, messages: [] })

    const [{ data: teacherUser }, { data: t2s }, { data: s2t }] = await Promise.all([
      supabase.from('users').select('user_id, full_name, avatar_url').eq('user_id', teacherUserId).single(),
      supabase.from('messages').select('*').eq('sender_id', teacherUserId).eq('receiver_id', studentId),
      supabase.from('messages').select('*').eq('sender_id', studentId).eq('receiver_id', teacherUserId),
    ])

    const messages = [...(t2s || []), ...(s2t || [])].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    )

    // Mark teacher → student messages as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', teacherUserId)
      .eq('receiver_id', studentId)
      .eq('is_read', false)

    res.json({ teacher: teacherUser || null, messages })
  } catch (err) {
    console.error('Get my messages error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(5000, () => {
  console.log('Server running on http://localhost:5000')
})

async function testSupabase() {
  try {
    const { error } = await supabase.from('users').select('user_id').limit(1)
    if (error) {
      console.log('Supabase connection failed:', error.message)
    } else {
      console.log('Supabase connected successfully!')
    }
  } catch (err) {
    console.log('Supabase connection failed:', err.message)
  }
}

testSupabase()
