/**
 * LocalStorage helpers for persisting chat sessions across page reloads.
 * This fixes the "no previous chats" issue — sessions now survive browser refresh.
 */

const SESSIONS_KEY = 'schemebot_sessions'
const MAX_SESSIONS = 20

export function getAllSessions() {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveSession(session) {
  try {
    const all = getAllSessions()
    const idx = all.findIndex(s => s.id === session.id)
    if (idx >= 0) {
      all[idx] = session
    } else {
      all.unshift(session) // newest first
    }
    // Keep only latest MAX_SESSIONS
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(all.slice(0, MAX_SESSIONS)))
  } catch { /* storage full – ignore */ }
}

export function deleteSession(id) {
  try {
    const all = getAllSessions().filter(s => s.id !== id)
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(all))
  } catch { }
}

export function getSession(id) {
  return getAllSessions().find(s => s.id === id) || null
}

export function clearAllSessions() {
  localStorage.removeItem(SESSIONS_KEY)
}
