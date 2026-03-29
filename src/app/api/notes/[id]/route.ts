import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import pool from '@/lib/db'
import { generateEmbedding, extractTextFromContent, extractWikilinks } from '@/lib/embeddings'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const result = await pool.query(
      'SELECT * FROM notes WHERE id = $1 AND user_id = $2',
      [id, userId]
    )
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching note:', error)
    return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const { title, content } = await request.json()

    const textContent = extractTextFromContent(content)
    const fullText = `${title} ${textContent}`.trim()
    const links = extractWikilinks(content)

    let embedding = null
    if (fullText) {
      embedding = await generateEmbedding(fullText)
    }

    const result = await pool.query(
      `UPDATE notes
       SET title = $1, content = $2, links = $3, embedding = $4, updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [title, JSON.stringify(content), links, embedding ? JSON.stringify(embedding) : null, id, userId]
    )
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error updating note:', error)
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    await pool.query(
      'DELETE FROM notes WHERE id = $1 AND user_id = $2',
      [id, userId]
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting note:', error)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
}
