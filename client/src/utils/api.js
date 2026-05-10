const BASE = '/api'

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: 'Network error' }))
    throw new Error(e.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  greeting:     ()           => req('/greeting'),
  processInput: (text, sid)  => req('/process-input', { method:'POST', body: JSON.stringify({ text, sessionId: sid }) }),
  getAllSchemes: ()           => req('/get-schemes'),
  resetSession: (sid)        => req('/reset',         { method:'POST', body: JSON.stringify({ sessionId: sid }) }),
  analytics:    ()           => req('/analytics'),
  health:       ()           => req('/health'),
}
