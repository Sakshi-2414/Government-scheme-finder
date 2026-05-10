import React, { useEffect, useRef, useState } from 'react'
import { useChat }  from '../hooks/useChat.js'
import { useVoice } from '../hooks/useVoice.js'
import { deleteSession, getAllSessions } from '../utils/storage.js'
import { relTime }  from '../utils/format.js'
import ChatBubble      from '../components/ChatBubble.jsx'
import TypingIndicator from '../components/TypingIndicator.jsx'
import AnalyticsPanel  from '../components/AnalyticsPanel.jsx'
import s from './ChatApp.module.css'

const QUICK = [
  { label: '👩 EXAMPLE 1', sub: '22yr · OBC · Female · Gujarat · ₹1.5L', text: 'I am a 22 year old OBC female from Gujarat with income 1.5 lakh' },
  { label: '👴 EXAMPLE 2', sub: '65yr · SC · Male · Bihar · ₹60K',        text: '65 year old man from Bihar, SC category, income around 60 thousand' },
  { label: '📚 EXAMPLE 3', sub: '19yr · ST · Student · Rajasthan · ₹80K', text: 'I am 19 years old student from Rajasthan, ST category, family income 80000' },
  { label: '💼 EXAMPLE 4', sub: '28yr · General · Male · Maharashtra · ₹2.5L', text: '28 year old male from Maharashtra, General category, income 2.5 lakh' },
]

export default function ChatApp({ onHome }) {
  const {
    messages, isLoading, sessions,
    sendMessage, init, reset, loadSession,
  } = useChat()

  const [sidebarOpen,   setSidebarOpen]   = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [inputText,     setInputText]     = useState('')
  const [chatTitle,     setChatTitle]     = useState('New Conversation')
  const [voiceError,    setVoiceError]    = useState('')
  const [localSessions, setLocalSessions] = useState(() => getAllSessions())

  const textareaRef = useRef(null)
  const bottomRef   = useRef(null)

  /* Voice */
  const { isListening, isSupported, transcript, start: startVoice, stop: stopVoice } = useVoice({
    onResult: (txt) => { setInputText(txt) },
    onError:  (msg) => { setVoiceError(msg); setTimeout(() => setVoiceError(''), 4000) },
  })

  /* Boot */
  useEffect(() => { init() }, [])

  /* Auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  /* Auto-resize textarea */
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [inputText])

  /* Interim voice transcript */
  useEffect(() => {
    if (transcript && isListening) setInputText(transcript)
  }, [transcript, isListening])

  /* Refresh sidebar sessions */
  useEffect(() => {
    setLocalSessions(getAllSessions())
  }, [messages])

  const handleSend = () => {
    const t = inputText.trim()
    if (!t || isLoading) return
    setInputText('')
    if (chatTitle === 'New Conversation') setChatTitle(t.slice(0, 46) + (t.length > 46 ? '…' : ''))
    sendMessage(t)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const sendQuick = (text) => {
    setChatTitle(text.slice(0, 46))
    sendMessage(text)
  }

  const handleNewChat = () => {
    reset()
    setChatTitle('New Conversation')
    setSidebarOpen(false)
    setLocalSessions(getAllSessions())
  }

  const handleLoadSession = (id) => {
    loadSession(id)
    const sess = getAllSessions().find(s => s.id === id)
    if (sess) setChatTitle(sess.title || 'Chat')
    setSidebarOpen(false)
  }

  const handleDeleteSession = (e, id) => {
    e.stopPropagation()
    deleteSession(id)
    setLocalSessions(getAllSessions())
  }

  const showWelcome = messages.length === 0

  return (
    <div className={s.app}>

      {/* ── SIDEBAR ─────────────────────────────────────────────── */}
      <aside className={`${s.sidebar} ${sidebarOpen ? s.open : ''}`}>
        <div className={s.sbHead}>
          {/* Logo + home link */}
          <div className={s.logo}>
            <div className={s.logoIco}>🇮🇳</div>
            <div className={s.logoText}>
              <h1>SchemeBot</h1>
              <span>AI Scheme Finder v2</span>
            </div>
          </div>
          {/* Home button */}
          <button className={s.homeBtn} onClick={onHome} title="Back to Home">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Home
          </button>
          {/* New chat */}
          <button className={s.btnNew} onClick={handleNewChat}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Conversation
          </button>
        </div>

        {/* Session list */}
        <div className={s.sbLabel}>Recent Chats</div>
        <div className={s.sessionList}>
          {localSessions.length === 0 ? (
            <div className={s.noSessions}>No past chats yet. Start a conversation!</div>
          ) : (
            localSessions.map(sess => (
              <div
                key={sess.id}
                className={`${s.sItem} ${sess.id === (messages[0]?.sessionId) ? s.sItemActive : ''}`}
                onClick={() => handleLoadSession(sess.id)}
              >
                <div className={s.sIco}>💬</div>
                <div className={s.sInfo}>
                  <div className={s.sTitle}>{sess.title || 'Untitled'}</div>
                  <div className={s.sMeta}>
                    {sess.scheme_count || 0} scheme{(sess.scheme_count || 0) !== 1 ? 's' : ''} · {relTime(sess.updated_at)}
                  </div>
                </div>
                <button
                  className={s.sDel}
                  onClick={(e) => handleDeleteSession(e, sess.id)}
                  title="Delete"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Bottom links */}
        <div className={s.sbBottom}>
          <button className={`${s.sbBtn} ${s.sbBtnAnal}`} onClick={() => setAnalyticsOpen(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            Analytics Dashboard
          </button>
          <button className={s.sbBtn} onClick={() => window.open('/api/get-schemes', '_blank')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            All Schemes (JSON)
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {sidebarOpen && <div className={s.backdrop} onClick={() => setSidebarOpen(false)} />}

      {/* ── MAIN ────────────────────────────────────────────────── */}
      <main className={s.main}>
        <div className={s.gridBg} />

        {/* Header */}
        <header className={s.hdr}>
          <button className={s.sbToggle} onClick={() => setSidebarOpen(v => !v)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className={s.hdrTitle}>{chatTitle}</span>
          <div className={s.hdrRight}>
            <button className={s.hdrHomeBtn} onClick={onHome}>← Home</button>
            <span className={s.pillLive}>
              <span className={s.pillDot} />AI Live
            </span>
          </div>
        </header>

        {/* Messages */}
        <div className={s.msgsArea}>
          <div className={s.msgsInner}>

            {/* Welcome screen */}
            {showWelcome && (
              <div className={s.welcome}>
                <div className={s.wIcon}>🏛️</div>
                <h2 className={s.wTitle}>Find Your Government Benefits</h2>
                <p className={s.wSub}>
                  Tell me your age, income, state, and social category — by text or voice.
                  I'll ask for any missing details before showing you eligible schemes.
                </p>
                <div className={s.qGrid}>
                  {QUICK.map(q => (
                    <button key={q.label} className={s.qBtn} onClick={() => sendQuick(q.text)}>
                      <span className={s.qLbl}>{q.label}</span>
                      <span className={s.qSub}>{q.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => <ChatBubble key={msg.id} message={msg} />)}
            {isLoading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* ── INPUT AREA ──────────────────────────────────────── */}
        <div className={s.inpArea}>
          <div className={s.inpWrap}>

            {/* Voice status bar */}
            {(isListening || voiceError) && (
              <div className={`${s.voiceBar} ${voiceError ? s.voiceErr : ''}`}>
                <span className={s.vbDot} />
                {!voiceError && (
                  <div className={s.vbWaves}>
                    <span /><span /><span /><span />
                  </div>
                )}
                <span>{voiceError || 'Listening… speak now'}</span>
                {!voiceError && <span className={s.vbHint}>Click 🎤 to stop</span>}
              </div>
            )}

            <div className={s.inpBox}>
              <textarea
                ref={textareaRef}
                className={s.textarea}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKey}
                placeholder={
                  isListening
                    ? '🎤 Listening…'
                    : 'Type your age, income, state, category… or click 🎤 to speak'
                }
                rows={1}
                disabled={isLoading}
              />
              <div className={s.inpBtns}>
                {isSupported ? (
                  <button
                    className={`${s.micBtn} ${isListening ? s.micOn : ''}`}
                    onClick={isListening ? stopVoice : startVoice}
                    title={isListening ? 'Stop' : 'Speak'}
                  >
                    {isListening ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="4" y="4" width="16" height="16" rx="2"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                        <line x1="12" y1="19" x2="12" y2="23"/>
                        <line x1="8" y1="23" x2="16" y2="23"/>
                      </svg>
                    )}
                  </button>
                ) : (
                  <span className={s.micNA} title="Voice not supported in this browser">🎤</span>
                )}

                <button
                  className={s.sendBtn}
                  onClick={handleSend}
                  disabled={!inputText.trim() || isLoading}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className={s.hint}>
              <span>Enter</span> send · <span>Shift+Enter</span> new line · <span>🎤</span> voice (Chrome/Edge)
            </div>
          </div>
        </div>
      </main>

      {/* Analytics overlay */}
      {analyticsOpen && <AnalyticsPanel onClose={() => setAnalyticsOpen(false)} />}
    </div>
  )
}
