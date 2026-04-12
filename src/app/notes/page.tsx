'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import nextDynamic from 'next/dynamic'
import Sidebar from '@/components/Nav'
import type { EditorHandle } from '@/components/Editor'
import { Search, X, FileText, Trash2, Plus, FilePlus, ArrowUpDown, Link2, List, FolderPlus, Folder, FolderOpen, ChevronRight, MoreHorizontal } from 'lucide-react'
import { extractWikilinks } from '@/lib/embeddings'

const Editor = nextDynamic(() => import('@/components/Editor'), { ssr: false })

interface Note {
  id: number
  title: string
  links: string[]
  folder_id: number | null
  created_at: string
  updated_at: string
}

interface FolderItem {
  id: number
  name: string
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
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('updated')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [showNotesList, setShowNotesList] = useState(false)
  const [collapsedFolders, setCollapsedFolders] = useState<Set<number>>(new Set())
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [renamingFolder, setRenamingFolder] = useState<number | null>(null)
  const [renameFolderName, setRenameFolderName] = useState('')
  const [moveMenuNoteId, setMoveMenuNoteId] = useState<number | null>(null)
  const [tabs, setTabs] = useState<OpenTab[]>(() => [makeEmptyTab()])
  const [activeKey, setActiveKey] = useState<number>(1)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const editorRef = useRef<EditorHandle>(null)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const openHandledRef = useRef(false)

  useEffect(() => {
    fetch('/api/notes').then(res => {
      if (res.status === 401) { router.push('/sign-in'); return }
      res.json().then(setNotes)
    })
    fetch('/api/folders').then(res => res.json()).then(setFolders)
  }, [router])

  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(t => t._key === activeKey)) {
      setActiveKey(tabs[tabs.length - 1]._key)
    }
  }, [tabs, activeKey])

  useEffect(() => {
    if (openHandledRef.current || !notes.length) return
    const openId = new URLSearchParams(window.location.search).get('open')
    if (!openId) return
    openHandledRef.current = true
    window.history.replaceState(null, '', '/notes')
    const note = notes.find(n => n.id === Number(openId))
    if (note) openNoteInActiveTab(note)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes])

  async function createTab() {
    const today = new Date().toLocaleDateString('en-CA') // "YYYY-MM-DD"

    // If a note with today's date already exists, open it instead of creating a duplicate
    const existing = notes.find(n => n.title === today)
    if (existing) {
      const alreadyOpen = tabs.find(t => t.id === existing.id)
      if (alreadyOpen) {
        setActiveKey(alreadyOpen._key)
        return
      }
      await openNoteByTitle(today)
      return
    }

    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: today, content: {} })
    })
    const note = await res.json()
    const tab: OpenTab = { ...makeEmptyTab(), id: note.id, title: today, content: note.content }
    setNotes(prev => [note, ...prev])
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
      setNotes(prev => prev.map(n => n.id === tab.id ? { ...n, title } : n))
      setTabs(prev => {
        const updated = prev.map(t =>
          t._key === activeKey ? { ...t, title, isDirty: true } : t
        )
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => saveTab(activeKey, updated), 1500)
        return updated
      })
    }
  }

  async function openNoteInActiveTab(note: Note) {
    setShowNotesList(false)
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
    setConfirmingDelete(false)
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

  useEffect(() => { setConfirmingDelete(false) }, [activeKey])

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

  async function createFolder() {
    if (!newFolderName.trim()) return
    const res = await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName.trim() })
    })
    const folder = await res.json()
    setFolders(prev => [...prev, folder].sort((a, b) => a.name.localeCompare(b.name)))
    setNewFolderName('')
    setShowNewFolder(false)
  }

  async function renameFolder(id: number) {
    if (!renameFolderName.trim()) return
    const res = await fetch(`/api/folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: renameFolderName.trim() })
    })
    const updated = await res.json()
    setFolders(prev => prev.map(f => f.id === id ? updated : f).sort((a, b) => a.name.localeCompare(b.name)))
    setRenamingFolder(null)
  }

  async function deleteFolder(id: number) {
    if (!confirm('Delete this folder? Notes inside will become unfoldered.')) return
    await fetch(`/api/folders/${id}`, { method: 'DELETE' })
    setFolders(prev => prev.filter(f => f.id !== id))
    setNotes(prev => prev.map(n => n.folder_id === id ? { ...n, folder_id: null } : n))
  }

  async function moveNote(noteId: number, folderId: number | null) {
    await fetch(`/api/notes/${noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_id: folderId })
    })
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, folder_id: folderId } : n))
    setMoveMenuNoteId(null)
  }

  function toggleFolder(id: number) {
    setCollapsedFolders(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

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

  function renderNote(note: Note) {
    const isActive = activeTab?.id === note.id
    return (
      <div key={note.id} className="relative group/note">
        <button
          onClick={() => openNoteInActiveTab(note)}
          className={`w-full text-left px-3 py-2.5 border-b border-stone-100 hover:bg-stone-50 transition-colors ${
            isActive ? 'bg-orange-50 border-l-2 border-l-orange-400' : ''
          }`}
        >
          <p className={`text-sm truncate font-medium pr-6 ${isActive ? 'text-orange-700' : 'text-stone-800'}`}>
            {note.title}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">
            {new Date(note.updated_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </button>
        {/* Move to folder button */}
        <button
          onClick={(e) => { e.stopPropagation(); setMoveMenuNoteId(moveMenuNoteId === note.id ? null : note.id) }}
          className="absolute right-2 top-2.5 md:opacity-0 md:group-hover/note:opacity-100 p-1 rounded hover:bg-stone-200 text-stone-400 transition-all"
        >
          <MoreHorizontal size={12} />
        </button>
        {moveMenuNoteId === note.id && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMoveMenuNoteId(null)} />
            <div className="absolute right-1 top-8 z-50 bg-white border border-stone-200 rounded-lg shadow-lg w-44 overflow-hidden">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider px-3 pt-2.5 pb-1">Move to</p>
              <button
                onClick={() => moveNote(note.id, null)}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                  note.folder_id === null ? 'text-orange-600 bg-orange-50 font-medium' : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                <FileText size={11} /> No folder
              </button>
              {folders.map(f => (
                <button
                  key={f.id}
                  onClick={() => moveNote(note.id, f.id)}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                    note.folder_id === f.id ? 'text-orange-600 bg-orange-50 font-medium' : 'text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <Folder size={11} /> {f.name}
                </button>
              ))}
              <div className="pb-1" />
            </div>
          </>
        )}
      </div>
    )
  }

  // Group notes for display
  const unfoldered = filtered.filter(n => n.folder_id === null)

  return (
    <div className="app-container flex flex-col h-[100dvh] pb-16 md:pb-0 bg-stone-50 overflow-hidden max-w-6xl mx-auto w-full">
      <Sidebar />

      <div className="flex flex-1 overflow-hidden">

      {/* Mobile backdrop for notes list drawer */}
      {showNotesList && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 z-20"
          onClick={() => setShowNotesList(false)}
        />
      )}

      {/* Notes list column */}
      <div className={`
        flex flex-col border-r border-stone-200 shrink-0 overflow-hidden bg-white
        fixed md:relative top-0 bottom-16 md:inset-y-0 left-0 z-30 md:z-auto
        w-72 md:w-60
        shadow-xl md:shadow-none
        transition-transform duration-200 ease-in-out
        ${showNotesList ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>

        {/* Toolbar */}
        <div className="h-11 flex items-center justify-around px-2 border-b border-stone-100 bg-stone-50/80 shrink-0">
          <button
            onClick={createTab}
            title="New note"
            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition-colors"
          >
            <FilePlus size={15} />
          </button>

          <button
            onClick={() => { setShowNewFolder(true); setShowSortMenu(false) }}
            title="New folder"
            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition-colors"
          >
            <FolderPlus size={15} />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowSortMenu(p => !p)}
              title="Sort"
              className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
                showSortMenu ? 'bg-orange-50 text-orange-500' : 'hover:bg-stone-200 text-stone-400 hover:text-stone-700'
              }`}
            >
              <ArrowUpDown size={15} />
            </button>
            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white border border-stone-200 rounded-xl shadow-lg w-44 overflow-hidden">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider px-3 pt-3 pb-1.5">Sort by</p>
                  {([
                    { value: 'updated', label: 'Last modified' },
                    { value: 'created', label: 'Date created' },
                    { value: 'alpha', label: 'Alphabetical' },
                  ] as { value: SortMode; label: string }[]).map(option => (
                    <button
                      key={option.value}
                      onClick={() => { setSortMode(option.value); setShowSortMenu(false) }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                        sortMode === option.value
                          ? 'text-orange-600 bg-orange-50 font-medium'
                          : 'text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {option.label}
                      {sortMode === option.value && (
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                      )}
                    </button>
                  ))}
                  <div className="pb-1.5" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5">
            <Search size={13} className="text-stone-400 shrink-0" />
            <input
              placeholder="Search notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none text-stone-900 placeholder-stone-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-stone-400 hover:text-stone-600">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto">

          {/* New folder input */}
          {showNewFolder && (
            <div className="px-3 py-2 border-b border-stone-100 bg-orange-50/50">
              <input
                autoFocus
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') createFolder()
                  if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName('') }
                }}
                placeholder="Folder name..."
                className="w-full text-xs bg-white border border-stone-200 rounded px-2 py-1.5 outline-none focus:border-orange-300 text-stone-900 placeholder-stone-400"
              />
              <div className="flex gap-1.5 mt-1.5">
                <button onClick={createFolder} className="text-xs px-2 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors">Create</button>
                <button onClick={() => { setShowNewFolder(false); setNewFolderName('') }} className="text-xs px-2 py-1 text-stone-500 hover:text-stone-700 transition-colors">Cancel</button>
              </div>
            </div>
          )}

          {/* Folders */}
          {folders.map(folder => {
            const folderNotes = filtered.filter(n => n.folder_id === folder.id)
            const collapsed = collapsedFolders.has(folder.id)
            return (
              <div key={folder.id}>
                <div className="flex items-center group/folder border-b border-stone-100">
                  <button
                    onClick={() => toggleFolder(folder.id)}
                    className="flex items-center gap-1.5 flex-1 px-3 py-2 text-xs font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors"
                  >
                    <ChevronRight size={12} className={`transition-transform shrink-0 ${collapsed ? '' : 'rotate-90'}`} />
                    {collapsed ? <Folder size={13} className="text-orange-400 shrink-0" /> : <FolderOpen size={13} className="text-orange-400 shrink-0" />}
                    {renamingFolder === folder.id ? (
                      <input
                        autoFocus
                        value={renameFolderName}
                        onChange={e => setRenameFolderName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') renameFolder(folder.id)
                          if (e.key === 'Escape') setRenamingFolder(null)
                          e.stopPropagation()
                        }}
                        onClick={e => e.stopPropagation()}
                        className="flex-1 bg-white border border-orange-300 rounded px-1 py-0.5 outline-none text-stone-900"
                      />
                    ) : (
                      <span className="truncate">{folder.name}</span>
                    )}
                    <span className="ml-auto text-stone-300 font-normal">{folderNotes.length}</span>
                  </button>
                  <div className="flex items-center md:opacity-0 md:group-hover/folder:opacity-100 pr-1 gap-0.5 transition-opacity">
                    <button
                      onClick={() => { setRenamingFolder(folder.id); setRenameFolderName(folder.name) }}
                      className="p-1 rounded hover:bg-stone-200 text-stone-400 text-[10px]"
                      title="Rename"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => deleteFolder(folder.id)}
                      className="p-1 rounded hover:bg-red-50 text-stone-300 hover:text-red-400 transition-colors"
                      title="Delete folder"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
                {!collapsed && (
                  <div className="pl-3">
                    {folderNotes.map(note => renderNote(note))}
                    {folderNotes.length === 0 && (
                      <p className="text-xs text-stone-300 px-3 py-2">Empty folder</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Unfoldered notes */}
          {(folders.length > 0 || unfoldered.length > 0) && (
            <>
              {folders.length > 0 && unfoldered.length > 0 && (
                <p className="text-xs text-stone-400 uppercase tracking-wider px-3 pt-3 pb-1.5 font-medium">
                  Unfiled · {unfoldered.length}
                </p>
              )}
              {folders.length === 0 && (
                <p className="text-xs text-stone-400 uppercase tracking-wider px-3 pt-3 pb-1.5 font-medium">
                  {filtered.length} notes
                </p>
              )}
              {unfoldered.map(note => renderNote(note))}
            </>
          )}

          {filtered.length === 0 && (
            <div className="px-3 py-8 text-center">
              <p className="text-sm text-stone-400">
                {search ? `No notes matching "${search}"` : 'No notes yet'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Tab bar */}
        <div className="flex items-center border-b border-stone-200 bg-white shrink-0 h-11">
          {/* Mobile: toggle notes list */}
          <button
            onClick={() => setShowNotesList(p => !p)}
            className="md:hidden flex items-center justify-center w-11 h-11 shrink-0 border-r border-stone-200 text-stone-400 hover:text-stone-700 transition-colors"
            title="Toggle notes list"
          >
            <List size={16} />
          </button>
          <div className="flex items-center overflow-x-auto flex-1">
            {tabs.map(tab => (
              <button
                key={tab._key}
                onClick={() => setActiveKey(tab._key)}
                className={`relative flex items-center gap-2 px-3 h-11 border-r border-stone-200 text-xs shrink-0 transition-colors group ${
                  activeKey === tab._key
                    ? 'bg-stone-50 text-stone-900 font-medium'
                    : 'text-stone-400 hover:text-stone-700 hover:bg-stone-50'
                }`}
              >
                {activeKey === tab._key && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-orange-500" />
                )}
                <span className="max-w-28 truncate">{tab.title || 'New tab'}</span>
                {tab.isDirty && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                <span
                  onClick={(e) => closeTab(tab._key, e)}
                  className="md:opacity-0 md:group-hover:opacity-100 hover:bg-stone-200 rounded p-0.5 transition-all cursor-pointer ml-0.5"
                >
                  <X size={10} />
                </span>
              </button>
            ))}
            <button
              onClick={createTab}
              className="flex items-center justify-center w-8 h-8 ml-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors shrink-0"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Right side actions */}
          <div className="flex items-center shrink-0 h-full border-l border-stone-200">
            {activeTab && (
              <button
                onClick={() => suggestLinks(activeKey)}
                disabled={activeTab.linking || !activeTab.id}
                className={`flex items-center gap-1.5 px-3 h-full text-xs font-medium transition-colors border-r border-stone-200 ${
                  activeTab.linking
                    ? 'text-orange-400 cursor-wait'
                    : !activeTab.id
                    ? 'text-stone-200 cursor-not-allowed'
                    : 'text-stone-400 hover:text-orange-600 hover:bg-orange-50'
                }`}
              >
                <Link2 size={13} />
                <span className="hidden sm:inline">{activeTab.linking ? 'Thinking...' : 'Suggest Links'}</span>
              </button>
            )}
            {activeTab && (
              <span className="text-xs px-3 hidden sm:block">
                {activeTab.saving
                  ? <span className="text-amber-500">Saving...</span>
                  : activeTab.saved
                  ? <span className="text-green-500">Saved ✓</span>
                  : <span className="text-stone-300">Auto-saves</span>
                }
              </span>
            )}
            {activeTab?.id && (
              confirmingDelete ? (
                <div className="flex items-center gap-1 px-2 border-l border-stone-200">
                  <span className="text-xs text-stone-400">Delete?</span>
                  <button
                    onClick={() => deleteNote(activeTab.id!)}
                    className="text-xs px-2 py-0.5 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    className="text-xs px-2 py-0.5 rounded hover:bg-stone-100 text-stone-500 transition-colors"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingDelete(true)}
                  className="px-3 h-full hover:bg-red-50 text-stone-300 hover:text-red-400 transition-colors border-l border-stone-200"
                >
                  <Trash2 size={13} />
                </button>
              )
            )}
          </div>
        </div>

        {/* Note content */}
        <div className="flex-1 overflow-y-auto bg-white">
          {activeTab ? (
            <div className="px-4 sm:px-8 md:px-10 py-5 md:py-8 max-w-4xl pb-24 md:pb-10">
              <input
                value={activeTab.title}
                onChange={e => handleTitleChange(e.target.value)}
                className="w-full text-2xl md:text-3xl font-bold text-stone-900 outline-none mb-3 bg-transparent placeholder-stone-300"
                placeholder="Untitled"
              />


              {/* Suggest Links panel */}
              {activeTab.suggestions !== null && (
                activeTab.suggestions.length === 0 ? (
                  <div className="mb-4 px-4 py-3 border border-stone-100 rounded-lg bg-stone-50 flex items-center justify-between">
                    <p className="text-xs text-stone-400">No related notes found to link to.</p>
                    <button
                      onClick={() => setTabs(prev => prev.map(t => t._key === activeKey ? { ...t, suggestions: null } : t))}
                      className="text-stone-300 hover:text-stone-500 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="mb-6 p-4 border border-orange-100 rounded-lg bg-orange-50/50">
                    <p className="text-xs font-medium text-orange-600 mb-3 flex items-center gap-1.5">
                      <Link2 size={12} />
                      Suggested Links
                    </p>
                    <div className="flex gap-1.5 flex-wrap mb-4">
                      {activeTab.suggestions.map(title => (
                        <span key={title} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-mono">
                          [[{title}]]
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => insertSuggestedLinks(activeKey)}
                        className="text-xs px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors font-medium"
                      >
                        Insert into note
                      </button>
                      <button
                        onClick={() => setTabs(prev => prev.map(t => t._key === activeKey ? { ...t, suggestions: null } : t))}
                        className="text-xs px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-500 border border-stone-200 rounded-md transition-colors"
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
                  noteTitleSet={noteTitleSet}
                  onWikilinkClick={openNoteByTitle}
                />
              )}

              {!activeTab.id && (
                <p className="text-sm text-stone-300 mt-2">
                  Change the title to start writing...
                </p>
              )}

              {/* Backlinks panel */}
              {activeTab.id && activeTab.backlinks.length > 0 && (
                <div className="mt-12 pt-6 border-t border-stone-100">
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-3">
                    {activeTab.backlinks.length} backlink{activeTab.backlinks.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex flex-col gap-1">
                    {activeTab.backlinks.map(bl => (
                      <button
                        key={bl.id}
                        onClick={() => openNoteByTitle(bl.title)}
                        className="text-left text-sm text-orange-600 hover:text-orange-800 hover:underline"
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
              <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center">
                <FileText size={20} className="text-stone-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-500">No tab open</p>
                <p className="text-xs text-stone-400 mt-0.5">Press + to open a new tab</p>
              </div>
            </div>
          )}
        </div>
      </div>

      </div>
    </div>
  )
}
