'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import nextDynamic from 'next/dynamic'
import Sidebar from '@/components/Nav'
import { Search, X, FileText, Trash2, Plus, FilePlus, ArrowUpDown, Sparkles, Tag } from 'lucide-react'

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
  tagging: boolean
  suggestions: TagSuggestions | null
  _key: number
}

interface TagSuggestions {
  tags: string[]
  related_concepts: string[]
  summary: string
  suggested_links: string[]
}

type SortMode = 'updated' | 'created' | 'alpha'
type SearchMode = 'title' | 'tag'

let tabCounter = 0

function makeEmptyTab(): OpenTab {
  return {
    _key: ++tabCounter,
    id: null,
    title: 'Untitled',
    content: null,
    tags: [],
    isDirty: false,
    saving: false,
    saved: false,
    tagging: false,
    suggestions: null
  }
}

export default function NotesPage() {
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [search, setSearch] = useState('')
  const [searchMode, setSearchMode] = useState<SearchMode>('title')
  const [sortMode, setSortMode] = useState<SortMode>('updated')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [tabs, setTabs] = useState<OpenTab[]>(() => [makeEmptyTab()])
  const [activeKey, setActiveKey] = useState<number>(1)

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
      // Only create in DB when title differs from default
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
    const res = await fetch(`/api/notes/${note.id}`)
    const full = await res.json()
    setTabs(prev => prev.map(t =>
      t._key === activeKey
        ? { ...t, id: full.id, title: full.title, content: full.content, tags: full.tags, isDirty: false, saved: false, suggestions: null }
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

  const saveTab = useCallback(async (key: number) => {
    const tab = tabs.find(t => t._key === key)
    if (!tab) return

    // If tab has no ID yet, create the note first
    if (!tab.id) {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: tab.title || 'Untitled', content: tab.content || {} })
      })
      const note = await res.json()
      setNotes(prev => [note, ...prev])
      setTabs(prev => prev.map(t => t._key === key ? { ...t, id: note.id, saving: false, saved: true, isDirty: false } : t))
      setTimeout(() => {
        setTabs(prev => prev.map(t => t._key === key ? { ...t, saved: false } : t))
      }, 2000)
      return
    }

    setTabs(prev => prev.map(t => t._key === key ? { ...t, saving: true } : t))
    await fetch(`/api/notes/${tab.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: tab.title, content: tab.content, tags: tab.tags })
    })
    const now = new Date().toISOString()
    setNotes(prev => prev.map(n => n.id === tab.id
      ? { ...n, title: tab.title, tags: tab.tags, updated_at: now }
      : n
    ))
    setTabs(prev => prev.map(t => t._key === key ? { ...t, saving: false, saved: true, isDirty: false } : t))
    setTimeout(() => {
      setTabs(prev => prev.map(t => t._key === key ? { ...t, saved: false } : t))
    }, 2000)
  }, [tabs])

  const generateTags = useCallback(async (key: number) => {
    const tab = tabs.find(t => t._key === key)
    if (!tab || !tab.id) return
    setTabs(prev => prev.map(t => t._key === key ? { ...t, tagging: true, suggestions: null } : t))
    const res = await fetch('/api/tag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: tab.title, content: tab.content })
    })
    const data = await res.json()
    if (!res.ok || data.error) {
      setTabs(prev => prev.map(t => t._key === key ? { ...t, tagging: false } : t))
      return
    }
    setTabs(prev => prev.map(t => t._key === key ? { ...t, tagging: false, suggestions: data } : t))
  }, [tabs])

  const acceptTags = useCallback(async (key: number) => {
    const tab = tabs.find(t => t._key === key)
    if (!tab || !tab.suggestions) return
    const newTags = tab.suggestions.tags
    setTabs(prev => prev.map(t => t._key === key ? { ...t, tags: newTags, suggestions: null, isDirty: true } : t))
  }, [tabs])

  const updateContent = useCallback((content: unknown) => {
    setTabs(prev => prev.map(t => t._key === activeKey ? { ...t, content, isDirty: true } : t))
  }, [activeKey])

  const sorted = [...notes].sort((a, b) => {
    if (sortMode === 'alpha') return a.title.localeCompare(b.title)
    if (sortMode === 'created') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })

  const filtered = sorted.filter(note => {
    if (!search) return true
    if (searchMode === 'tag') {
      return note.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
    }
    return note.title.toLowerCase().includes(search.toLowerCase())
  })

  const activeTab = tabs.find(t => t._key === activeKey) ?? null

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

          <button
            onClick={() => {
              setSearchMode(prev => prev === 'title' ? 'tag' : 'title')
              setSearch('')
            }}
            title={searchMode === 'title' ? 'Switch to tag search' : 'Switch to title search'}
            className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
              searchMode === 'tag'
                ? 'bg-blue-50 text-blue-500'
                : 'hover:bg-gray-200 text-gray-400 hover:text-gray-700'
            }`}
          >
            <Tag size={15} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              placeholder={searchMode === 'tag' ? 'Search by tag...' : 'Search notes...'}
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
          {searchMode === 'tag' && (
            <p className="text-xs text-blue-500 mt-1 px-1">Searching by tag</p>
          )}
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
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-xs text-gray-400">
                  {new Date(note.updated_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                {note.tags.length > 0 && searchMode === 'tag' && search && (
                  <div className="flex gap-1">
                    {note.tags
                      .filter(t => t.toLowerCase().includes(search.toLowerCase()))
                      .slice(0, 2)
                      .map(tag => (
                        <span key={tag} className="text-xs bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-full">
                          #{tag}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-8 text-center">
              <p className="text-sm text-gray-400">
                {search
                  ? searchMode === 'tag'
                    ? `No notes tagged "${search}"`
                    : `No notes matching "${search}"`
                  : 'No notes yet'
                }
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
                <span className="max-w-28 truncate">
                  {tab.title || 'New tab'}
                </span>
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

          {/* Right side actions */}
          <div className="flex items-center shrink-0 h-full border-l border-gray-200">
            {activeTab && (
              <button
                onClick={() => generateTags(activeKey)}
                disabled={activeTab.tagging || !activeTab.id}
                className={`flex items-center gap-1.5 px-3 h-full text-xs font-medium transition-colors border-r border-gray-200 ${
                  activeTab.tagging
                    ? 'text-blue-400 cursor-wait'
                    : !activeTab.id
                    ? 'text-gray-200 cursor-not-allowed'
                    : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Sparkles size={13} />
                {activeTab.tagging ? 'Thinking...' : 'AI Tags'}
              </button>
            )}
            {activeTab && (
              <span className="text-xs px-3 hidden sm:block">
                {activeTab.saving
                  ? <span className="text-amber-500">Saving...</span>
                  : activeTab.saved
                  ? <span className="text-green-500">Saved ✓</span>
                  : <span className="text-gray-300">Unsaved</span>
                }
              </span>
            )}
            {activeTab?.id && (
              <>
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
              </>
            )}
            {activeTab && !activeTab.id && (
              <button
                onClick={() => saveTab(activeKey)}
                className="text-xs px-3 h-full hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-colors border-l border-gray-200 font-medium"
              >
                Save
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

              {activeTab.tags.length > 0 && (
                <div className="flex gap-2 mb-4 flex-wrap">
                  {activeTab.tags.map(tag => (
                    <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full border border-blue-100">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {activeTab.suggestions && (
                <div className="mb-6 p-4 border border-blue-100 rounded-lg bg-blue-50/50">
                  <p className="text-xs font-medium text-blue-600 mb-3 flex items-center gap-1.5">
                    <Sparkles size={12} />
                    AI Suggestions
                  </p>
                  <p className="text-xs text-gray-500 italic mb-3">{activeTab.suggestions.summary}</p>

                  <div className="mb-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">Tags</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {activeTab.suggestions.tags.map(tag => (
                        <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">#{tag}</span>
                      ))}
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">Related concepts</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {activeTab.suggestions.related_concepts.map(c => (
                        <span key={c} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{c}</span>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">Suggested links</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {activeTab.suggestions.suggested_links.map(l => (
                        <span key={l} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{l}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptTags(activeKey)}
                      className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
                    >
                      Accept tags
                    </button>
                    <button
                      onClick={() => setTabs(prev => prev.map(t => t._key === activeKey ? { ...t, suggestions: null } : t))}
                      className="text-xs px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 rounded-md transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {activeTab.id && (
                <Editor
                  key={activeTab.id}
                  initialContent={activeTab.content}
                  onChange={updateContent}
                />
              )}

              {!activeTab.id && (
                <p className="text-sm text-gray-300 mt-2">
                  Change the title to start writing...
                </p>
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