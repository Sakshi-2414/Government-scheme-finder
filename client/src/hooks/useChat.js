import { useState, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { api } from '../utils/api.js'
import { saveSession, getAllSessions } from '../utils/storage.js'

function newId() { return uuidv4() }

export function useChat() {
  const [messages,  setMessages]  = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const sessionId   = useRef(newId())
  const metaRef     = useRef({ title: 'New Conversation', schemeCount: 0 })

  /* ── helpers ───────────────────────────────────────────────── */
  const addMsg = useCallback((role, text, extra = {}) => {
    const msg = { id: uuidv4(), role, text, ts: Date.now(), ...extra }
    setMessages(prev => {
      const next = [...prev, msg]
      // persist every message to localStorage
      saveSession({
        id:           sessionId.current,
        title:        metaRef.current.title,
        scheme_count: metaRef.current.schemeCount,
        updated_at:   new Date().toISOString(),
        messages:     next,
      })
      return next
    })
  }, [])

  /* ── init ──────────────────────────────────────────────────── */
  const init = useCallback(async () => {
    setIsLoading(true)
    try {
      const d = await api.greeting()
      addMsg('bot', d.message, { type: 'greeting' })
    } catch {
      addMsg('bot',
        '🙏 Namaste! Welcome to SchemeBot.\n\n' +
        '⚠️ Backend not reachable. Please start the Python server:\n\n' +
        '`cd server && python app.py`\n\nThen refresh this page.')
    } finally {
      setIsLoading(false)
    }
  }, [addMsg])

  /* ── send ──────────────────────────────────────────────────── */
  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isLoading) return
    // Update title from first user message
    if (metaRef.current.title === 'New Conversation') {
      metaRef.current.title = text.slice(0, 50) + (text.length > 50 ? '…' : '')
    }
    addMsg('user', text)
    setIsLoading(true)
    try {
      const d = await api.processInput(text, sessionId.current)
      const count = (d.schemes || []).length
      if (count > 0) metaRef.current.schemeCount = count
      addMsg('bot', d.message, {
        type:     d.type,
        schemes:  d.schemes       || [],
        entities: d.entities      || {},
        missing:  d.missing_fields || [],
      })
    } catch (err) {
      addMsg('bot',
        err.message.includes('fetch')
          ? '⚠️ Cannot connect to backend.\n\nRun: `cd server && python app.py`'
          : `Error: ${err.message}`,
        { type: 'error' }
      )
    } finally {
      setIsLoading(false)
    }
  }, [addMsg, isLoading])

  /* ── load past session ─────────────────────────────────────── */
  const loadSession = useCallback((id) => {
    const all = getAllSessions()
    const sess = all.find(s => s.id === id)
    if (!sess) return
    sessionId.current       = id
    metaRef.current.title   = sess.title || 'Chat'
    metaRef.current.schemeCount = sess.scheme_count || 0
    setMessages(sess.messages || [])
  }, [])

  /* ── reset ─────────────────────────────────────────────────── */
  const reset = useCallback(async () => {
    try { await api.resetSession(sessionId.current) } catch { /* ignore */ }
    sessionId.current = newId()
    metaRef.current = { title: 'New Conversation', schemeCount: 0 }
    setMessages([])
    setTimeout(() => init(), 80)
  }, [init])

  return {
    messages, isLoading,
    sendMessage, init, reset, loadSession,
    sessionId: sessionId.current,
  }
}
