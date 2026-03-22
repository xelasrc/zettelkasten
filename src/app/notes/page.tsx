'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import nextDynamic from 'next/dynamic'
import Sidebar from '@/components/Nav'
import { Search, X, FileText, Trash2, Plus } from 'lucide-react'

const Editor = nextDynamic(() => import('@/components/Editor'), { ssr: false })

interface Note {
  id: number
  title: string
  tags: string[]
  content: unknown
  created_at: string
  updated_at: string
}

interface OpenTab {
  id: number | null
  title: string
  content: unknown
  tags: string[]
  isDirty: boolean
  saving: boolean
  saved: boolean
  _key: number
}

let tabCounter = 0

function makeEmptyTab(): OpenTab {
  return {
    _key: ++tabCounter,
    id: null,
    title: 'New tab',
    content: null,
    tags: [],
    isDirty: false,
    saving: false,
    saved: false
  }
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [search, setSearch] = useState('')
  const [tabs, setTabs] = useState<OpenTab[]>(() => [makeEmptyTab()])
  const [activeKey, setActiveKey] = useState<number>(1)

  useEffect(() => {
    fetch('/api/notes')
      .then(res => res.json())
      .then(setNotes)
  }, [])

  function createTab() {
    const tab = makeEmptyTab()
    setTabs(prev => [...prev, tab])
    setActiveKey(tab._key)
  }

  async function openNoteInActiveTab(note: Note) {
    const res = await fetch(`/api/notes/${note.id}`)
    const full = await res.json()
    setTabs(prev => prev.map(t =>
      t._key === activeKey
        ? { ...t, id: full.id, title: full.title, content: full.content, tags: full.tags, isDirty: false, saved: false }
        : t
    ))
  }

  function closeTab(key: number, e: React.MouseEvent) {
    e.stopPropagation()
    setTabs(prev => {
      const remaining = prev.filter(t => t._key !== key)
      if (remaining.length === 0) {
        const fresh = makeEmptyTab()
        setActiveKey(fresh._key)
        return [fresh]
      }
      if (activeKey === key) {
        setActiveKey(remaining[remaining.length - 1]._key)
      }
      return remaining
    })
  }

  async function deleteNote(id: number) {
    if (!confirm('Delete this note?')) return
    await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    setNotes(prev => prev.filter(n => n.id !== id))
    setTabs(prev => prev.map(t =>
      t.id === id ? { ...makeEmptyTab(), _key: t._key } : t
    ))
  }

  const saveTab = useCallback(async (key: number) => {
    const tab = tabs.find(t => t._key === key)
    if (!tab || !tab.id) return
    setTabs(prev => prev.map(t => t._key === key ? { ...t, saving: true } : t))
    await fetch(`/api/notes/${tab.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: tab.title, content: tab.content, tags: tab.tags })
    })
    setNotes(prev => prev.map(n => n.id === tab.id ? { ...n, title: tab.title, tags: tab.tags } : n))
    setTabs(prev => prev.map(t => t._key === key ? { ...t, saving: false, saved: true, isDirty: false } : t))
    setTimeout(() => {
      setTabs(prev => prev.map(t => t._key === key ? { ...t, saved: false } : t))
    }, 2000)
  }, [tabs])

  const updateContent = useCallback((content: unknown) => {
    setTabs(prev => prev.map(t => t._key === activeKey ? { ...t, content, isDirty: true } : t))
  }, [activeKey])

  const updateTitle = useCallback((title: string) => {
    setTabs(prev => prev.map(t => t._key === activeKey ? { ...t, title, isDirty: true } : t))
  }, [activeKey])

  const filtered = notes.filter(note =>
    note.title.toLowerCase().includes(search.toLowerCase())
  )

  const activeTab = tabs.find(t => t._key === activeKey) ?? null

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      {/* Notes list column */}
      <div className="flex flex-col w-60 border-r border-gray-200 shrink-0 overflow-hidden bg-white">

        {/* Search */}
        <div className="h-14 flex items-center px-3 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 flex-1">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none text-gray-900 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto">
          <p className="text-xs text-gray-400 uppercase tracking-wider px-3 pt-3 pb-1.5 font-medium">
            {filtered.length} notes
          </p>
          {filtered.map(note => (
            <button
              key={note.id}
              onClick={() => openNoteInActiveTab(note)}
              className={`w-full text-left px-3 py-2.5 border-b border-gray-100 hover:bg-gray-50 transition-colors group ${
                activeTab?.id === note.id ? 'bg-blue-50 border-l-2 border-l-blue-400' : ''
              }`}
            >
              <p className={`text-sm truncate font-medium ${
                activeTab?.id === note.id ? 'text-blue-700' : 'text-gray-800'
              }`}>
                {note.title}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(note.updated_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}
              </p>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-8 text-center">
              <p className="text-sm text-gray-400">No notes found</p>
            </div>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Tab bar */}
        <div className="flex items-center border-b border-gray-200 bg-white shrink-0 h-10">
          <div className="flex items-center overflow-x-auto flex-1">
            {tabs.map(tab => (
              <button
                key={tab._key}
                onClick={() => setActiveKey(tab._key)}
                className={`relative flex items-center gap-2 px-4 h-10 border-r border-gray-200 text-xs shrink-0 transition-colors group ${
                  activeKey === tab._key
                    ? 'bg-gray-50 text-gray-900 font-medium'
                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {activeKey === tab._key && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
                )}
                <span className="max-w-28 truncate">{tab.title}</span>
                {tab.isDirty && (
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                )}
                <span
                  onClick={(e) => closeTab(tab._key, e)}
                  className="opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded p-0.5 transition-all cursor-pointer ml-0.5"
                >
                  <X size={10} />
                </span>
              </button>
            ))}

            <button
              onClick={createTab}
              className="flex items-center justify-center w-8 h-8 ml-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
            >
              <Plus size={14} />
            </button>
          </div>

          {activeTab?.id && (
            <div className="flex items-center shrink-0 h-full border-l border-gray-200">
              <span className="text-xs px-3 hidden sm:block">
                {activeTab.saving
                  ? <span className="text-amber-500">Saving...</span>
                  : activeTab.saved
                  ? <span className="text-green-500">Saved ✓</span>
                  : <span className="text-gray-300">Unsaved</span>
                }
              </span>
              <button
                onClick={() => saveTab(activeKey)}
                className="text-xs px-3 h-full hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-colors border-l border-gray-200 font-medium"
              >
                Save
              </button>
              <button
                onClick={() => deleteNote(activeTab.id!)}
                className="px-3 h-full hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors border-l border-gray-200"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Note content */}
        <div className="flex-1 overflow-y-auto bg-white">
          {activeTab?.id ? (
            <div className="px-10 py-8 max-w-4xl">
              <input
                value={activeTab.title}
                onChange={e => updateTitle(e.target.value)}
                className="w-full text-3xl font-bold text-gray-900 outline-none mb-3 bg-transparent placeholder-gray-200"
                placeholder="Untitled"
              />
              {activeTab.tags.length > 0 && (
                <div className="flex gap-2 mb-6 flex-wrap">
                  {activeTab.tags.map(tag => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full border border-gray-200">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              <Editor
                key={activeTab.id}
                initialContent={activeTab.content}
                onChange={updateContent}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <FileText size={20} className="text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">New tab</p>
                <p className="text-xs text-gray-400 mt-0.5">Select a note from the list to open it</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}