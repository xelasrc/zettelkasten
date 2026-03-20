'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const Editor = dynamic(() => import('@/components/Editor'), { ssr: false })

interface Note {
  id: number
  title: string
  content: unknown
  tags: string[]
}

export default function NotePage() {
  const { id } = useParams()
  const router = useRouter()
  const [note, setNote] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState<unknown>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`/api/notes/${id}`)
      .then(res => res.json())
      .then(data => {
        setNote(data)
        setTitle(data.title)
        setContent(data.content)
      })
  }, [id])

  const saveNote = useCallback(async () => {
    setSaving(true)
    await fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, tags: note?.tags || [] })
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [id, title, content, note?.tags])

  const deleteNote = useCallback(async () => {
    if (!confirm('Delete this note?')) return
    await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    router.push('/notes')
  }, [id, router])

  if (!note) return <div style={{ padding: '2rem' }}>Loading...</div>

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <Link href="/notes" style={{ color: '#888', textDecoration: 'none', fontSize: '0.9rem' }}>← Back</Link>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: '#888' }}>
            {saving ? 'Saving...' : saved ? 'Saved ✓' : ''}
          </span>
          <button
            onClick={saveNote}
            style={{ padding: '0.4rem 1rem', background: '#000', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            Save
          </button>
          <button
            onClick={deleteNote}
            style={{ padding: '0.4rem 1rem', background: '#fff', color: '#e00', border: '1px solid #e00', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            Delete
          </button>
        </div>
      </div>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        style={{ width: '100%', fontSize: '1.8rem', fontWeight: 700, border: 'none', outline: 'none', marginBottom: '1.5rem', background: 'transparent' }}
        placeholder="Untitled"
      />
      <Editor initialContent={note.content} onChange={setContent} />
    </div>
  )
}