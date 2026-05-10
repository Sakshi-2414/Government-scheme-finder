import React from 'react'
import SchemeCard from './SchemeCard.jsx'
import { mdLite, fmtTime, fmtIncome, cap } from '../utils/format.js'
import s from './ChatBubble.module.css'

/* Build profile tags from extracted entities */
function buildTags(entities) {
  const tags = []
  if (!entities) return tags
  if (entities.age)      tags.push(`🎂 Age: ${entities.age}`)
  if (entities.income)   tags.push(`💰 ${fmtIncome(entities.income)}`)
  if (entities.gender)   tags.push(`👤 ${cap(entities.gender)}`)
  if (entities.category) tags.push(`🏷️ ${entities.category.toUpperCase()}`)
  if (entities.state)    tags.push(`📍 ${entities.state}`)
  if (entities.occupation?.length) tags.push(`💼 ${cap(entities.occupation[0])}`)
  if (entities.residence) tags.push(`🏘️ ${cap(entities.residence)}`)
  return tags
}

export default function ChatBubble({ message }) {
  const isUser   = message.role === 'user'
  const isError  = message.type === 'error'
  const schemes  = message.schemes  || []
  const entities = message.entities || {}
  const missing  = message.missing  || []
  const tags     = buildTags(entities)

  return (
    <div className={`${s.row} ${isUser ? s.userRow : s.botRow}`}>
      <div className={`${s.av} ${isUser ? s.avUser : s.avBot}`}>
        {isUser ? '👤' : '🏛'}
      </div>

      <div className={`${s.body} ${isUser ? s.bodyUser : ''}`}>
        {/* Main bubble */}
        <div className={`${s.bubble} ${isUser ? s.bubbleUser : s.bubbleBot} ${isError ? s.bubbleError : ''}`}
          dangerouslySetInnerHTML={{ __html: mdLite(message.text) }}
        />

        {/* Profile pill — show when we've detected at least 2 entities */}
        {!isUser && tags.length >= 2 && (
          <div className={s.profPill}>
            {tags.map(t => <span key={t} className={s.pTag}>{t}</span>)}
          </div>
        )}

        {/* Missing fields notice — shown during follow-up */}
        {!isUser && missing.length > 0 && message.type === 'followup' && (
          <div className={s.missingBox}>
            <span className={s.missingIcon}>💡</span>
            <span>Still need: <strong>{missing.join(' · ')}</strong></span>
          </div>
        )}

        {/* Scheme results */}
        {!isUser && schemes.length > 0 && (
          <>
            <div className={s.resBadge}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {schemes.length} scheme{schemes.length !== 1 ? 's' : ''} found
            </div>
            <div className={s.scList}>
              {schemes.map((sc, i) => <SchemeCard key={sc.id || i} scheme={sc} index={i} />)}
            </div>
          </>
        )}

        <div className={`${s.time} ${isUser ? s.timeUser : ''}`}>
          {fmtTime(message.ts)}
        </div>
      </div>
    </div>
  )
}
