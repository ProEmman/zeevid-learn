import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import Upload from './pages/teacher/Upload'
import QuestionBuilder from './pages/teacher/QuestionBuilder'
import StudentHome from './pages/student/StudentHome'
import Study from './pages/student/Study'
import Results from './pages/student/Results'
import Profile from './pages/Profile'

function ProtectedRoute({ children, requiredType }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/" replace />
  if (requiredType && user.user_type !== requiredType) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route path="/teacher/dashboard" element={
        <ProtectedRoute requiredType="teacher"><TeacherDashboard /></ProtectedRoute>
      } />
      <Route path="/teacher/upload" element={
        <ProtectedRoute requiredType="teacher"><Upload /></ProtectedRoute>
      } />
      <Route path="/teacher/builder" element={
        <ProtectedRoute requiredType="teacher"><QuestionBuilder /></ProtectedRoute>
      } />

      <Route path="/student/home" element={
        <ProtectedRoute requiredType="student"><StudentHome /></ProtectedRoute>
      } />
      <Route path="/student/study" element={
        <ProtectedRoute requiredType="student"><Study /></ProtectedRoute>
      } />
      <Route path="/student/results" element={
        <ProtectedRoute requiredType="student"><Results /></ProtectedRoute>
      } />

      <Route path="/profile" element={
        <ProtectedRoute><Profile /></ProtectedRoute>
      } />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
