'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'

interface Note {
  id: number
  title: string
  tags: string[]
  created_at: string
  updated_at: string
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/notes')
      .then(res => res.json())
      .then(setNotes)
  }, [])

  async function createNote() {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled', content: {} })
    })
    const note = await res.json()
    window.location.href = `/notes/${note.id}`
  }

  const allTags = Array.from(new Set(notes.flatMap(n => n.tags)))

  const filtered = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(search.toLowerCase())
    const matchesTag = selectedTag ? note.tags.includes(selectedTag) : true
    return matchesSearch && matchesTag
  })

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
          <span style={{ fontWeight: 600, fontSize: '0.95rem', letterSpacing: '-0.01em', paddingRight: '1.5rem' }}>
            Rhizome
          </span>
          <nav style={{ display: 'flex', gap: '0', borderLeft: '1px solid #e5e5e5' }}>
            {[{ label: 'Notes', href: '/notes' }, { label: 'Graph', href: '/graph' }].map(item => (
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
                  color: item.label === 'Notes' ? '#0a0a0a' : '#999',
                  borderRight: '1px solid #e5e5e5',
                  fontWeight: item.label === 'Notes' ? 500 : 400,
                  borderBottom: item.label === 'Notes' ? '2px solid #0a0a0a' : '2px solid transparent'
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <UserButton />
          <button
            onClick={createNote}
            style={{
              padding: '0.45rem 1rem',
              background: '#0a0a0a',
              color: '#fff',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            + New Note
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        <aside style={{
          width: '220px',
          borderRight: '1px solid #e5e5e5',
          padding: '1.5rem 1rem',
          flexShrink: 0,
          position: 'sticky',
          top: '56px',
          height: 'calc(100vh - 56px)',
          overflowY: 'auto'
        }}>
          <input
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: '1px solid #e5e5e5',
              fontSize: '0.85rem',
              outline: 'none',
              marginBottom: '1.5rem',
              color: '#0a0a0a',
              background: '#fafafa'
            }}
          />

          <p style={{
            fontSize: '0.7rem',
            letterSpacing: '0.08em',
            color: '#999',
            marginBottom: '0.5rem',
            textTransform: 'uppercase'
          }}>
            All Notes
          </p>
          <button
            onClick={() => setSelectedTag(null)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '0.4rem 0.75rem',
              border: 'none',
              background: selectedTag === null ? '#f4f4f4' : 'transparent',
              color: selectedTag === null ? '#0a0a0a' : '#555',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: selectedTag === null ? 500 : 400,
              borderLeft: selectedTag === null ? '2px solid #0a0a0a' : '2px solid transparent',
              marginBottom: '1rem'
            }}
          >
            All ({notes.length})
          </button>

          {allTags.length > 0 && (
            <>
              <p style={{
                fontSize: '0.7rem',
                letterSpacing: '0.08em',
                color: '#999',
                marginBottom: '0.5rem',
                textTransform: 'uppercase'
              }}>
                Tags
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                    style={{
                      textAlign: 'left',
                      padding: '0.4rem 0.75rem',
                      border: 'none',
                      background: selectedTag === tag ? '#f4f4f4' : 'transparent',
                      color: selectedTag === tag ? '#0a0a0a' : '#555',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: selectedTag === tag ? 500 : 400,
                      borderLeft: selectedTag === tag ? '2px solid #0a0a0a' : '2px solid transparent'
                    }}
                  >
                    # {tag}
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>

        <main style={{ flex: 1 }}>
          <div style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #e5e5e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <p style={{ fontSize: '0.8rem', color: '#999' }}>
              {filtered.length} {filtered.length === 1 ? 'note' : 'notes'}
              {selectedTag && ` tagged #${selectedTag}`}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map(note => (
              <Link key={note.id} href={`/notes/${note.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div
                  style={{
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid #e5e5e5',
                    cursor: 'pointer',
                    background: '#fff',
                    transition: 'background 0.1s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
                    <h3 style={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: '#0a0a0a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {note.title}
                    </h3>
                    {note.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                        {note.tags.slice(0, 3).map(tag => (
                          <span key={tag} style={{
                            fontSize: '0.7rem',
                            background: '#f4f4f4',
                            color: '#555',
                            padding: '2px 8px',
                            border: '1px solid #e5e5e5'
                          }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#999', flexShrink: 0 }}>
                    {new Date(note.updated_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </Link>
            ))}
            {filtered.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                color: '#999',
                borderBottom: '1px solid #e5e5e5'
              }}>
                <p style={{ marginBottom: '0.5rem', fontWeight: 500, color: '#555' }}>No notes yet</p>
                <p style={{ fontSize: '0.85rem' }}>Create your first note to get started</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}