'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import Sidebar from '@/components/Nav'
import { Send, Bot, User, Eraser } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: { id: number; title: string; similarity: number }[]
}

const MARKER = 'RHIZOME_USED: '

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem('chat-messages')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    localStorage.setItem('chat-messages', JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function clearChat() {
    setMessages([])
    localStorage.removeItem('chat-messages')
  }

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')

    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setLoading(true)

    let assistantContent = ''
    let assistantSources: Message['sources'] = []
    let assistantAdded = false

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.slice(-10).map(m => ({ role: m.role, content: m.content }))
        })
      })

      if (!res.ok || !res.body) throw new Error('Request failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            if (parsed.sources !== undefined) {
              assistantSources = parsed.sources
            }
            if (parsed.text) {
              assistantContent += parsed.text
              if (!assistantAdded) {
                assistantAdded = true
                setLoading(false)
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: assistantContent,
                  sources: assistantSources
                }])
              } else {
                setMessages(prev => {
                  const next = [...prev]
                  next[next.length - 1] = {
                    ...next[next.length - 1],
                    content: assistantContent,
                    sources: assistantSources
                  }
                  return next
                })
              }
            }
            if (parsed.error) throw new Error(parsed.error)
          } catch {
            // ignore individual parse errors
          }
        }
      }

      // Parse RHIZOME_USED marker and clean up the displayed text
      const markerIdx = assistantContent.indexOf('\n' + MARKER)
      if (markerIdx !== -1) {
        const cleanText = assistantContent.slice(0, markerIdx)
        const usedLine = assistantContent.slice(markerIdx + 1 + MARKER.length)
        const usedTitles = usedLine.split('|').map(t => t.trim()).filter(Boolean)
        const filteredSources = (assistantSources ?? []).filter(s =>
          usedTitles.some(t => t.toLowerCase() === s.title.toLowerCase())
        )
        setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = {
            ...next[next.length - 1],
            content: cleanText,
            sources: filteredSources.length > 0 ? filteredSources : assistantSources
          }
          return next
        })
      }

      if (!assistantAdded) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'No response generated.' }])
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Something went wrong. Please try again.'
      }])
    }

    setLoading(false)
  }

  return (
    <div className="flex h-[100dvh] pb-16 md:pb-0 bg-gray-50 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 sm:px-6 border-b border-gray-200 shrink-0">
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Chat</h1>
            <p className="text-xs text-gray-400 hidden sm:block">Ask questions about your notes</p>
            <p className="text-xs text-gray-400 sm:hidden">Ask your notes anything</p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Clear chat"
            >
              <Eraser size={15} />
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl mx-auto">
            {messages.length === 0 && (
              <div className="text-center mt-16">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Bot size={20} className="text-gray-400" />
                </div>
                <h2 className="text-sm font-semibold text-gray-700 mb-1">Ask your knowledge base</h2>
                <p className="text-xs text-gray-400">Rhizome searches your notes and answers using what you've written</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className="mb-6">
                <div className="flex gap-3 items-start">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user'
                      ? 'bg-gray-900 text-white'
                      : 'bg-blue-50 text-blue-500 border border-blue-100'
                  }`}>
                    {msg.role === 'user'
                      ? <User size={13} />
                      : <Bot size={13} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-400 mb-1">
                      {msg.role === 'user' ? 'You' : 'Rhizome'}
                    </p>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm prose-gray max-w-none
                        prose-p:my-1 prose-p:leading-relaxed
                        prose-headings:font-semibold prose-headings:text-gray-900
                        prose-code:text-xs prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                        prose-pre:bg-gray-100 prose-pre:text-xs
                        prose-ul:my-1 prose-ol:my-1 prose-li:my-0
                        prose-strong:text-gray-900">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-800 leading-relaxed">{msg.content}</p>
                    )}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-400">Sources:</span>
                        {msg.sources.map(source => (
                          <Link
                            key={source.id}
                            href={`/notes?open=${source.id}`}
                            className="text-xs bg-green-50 text-green-700 border border-green-100 px-2.5 py-1 rounded-full hover:bg-green-100 transition-colors"
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
              <div className="mb-6">
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-500 border border-blue-100 flex items-center justify-center shrink-0">
                    <Bot size={13} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-400 mb-2">Rhizome</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 px-4 sm:px-6 py-4 bg-white shrink-0">
          <div className="max-w-2xl mx-auto flex gap-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask your knowledge base..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-base md:text-sm outline-none text-gray-900 placeholder-gray-400 focus:border-blue-300 focus:bg-white transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                loading || !input.trim()
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-900 text-white hover:bg-gray-700'
              }`}
            >
              <Send size={14} />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
