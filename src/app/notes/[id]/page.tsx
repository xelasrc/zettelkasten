'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import nextDynamic from 'next/dynamic'

const Editor = nextDynamic(() => import('@/components/Editor'), { ssr: false })

interface Note {
  id: number
  title: string
  content: unknown
  tags: string[]
}

interface TagSuggestions {
  tags: string[]
  related_concepts: string[]
  summary: string
  suggested_links: string[]
}

export default function NotePage() {
  const { id } = useParams()
  const router = useRouter()
  const [note, setNote] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState<unknown>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tagging, setTagging] = useState(false)
  const [suggestions, setSuggestions] = useState<TagSuggestions | null>(null)

  useEffect(() => {
    fetch(`/api/notes/${id}`)
      .then(res => res.json())
      .then(data => {
        setNote(data)
        setTitle(data.title)
        setContent(data.content)
      })
  }, [id])

  const saveNote = useCallback(async (tagsToSave?: string[]) => {
    setSaving(true)
    await fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        content,
        tags: tagsToSave ?? note?.tags ?? []
      })
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [id, title, content, note?.tags])

  const generateTags = useCallback(async () => {
    setTagging(true)
    setSuggestions(null)
    const res = await fetch('/api/tag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content })
    })
    const data = await res.json()
    setSuggestions(data)
    setTagging(false)
  }, [title, content])

  const acceptTags = useCallback(async () => {
    if (!suggestions) return
    const newTags = suggestions.tags
    setNote(prev => prev ? { ...prev, tags: newTags } : prev)
    await saveNote(newTags)
    setSuggestions(null)
  }, [suggestions, saveNote])

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
            onClick={generateTags}
            disabled={tagging}
            style={{ padding: '0.4rem 1rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', opacity: tagging ? 0.7 : 1 }}
          >
            {tagging ? 'Thinking...' : '✦ AI Tags'}
          </button>
          <button
            onClick={() => saveNote()}
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

      {note.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {note.tags.map(tag => (
            <span key={tag} style={{ fontSize: '0.75rem', background: '#f0f0f0', padding: '3px 10px', borderRadius: '20px' }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {suggestions && (
        <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #6366f1', borderRadius: '8px', background: '#fafafa' }}>
          <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.75rem' }}>✦ AI Suggestions</p>

          <p style={{ fontSize: '0.85rem', color: '#444', marginBottom: '0.75rem', fontStyle: 'italic' }}>
            {suggestions.summary}
          </p>

          <div style={{ marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.4rem' }}>TAGS</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {suggestions.tags.map(tag => (
                <span key={tag} style={{ fontSize: '0.75rem', background: '#ede9fe', color: '#6366f1', padding: '3px 10px', borderRadius: '20px' }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.4rem' }}>RELATED CONCEPTS</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {suggestions.related_concepts.map(concept => (
                <span key={concept} style={{ fontSize: '0.75rem', background: '#f0fdf4', color: '#16a34a', padding: '3px 10px', borderRadius: '20px' }}>
                  {concept}
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.4rem' }}>SUGGESTED LINKS</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {suggestions.suggested_links.map(link => (
                <span key={link} style={{ fontSize: '0.75rem', background: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: '20px' }}>
                  {link}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={acceptTags}
              style={{ padding: '0.4rem 1rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Accept Tags
            </button>
            <button
              onClick={() => setSuggestions(null)}
              style={{ padding: '0.4rem 1rem', background: '#fff', color: '#888', border: '1px solid #e5e5e5', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <Editor initialContent={note.content} onChange={setContent} />
    </div>
  )
}