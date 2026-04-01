import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, FileText, HelpCircle, Upload as UploadIcon } from 'lucide-react'
import Footer from '../../components/Footer'
import { supabase } from '../../lib/supabase'
import { API_URL, authHeaders } from '../../utils/api'

const CLASS_LEVELS = Array.from({ length: 10 }, (_, i) => `Level ${i + 1}`)

function parseUploadedQuestions(rawText, questionType) {
  const text = rawText.trim()
  if (!text) return []

  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => ({
          question: item.question || '',
          options: Array.isArray(item.options) ? item.options : [],
          answer: item.answer || '',
        }))
        .filter((item) => item.question && item.answer)
    }
  } catch {
    // Fall through to plain-text parsing.
  }

  const blocks = text.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean)

  return blocks
    .map((block) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
      const question = (lines.find((line) => !/^answer\s*:/i.test(line) && !/^correct answer\s*:/i.test(line) && !/^[A-D][.)]/i.test(line)) || '')
        .replace(/^\d+[.)]\s*/, '')
        .trim()
      const answerLine = lines.find((line) => /^answer\s*:/i.test(line) || /^correct answer\s*:/i.test(line)) || ''
      const answer = answerLine.replace(/^correct answer\s*:/i, '').replace(/^answer\s*:/i, '').trim()

      if (questionType === 'mcq') {
        return {
          question,
          options: lines.filter((line) => /^[A-D][.)]/i.test(line)),
          answer,
        }
      }

      return {
        question,
        options: [],
        answer,
      }
    })
    .filter((item) => item.question && item.answer && (questionType !== 'mcq' || item.options.length > 0))
}

function Upload() {
  const navigate = useNavigate()
  const [uploadType, setUploadType] = useState('notes')
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [fileReady, setFileReady] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [lectureName, setLectureName] = useState('')
  const [topic, setTopic] = useState('')
  const [classLevel, setClassLevel] = useState('')

  const [lessonNumber, setLessonNumber] = useState('')
  const [questionType, setQuestionType] = useState('mcq')

  const uploadDocumentFile = async (file) => {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'file'
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `teacher-documents/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || (
          extension === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ),
      })

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('documents').getPublicUrl(path)
    if (!data?.publicUrl) {
      throw new Error('Failed to get uploaded file URL')
    }

    return data.publicUrl
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    setSelectedFile(file)
    setIsProcessing(true)
    setFileReady(false)
    setError('')
    setSuccess('')

    try {
      const lowerName = file.name.toLowerCase()

      if (uploadType === 'notes' && (lowerName.endsWith('.pdf') || lowerName.endsWith('.docx'))) {
        setText('')
        setFileReady(true)
      } else if (lowerName.endsWith('.pdf')) {
        try {
          const arrayBuffer = await file.arrayBuffer()

          await new Promise((resolve, reject) => {
            if (window.pdfjsLib) {
              resolve()
              return
            }
            const script = document.createElement('script')
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
            script.onload = resolve
            script.onerror = reject
            document.head.appendChild(script)
          })

          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

          const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise

          let fullText = ''
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const textContent = await page.getTextContent()
            const pageText = textContent.items.map((item) => item.str).join(' ')
            fullText += 'Page ' + i + ':\n' + pageText + '\n\n'
          }

          if (fullText.trim()) {
            setText(fullText.trim())
            setFileReady(true)
          } else {
            alert('This PDF appears to be a scanned image. No text could be extracted. Please use a .docx or .txt file instead.')
          }
        } catch (err) {
          console.error('PDF error:', err)
          alert('Could not read this PDF. Please try a .docx or .txt file instead.')
        }
      } else if (lowerName.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer()
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ arrayBuffer })
        if (result.value.trim()) {
          setText(result.value.trim())
          setFileReady(true)
        } else {
          alert('Could not extract text from this DOCX file.')
        }
      } else if (lowerName.endsWith('.txt')) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          setText(ev.target.result)
          setFileReady(true)
        }
        reader.readAsText(file)
      } else {
        alert('Please upload a .pdf, .docx or .txt file only.')
      }
    } catch (err) {
      console.error('File read error:', err)
      alert('Could not read this file. Please try a .docx or .txt file.')
    }

    setIsProcessing(false)
  }

  const handleSubmit = async () => {
    setError('')
    setSuccess('')

    const isStoredFile =
      uploadType === 'notes' &&
      selectedFile &&
      (selectedFile.name.toLowerCase().endsWith('.pdf') || selectedFile.name.toLowerCase().endsWith('.docx'))

    if (!text.trim() && !isStoredFile) {
      alert('Please add some content first!')
      return
    }
    if (!classLevel) {
      alert('Please select a Class Level.')
      return
    }

    if (uploadType === 'questions') {
      if (!lectureName.trim() || !topic.trim() || !lessonNumber.trim()) {
        alert('Please fill in Lecture Name, Topic, and Lesson Number.')
        return
      }

      const parsedQuestions = parseUploadedQuestions(text, questionType)
      if (parsedQuestions.length === 0) {
        setError('Could not detect valid questions in the uploaded content. Include each question with an Answer line before saving.')
        return
      }

      setIsSaving(true)
      try {
        const res = await fetch(`${API_URL}/api/decks/save`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            lecture_name: lectureName.trim(),
            topic: topic.trim(),
            lesson_number: lessonNumber.trim(),
            class_level: classLevel,
            question_type: questionType,
            is_uploaded: true,
            questions: parsedQuestions,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to save')
        setSuccess('Questions uploaded successfully!')
        navigate('/teacher/dashboard')
      } catch (err) {
        setError(err.message)
      } finally {
        setIsSaving(false)
      }
      return
    }

    if (!lectureName.trim() || !topic.trim()) {
      alert('Please fill in Lecture Name and Topic.')
      return
    }

    setIsSaving(true)
    try {
      let documentUrl = null
      let documentContent = text

      if (isStoredFile) {
        documentUrl = await uploadDocumentFile(selectedFile)
        documentContent = null
      }

      const res = await fetch(`${API_URL}/api/documents/upload`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          lecture_name: lectureName.trim(),
          topic: topic.trim(),
          class_level: classLevel,
          document_name: fileName || 'Typed Notes',
          file_name: fileName || null,
          document_url: documentUrl,
          document_content: documentContent,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setSuccess('Content saved successfully!')
      navigate('/teacher/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-blue-600 text-white p-4 sm:p-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">ZeeVid Learn+</h1>
            <p className="text-blue-200 text-base sm:text-[22px] font-bold">Upload Content</p>
          </div>
          <button
            onClick={() => navigate('/teacher/dashboard')}
            className="bg-white text-blue-600 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-blue-50 transition min-h-[44px]"
          >
            Back
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full flex-1 p-4 sm:p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-red-600 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 text-green-700 text-sm">
            {success}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="text-[22px] font-bold text-gray-800 mb-4">What are you uploading?</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setUploadType('notes')}
              className={`flex-1 py-3 rounded-xl text-[16px] font-semibold border-b-4 transition-all duration-200 ease-in-out min-h-[48px] ${
                uploadType === 'notes'
                  ? 'bg-blue-600 text-white border-blue-700'
                  : 'bg-white text-gray-600 border-transparent hover:bg-gray-100'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <span>Notes</span>
              </span>
            </button>
            <button
              onClick={() => setUploadType('questions')}
              className={`flex-1 py-3 rounded-xl text-[16px] font-semibold border-b-4 transition-all duration-200 ease-in-out min-h-[48px] ${
                uploadType === 'questions'
                  ? 'bg-blue-600 text-white border-blue-700'
                  : 'bg-white text-gray-600 border-transparent hover:bg-gray-100'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                <span>Questions</span>
              </span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="text-[22px] font-bold text-gray-800 mb-4">
            {uploadType === 'notes' ? 'Label your notes' : 'Label your questions'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-semibold uppercase text-gray-600 mb-1">Lecture Name</label>
              <input
                type="text"
                value={lectureName}
                onChange={(e) => setLectureName(e.target.value)}
                placeholder="e.g. Introduction to Biology"
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-[16px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold uppercase text-gray-600 mb-1">Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Cell Structure"
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-[16px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold uppercase text-gray-600 mb-1">Class Level <span className="text-red-500">*</span></label>
              <select
                value={classLevel}
                onChange={(e) => setClassLevel(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-[16px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select class level...</option>
                {CLASS_LEVELS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            {uploadType === 'questions' && (
              <>
                <div>
                  <label className="block text-[13px] font-semibold uppercase text-gray-600 mb-1">Lesson Number</label>
                  <input
                    type="text"
                    value={lessonNumber}
                    onChange={(e) => setLessonNumber(e.target.value)}
                    placeholder="e.g. Lesson 1"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 text-[16px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold uppercase text-gray-600 mb-1">Question Type</label>
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 text-[16px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="mcq">Multiple Choice</option>
                    <option value="short">Short Answer</option>
                    <option value="fill">Fill in Blank</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="text-[22px] font-bold text-gray-800 mb-4">
            {uploadType === 'notes' ? 'Upload or paste your notes' : 'Upload or paste your questions'}
          </h2>

          <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 text-center mb-4 cursor-pointer hover:border-blue-500 transition">
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileUpload}
              className="hidden"
              id="fileInput"
            />
            <label htmlFor="fileInput" className="cursor-pointer">
              <div className="flex justify-center mb-2">
                <UploadIcon className="w-10 h-10 text-blue-600" />
              </div>
              <p className="text-blue-600 font-semibold">Click to upload a file</p>
              <p className="text-gray-400 text-sm mt-1">Supports .pdf, .docx, .txt</p>
              {fileName && (
                <p className="text-green-600 font-semibold mt-2 inline-flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>{fileName}</span>
                </p>
              )}
            </label>
          </div>

          {isProcessing && (
            <div className="text-center py-3 text-blue-600 text-sm font-semibold animate-pulse">
              Reading file please wait...
            </div>
          )}

          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 h-px bg-gray-200"></div>
            <p className="text-gray-400 text-sm">or type directly</p>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={uploadType === 'notes' ? 'Paste your notes here...' : 'Paste your questions here...'}
            className="w-full h-48 border border-gray-200 rounded-xl p-4 text-[16px] font-medium text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          {fileReady && (
            <div className="flex items-center gap-2 mt-2 text-green-600 text-sm font-semibold">
              <CheckCircle className="w-4 h-4" />
              <span>File content extracted successfully and ready to upload</span>
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-[16px] font-bold py-4 rounded-xl transition"
        >
          {isSaving ? 'Saving...' : 'Upload & Save'}
        </button>
      </div>

      <Footer />
    </div>
  )
}

export default Upload
