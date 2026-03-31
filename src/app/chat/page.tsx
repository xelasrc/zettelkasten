'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Nav'
import { Send, Bot, User } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: { id: number; title: string; similarity: number }[]
}

const suggestions = [
  'What do I know about machine learning?',
  'Summarise my notes on neural networks',
  'How does backpropagation relate to gradient descent?',
  'What concepts should I explore next?'
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

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
    <div className="flex h-[100dvh] pb-16 md:pb-0 bg-gray-50 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 sm:px-6 border-b border-gray-200 shrink-0">
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Chat</h1>
            <p className="text-xs text-gray-400 hidden sm:block">Ask questions about your notes · powered by Llama 3.2 locally</p>
            <p className="text-xs text-gray-400 sm:hidden">Ask your notes anything</p>
          </div>
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
                <p className="text-xs text-gray-400 mb-8">Rhizome searches your notes and answers using what you've written</p>
                <div className="flex flex-col gap-2 w-full">
                  {suggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="w-full text-sm text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 transition-colors text-left"
                    >
                      {s}
                    </button>
                  ))}
                </div>
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
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-400">Sources:</span>
                        {msg.sources.map(source => (
                          <Link
                            key={source.id}
                            href={`/notes`}
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