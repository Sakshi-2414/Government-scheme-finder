import React from 'react'
import s from './TypingIndicator.module.css'

export default function TypingIndicator() {
  return (
    <div className={s.row}>
      <div className={s.av}>🏛</div>
      <div className={s.dots}>
        <span /><span /><span />
      </div>
    </div>
  )
}
