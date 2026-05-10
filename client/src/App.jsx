import React, { useState } from 'react'
import HomePage from './pages/HomePage.jsx'
import ChatApp  from './pages/ChatApp.jsx'

export default function App() {
  const [page, setPage] = useState('home') // 'home' | 'chat'

  if (page === 'chat') return <ChatApp onHome={() => setPage('home')} />
  return <HomePage onStart={() => setPage('chat')} />
}
