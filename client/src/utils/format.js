export function mdLite(t) {
  return (t || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>')
}

export function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export function fmtIncome(val) {
  if (!val) return null
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`
  if (val >= 1000)   return `₹${(val / 1000).toFixed(0)}K`
  return `₹${val}`
}

export function relTime(iso) {
  if (!iso) return ''
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60)    return 'just now'
  if (d < 3600)  return Math.floor(d / 60) + 'm ago'
  if (d < 86400) return Math.floor(d / 3600) + 'h ago'
  return Math.floor(d / 86400) + 'd ago'
}

export function cap(s) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}
