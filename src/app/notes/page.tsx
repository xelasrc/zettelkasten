'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Note {
  id: number
  title: string
  tags: string[]
  created_at: string
  updated_at: string
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])

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

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>My Zettelkasten</h1>
        <button
          onClick={createNote}
          style={{ padding: '0.5rem 1rem', background: '#000', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          New Note
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {notes.map(note => (
          <Link key={note.id} href={`/notes/${note.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ padding: '1rem', border: '1px solid #e5e5e5', borderRadius: '8px', cursor: 'pointer' }}>
              <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{note.title}</div>
              <div style={{ fontSize: '0.8rem', color: '#888' }}>
                {new Date(note.updated_at).toLocaleDateString()}
              </div>
              {note.tags.length > 0 && (
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {note.tags.map(tag => (
                    <span key={tag} style={{ fontSize: '0.75rem', background: '#f0f0f0', padding: '2px 8px', borderRadius: '20px' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
        {notes.length === 0 && (
          <p style={{ color: '#888', textAlign: 'center', marginTop: '2rem' }}>No notes yet. Create your first one!</p>
        )}
      </div>
    </div>
  )
}