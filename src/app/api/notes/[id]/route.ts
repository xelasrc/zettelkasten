import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { extractTextFromContent, generateEmbedding } from '@/lib/embeddings'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const result = await pool.query(
      'SELECT * FROM notes WHERE id = $1',
      [id]
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
  const { id } = await params
  try {
    const { title, content, tags } = await request.json()
    
    const textContent = extractTextFromContent(content)
    const fullText = `${title} ${textContent}`.trim()
    
    let embedding = null
    if (fullText) {
      embedding = await generateEmbedding(fullText)
    }

    const result = await pool.query(
      `UPDATE notes 
       SET title = $1, content = $2, tags = $3, embedding = $4, updated_at = NOW()
       WHERE id = $5 
       RETURNING *`,
      [title, JSON.stringify(content), tags || [], 
       embedding ? JSON.stringify(embedding) : null, id]
    )
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
  const { id } = await params
  try {
    await pool.query('DELETE FROM notes WHERE id = $1', [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting note:', error)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
}