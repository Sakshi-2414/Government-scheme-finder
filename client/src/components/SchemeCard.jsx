import React, { useState } from 'react'
import s from './SchemeCard.module.css'

function ScoreBadge({ score, confidence }) {
  if (score == null) return null
  const pct   = Math.round(score * 100)
  const color  = pct >= 75 ? '#10B77F' : pct >= 45 ? '#F59E0B' : '#1C6ED4'
  const label  = confidence || (pct >= 75 ? 'HIGH' : pct >= 45 ? 'MED' : 'LOW')
  return (
    <span className={s.mlBadge} style={{ '--mc': color }}>
      🤖 {pct}% <span className={s.mlConf}>{label}</span>
    </span>
  )
}

export default function SchemeCard({ scheme, index }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`${s.card} ${open ? s.open : ''}`}>
      <div className={s.head} onClick={() => setOpen(v => !v)}>
        <div className={s.rank}>{index + 1}</div>
        <div className={s.nw}>
          <div className={s.nameRow}>
            <span className={s.name}>{scheme.name}</span>
            {scheme.ml_score != null && (
              <ScoreBadge score={scheme.ml_score} confidence={scheme.ml_confidence} />
            )}
          </div>
          <div className={s.ben}>
            ✅ {(scheme.benefits || '').slice(0, 72)}{(scheme.benefits || '').length > 72 ? '…' : ''}
          </div>
        </div>
        <div className={s.min}>{scheme.ministry || ''}</div>
        <span className={s.chev}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </span>
      </div>

      {open && (
        <div className={s.detail}>
          <p className={s.desc}>{scheme.description}</p>

          {scheme.reasons_passed?.length > 0 && (
            <>
              <div className={s.dlbl}>Why you qualify</div>
              {scheme.reasons_passed.map((r, i) => (
                <div key={i} className={s.doc}>{r}</div>
              ))}
            </>
          )}

          {scheme.ml_score != null && (
            <div className={s.mlDetail}>
              <span>🤖 AI Eligibility Score: <strong>{Math.round(scheme.ml_score * 100)}%</strong></span>
              <span className={s.mlNote}>Based on RandomForest model trained on socio-economic patterns</span>
            </div>
          )}

          {scheme.tags?.length > 0 && (
            <div className={s.tags}>
              {scheme.tags.map(t => <span key={t} className={s.tag}>{t.replace(/_/g, ' ')}</span>)}
            </div>
          )}

          {scheme.apply_link && (
            <a href={scheme.apply_link} target="_blank" rel="noopener noreferrer" className={s.apply}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Apply Now
            </a>
          )}
        </div>
      )}
    </div>
  )
}
