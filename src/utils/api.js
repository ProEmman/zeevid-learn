export const API_URL = import.meta.env.VITE_API_URL || 'https://zeevid-learn-production.up.railway.app'

export function authHeaders() {
  const token = localStorage.getItem('zeevid_token')
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
}
