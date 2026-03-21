'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: { id: number; title: string; similarity: number }[]
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        sources: data.sources
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Something went wrong. Please try again.'
      }])
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        borderBottom: '1px solid #e5e5e5',
        padding: '0 1.5rem',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        background: '#fff',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: '0.95rem', letterSpacing: '-0.01em', paddingRight: '1.5rem' }}>
            Rhizome
          </span>
          <nav style={{ display: 'flex', borderLeft: '1px solid #e5e5e5' }}>
            {[
              { label: 'Notes', href: '/notes' },
              { label: 'Graph', href: '/graph' },
              { label: 'Chat', href: '/chat' }
            ].map(item => (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  padding: '0 1.25rem',
                  height: '56px',
                  display: 'flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  color: item.label === 'Chat' ? '#0a0a0a' : '#999',
                  borderRight: '1px solid #e5e5e5',
                  fontWeight: item.label === 'Chat' ? 500 : 400,
                  borderBottom: item.label === 'Chat' ? '2px solid #0a0a0a' : '2px solid transparent'
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <p style={{ fontSize: '0.8rem', color: '#999' }}>
          Powered by Llama 3.2 · Local
        </p>
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '760px', width: '100%', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ flex: 1, paddingTop: '2rem', paddingBottom: '1rem' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: '4rem' }}>
              <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Ask your notes anything</p>
              <p style={{ fontSize: '0.85rem', color: '#999', marginBottom: '2rem' }}>Rhizome will search your knowledge base and answer using what you've written</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                {[
                  'What do I know about machine learning?',
                  'Summarise my notes on neural networks',
                  'What concepts should I explore next?'
                ].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    style={{
                      padding: '0.5rem 1rem',
                      border: '1px solid #e5e5e5',
                      background: '#fafafa',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      color: '#555'
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: '1.5rem' }}>
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  background: msg.role === 'user' ? '#0a0a0a' : '#f4f4f4',
                  border: '1px solid #e5e5e5',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  color: msg.role === 'user' ? '#fff' : '#555',
                  fontWeight: 600
                }}>
                  {msg.role === 'user' ? 'A' : 'R'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: '#0a0a0a', whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </p>
                  {msg.sources && msg.sources.length > 0 && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', color: '#999' }}>Sources:</span>
                      {msg.sources.map(source => (
                        <Link
                          key={source.id}
                          href={`/notes/${source.id}`}
                          style={{
                            fontSize: '0.75rem',
                            color: '#0a0a0a',
                            textDecoration: 'none',
                            border: '1px solid #e5e5e5',
                            padding: '2px 8px',
                            background: '#fafafa'
                          }}
                        >
                          {source.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{
                width: '24px',
                height: '24px',
                background: '#f4f4f4',
                border: '1px solid #e5e5e5',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                color: '#555',
                fontWeight: 600
              }}>
                R
              </div>
              <p style={{ fontSize: '0.9rem', color: '#999', marginTop: '3px' }}>Thinking...</p>
            </div>
          )}
        </div>

        <div style={{
          borderTop: '1px solid #e5e5e5',
          paddingTop: '1rem',
          paddingBottom: '1.5rem',
          display: 'flex',
          gap: '0.75rem'
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask your knowledge base..."
            style={{
              flex: 1,
              padding: '0.65rem 1rem',
              border: '1px solid #e5e5e5',
              fontSize: '0.9rem',
              outline: 'none',
              background: '#fff'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{
              padding: '0.65rem 1.25rem',
              background: loading || !input.trim() ? '#f4f4f4' : '#0a0a0a',
              color: loading || !input.trim() ? '#999' : '#fff',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer'
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}