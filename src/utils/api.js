export const API_URL = 'http://localhost:5000'

export function authHeaders() {
  const token = localStorage.getItem('zeevid_token')
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
}
