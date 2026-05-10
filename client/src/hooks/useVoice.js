import { useState, useRef, useCallback, useEffect } from 'react'

const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null

export function useVoice({ onResult, onError }) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported]                 = useState(() => !!SR)
  const [transcript, setTranscript]   = useState('')
  const recogRef                      = useRef(null)

  const stop = useCallback(() => {
    recogRef.current?.stop()
    recogRef.current = null
    setIsListening(false)
  }, [])

  const start = useCallback(() => {
    if (!SR) { onError?.('Voice not supported. Please use Chrome or Edge.'); return }
    if (isListening) { stop(); return }

    const r = new SR()
    r.lang            = 'en-IN'
    r.interimResults  = true
    r.maxAlternatives = 1
    r.continuous      = false

    r.onstart  = () => setIsListening(true)

    r.onresult = (e) => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else interim += t
      }
      setTranscript(final || interim)
      if (final) { onResult?.(final.trim()); setTranscript('') }
    }

    r.onerror = (e) => {
      const msgs = {
        'not-allowed': 'Microphone access denied. Please allow mic in browser settings.',
        'no-speech':   'No speech detected. Please try again.',
        'network':     'Network error during voice recognition.',
      }
      onError?.(msgs[e.error] || `Voice error: ${e.error}`)
      setIsListening(false)
    }

    r.onend = () => { setIsListening(false); recogRef.current = null }

    recogRef.current = r
    r.start()
  }, [isListening, onResult, onError, stop])

  useEffect(() => () => stop(), [stop])

  return { isListening, isSupported, transcript, start, stop }
}
