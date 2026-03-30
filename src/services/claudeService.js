export async function generateQuestions(notes, type = 'mcq', count = 5) {
  const response = await fetch('http://localhost:5000/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ notes, type, count })
  })

  return await response.json()
}