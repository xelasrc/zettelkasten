'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import nextDynamic from 'next/dynamic'
import Sidebar from '@/components/Nav'
import type { EditorHandle } from '@/components/Editor'
import { Search, X, FileText, Trash2, Plus, FilePlus, ArrowUpDown, Link2 } from 'lucide-react'
import { extractWikilinks } from '@/lib/embeddings'

const Editor = nextDynamic(() => import('@/components/Editor'), { ssr: false })

interface Note {
  id: number
  title: string
  links: string[]
  created_at: string
  updated_at: string
}

interface OpenTab {
  id: number | null
  title: string
  content: unknown
  isDirty: boolean
  saving: boolean
  saved: boolean
  linking: boolean
  suggestions: string[] | null
  backlinks: { id: number; title: string }[]
  _key: number
}

type SortMode = 'updated' | 'created' | 'alpha'

let tabCounter = 0

function makeEmptyTab(): OpenTab {
  return {
    _key: ++tabCounter,
    id: null,
    title: 'Untitled',
    content: null,
    isDirty: false,
    saving: false,
    saved: false,
    linking: false,
    suggestions: null,
    backlinks: []
  }
}

export default function NotesPage() {
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('updated')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [tabs, setTabs] = useState<OpenTab[]>(() => [makeEmptyTab()])
  const [activeKey, setActiveKey] = useState<number>(1)
  const editorRef = useRef<EditorHandle>(null)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetch('/api/notes').then(res => {
      if (res.status === 401) { router.push('/sign-in'); return }
      res.json().then(setNotes)
    })
  }, [router])

  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(t => t._key === activeKey)) {
      setActiveKey(tabs[tabs.length - 1]._key)
    }
  }, [tabs, activeKey])

  function createTab() {
    const tab = makeEmptyTab()
    setTabs(prev => [...prev, tab])
    setActiveKey(tab._key)
  }

  async function handleTitleChange(title: string) {
    const tab = tabs.find(t => t._key === activeKey)
    if (!tab) return

    if (!tab.id) {
      if (title.trim() && title !== 'Untitled') {
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content: {} })
        })
        const note = await res.json()
        setNotes(prev => [note, ...prev])
        setTabs(prev => prev.map(t =>
          t._key === activeKey
            ? { ...t, id: note.id, title, content: note.content, isDirty: false }
            : t
        ))
      } else {
        setTabs(prev => prev.map(t =>
          t._key === activeKey ? { ...t, title } : t
        ))
      }
    } else {
      setTabs(prev => prev.map(t =>
        t._key === activeKey ? { ...t, title, isDirty: true } : t
      ))
    }
  }

  async function openNoteInActiveTab(note: Note) {
    const [noteRes, backlinksRes] = await Promise.all([
      fetch(`/api/notes/${note.id}`),
      fetch(`/api/notes/${note.id}/backlinks`)
    ])
    const full = await noteRes.json()
    const backlinks = backlinksRes.ok ? await backlinksRes.json() : []
    setTabs(prev => prev.map(t =>
      t._key === activeKey
        ? { ...t, id: full.id, title: full.title, content: full.content, isDirty: false, saved: false, suggestions: null, backlinks }
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
        const currentIndex = prev.findIndex(t => t._key === key)
        const nextTab = prev[currentIndex + 1] ?? prev[currentIndex - 1]
        setActiveKey(nextTab._key)
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

  const saveTab = useCallback(async (key: number, currentTabs: OpenTab[]) => {
    const tab = currentTabs.find(t => t._key === key)
    if (!tab) return

    if (!tab.id) {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: tab.title || 'Untitled', content: tab.content || {} })
      })
      const note = await res.json()
      setNotes(prev => [note, ...prev])
      setTabs(prev => prev.map(t => t._key === key ? { ...t, id: note.id, saving: false, saved: true, isDirty: false } : t))
      setTimeout(() => setTabs(prev => prev.map(t => t._key === key ? { ...t, saved: false } : t)), 2000)
      return
    }

    setTabs(prev => prev.map(t => t._key === key ? { ...t, saving: true } : t))
    await fetch(`/api/notes/${tab.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: tab.title, content: tab.content })
    })
    const now = new Date().toISOString()
    setNotes(prev => prev.map(n => n.id === tab.id ? { ...n, title: tab.title, updated_at: now } : n))
    setTabs(prev => prev.map(t => t._key === key ? { ...t, saving: false, saved: true, isDirty: false } : t))
    setTimeout(() => setTabs(prev => prev.map(t => t._key === key ? { ...t, saved: false } : t)), 2000)
  }, [])

  const updateContent = useCallback((content: unknown) => {
    setTabs(prev => {
      const updated = prev.map(t => t._key === activeKey ? { ...t, content, isDirty: true } : t)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => saveTab(activeKey, updated), 1500)
      return updated
    })
  }, [activeKey, saveTab])

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [])

  const suggestLinks = useCallback(async (key: number) => {
    const tab = tabs.find(t => t._key === key)
    if (!tab || !tab.id) return
    setTabs(prev => prev.map(t => t._key === key ? { ...t, linking: true, suggestions: null } : t))

    const allTitles = notes.filter(n => n.id !== tab.id).map(n => n.title)
    const res = await fetch('/api/suggest-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: tab.title, content: tab.content, allTitles })
    })
    const data = await res.json()
    if (!res.ok || data.error) {
      setTabs(prev => prev.map(t => t._key === key ? { ...t, linking: false } : t))
      return
    }
    setTabs(prev => prev.map(t => t._key === key ? { ...t, linking: false, suggestions: data.links } : t))
  }, [tabs, notes])

  const insertSuggestedLinks = useCallback((key: number) => {
    const tab = tabs.find(t => t._key === key)
    if (!tab?.suggestions?.length) return
    editorRef.current?.appendWikilinks(tab.suggestions)
    setTabs(prev => prev.map(t => t._key === key ? { ...t, suggestions: null } : t))
  }, [tabs])

  const sorted = [...notes].sort((a, b) => {
    if (sortMode === 'alpha') return a.title.localeCompare(b.title)
    if (sortMode === 'created') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })

  const filtered = sorted.filter(note =>
    !search || note.title.toLowerCase().includes(search.toLowerCase())
  )

  const activeTab = tabs.find(t => t._key === activeKey) ?? null
  const noteTitles = notes.filter(n => n.id !== activeTab?.id).map(n => n.title)
  const noteTitleSet = new Set(notes.map(n => n.title))
  const activeWikilinks = activeTab?.content ? extractWikilinks(activeTab.content) : []

  async function openNoteByTitle(title: string) {
    const note = notes.find(n => n.title === title)
    if (!note) return
    const tab = makeEmptyTab()
    setTabs(prev => [...prev, tab])
    setActiveKey(tab._key)
    const [noteRes, backlinksRes] = await Promise.all([
      fetch(`/api/notes/${note.id}`),
      fetch(`/api/notes/${note.id}/backlinks`)
    ])
    const full = await noteRes.json()
    const backlinks = backlinksRes.ok ? await backlinksRes.json() : []
    setTabs(prev => prev.map(t =>
      t._key === tab._key
        ? { ...t, id: full.id, title: full.title, content: full.content, isDirty: false, saved: false, suggestions: null, backlinks }
        : t
    ))
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      {/* Notes list column */}
      <div className="flex flex-col w-60 border-r border-gray-200 shrink-0 overflow-hidden bg-white">

        {/* Toolbar */}
        <div className="h-11 flex items-center justify-around px-2 border-b border-gray-100 bg-gray-50/80 shrink-0">
          <button
            onClick={createTab}
            title="New note"
            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <FilePlus size={15} />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowSortMenu(p => !p)}
              title="Sort"
              className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
                showSortMenu ? 'bg-blue-50 text-blue-500' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-700'
              }`}
            >
              <ArrowUpDown size={15} />
            </button>
            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-xl w-40 py-1">
                  {([
                    { value: 'updated', label: 'Last modified' },
                    { value: 'created', label: 'Date created' },
                    { value: 'alpha', label: 'Alphabetical' },
                  ] as { value: SortMode; label: string }[]).map(option => (
                    <button
                      key={option.value}
                      onClick={() => { setSortMode(option.value); setShowSortMenu(false) }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                        sortMode === option.value
                          ? 'text-blue-600 bg-blue-50 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              placeholder="Search notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none text-gray-900 placeholder-gray-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            )}
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
              className={`w-full text-left px-3 py-2.5 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                activeTab?.id === note.id ? 'bg-blue-50 border-l-2 border-l-blue-400' : ''
              }`}
            >
              <p className={`text-sm truncate font-medium ${
                activeTab?.id === note.id ? 'text-blue-700' : 'text-gray-800'
              }`}>
                {note.title}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(note.updated_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-8 text-center">
              <p className="text-sm text-gray-400">
                {search ? `No notes matching "${search}"` : 'No notes yet'}
              </p>
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
                <span className="max-w-28 truncate">{tab.title || 'New tab'}</span>
                {tab.isDirty && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
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

          {/* Right side actions */}
          <div className="flex items-center shrink-0 h-full border-l border-gray-200">
            {activeTab && (
              <button
                onClick={() => suggestLinks(activeKey)}
                disabled={activeTab.linking || !activeTab.id}
                className={`flex items-center gap-1.5 px-3 h-full text-xs font-medium transition-colors border-r border-gray-200 ${
                  activeTab.linking
                    ? 'text-blue-400 cursor-wait'
                    : !activeTab.id
                    ? 'text-gray-200 cursor-not-allowed'
                    : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Link2 size={13} />
                {activeTab.linking ? 'Thinking...' : 'Suggest Links'}
              </button>
            )}
            {activeTab && (
              <span className="text-xs px-3 hidden sm:block">
                {activeTab.saving
                  ? <span className="text-amber-500">Saving...</span>
                  : activeTab.saved
                  ? <span className="text-green-500">Saved ✓</span>
                  : <span className="text-gray-300">Auto-saves</span>
                }
              </span>
            )}
            {activeTab?.id && (
              <button
                onClick={() => deleteNote(activeTab.id!)}
                className="px-3 h-full hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors border-l border-gray-200"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Note content */}
        <div className="flex-1 overflow-y-auto bg-white">
          {activeTab ? (
            <div className="px-10 py-8 max-w-4xl">
              <input
                value={activeTab.title}
                onChange={e => handleTitleChange(e.target.value)}
                className="w-full text-3xl font-bold text-gray-900 outline-none mb-3 bg-transparent placeholder-gray-300"
                placeholder="Untitled"
              />

              {/* Active wikilinks */}
              {activeWikilinks.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mb-5">
                  {activeWikilinks.map(title => {
                    const resolved = noteTitleSet.has(title)
                    return resolved ? (
                      <button
                        key={title}
                        onClick={() => openNoteByTitle(title)}
                        className="text-xs px-2.5 py-1 rounded-full border bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 transition-colors font-mono"
                      >
                        [[{title}]]
                      </button>
                    ) : (
                      <span key={title} className="text-xs px-2.5 py-1 rounded-full border bg-gray-50 text-gray-400 border-gray-200 font-mono">
                        [[{title}]]
                      </span>
                    )
                  })}
                </div>
              )}

              {/* Suggest Links panel */}
              {activeTab.suggestions !== null && (
                activeTab.suggestions.length === 0 ? (
                  <div className="mb-4 px-4 py-3 border border-gray-100 rounded-lg bg-gray-50 flex items-center justify-between">
                    <p className="text-xs text-gray-400">No related notes found to link to.</p>
                    <button
                      onClick={() => setTabs(prev => prev.map(t => t._key === activeKey ? { ...t, suggestions: null } : t))}
                      className="text-gray-300 hover:text-gray-500 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="mb-6 p-4 border border-blue-100 rounded-lg bg-blue-50/50">
                    <p className="text-xs font-medium text-blue-600 mb-3 flex items-center gap-1.5">
                      <Link2 size={12} />
                      Suggested Links
                    </p>
                    <div className="flex gap-1.5 flex-wrap mb-4">
                      {activeTab.suggestions.map(title => (
                        <span key={title} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-mono">
                          [[{title}]]
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => insertSuggestedLinks(activeKey)}
                        className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
                      >
                        Insert into note
                      </button>
                      <button
                        onClick={() => setTabs(prev => prev.map(t => t._key === activeKey ? { ...t, suggestions: null } : t))}
                        className="text-xs px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 rounded-md transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )
              )}

              {activeTab.id && (
                <Editor
                  key={activeTab.id}
                  ref={editorRef}
                  initialContent={activeTab.content}
                  onChange={updateContent}
                  noteTitles={noteTitles}
                />
              )}

              {!activeTab.id && (
                <p className="text-sm text-gray-300 mt-2">
                  Change the title to start writing...
                </p>
              )}

              {/* Backlinks panel */}
              {activeTab.id && activeTab.backlinks.length > 0 && (
                <div className="mt-12 pt-6 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                    {activeTab.backlinks.length} backlink{activeTab.backlinks.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex flex-col gap-1">
                    {activeTab.backlinks.map(bl => (
                      <button
                        key={bl.id}
                        onClick={() => { const n = notes.find(n => n.id === bl.id); if (n) openNoteInActiveTab(n) }}
                        className="text-left text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        ← {bl.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <FileText size={20} className="text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">No tab open</p>
                <p className="text-xs text-gray-400 mt-0.5">Press + to open a new tab</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
