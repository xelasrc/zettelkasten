import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await pool.query(
      'SELECT * FROM notes WHERE id = $1',
      [params.id]
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
  { params }: { params: { id: string } }
) {
  try {
    const { title, content, tags } = await request.json()
    const result = await pool.query(
      `UPDATE notes 
       SET title = $1, content = $2, tags = $3, updated_at = NOW()
       WHERE id = $4 
       RETURNING *`,
      [title, content, tags || [], params.id]
    )
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error updating note:', error)
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await pool.query('DELETE FROM notes WHERE id = $1', [params.id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting note:', error)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
}