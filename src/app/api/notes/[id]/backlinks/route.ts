import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import pool from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const noteResult = await pool.query(
      'SELECT title FROM notes WHERE id = $1 AND user_id = $2',
      [id, userId]
    )
    if (noteResult.rows.length === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    const title = noteResult.rows[0].title
    const result = await pool.query(
      'SELECT id, title FROM notes WHERE $1 = ANY(links) AND user_id = $2 AND id != $3 ORDER BY updated_at DESC',
      [title, userId, id]
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching backlinks:', error)
    return NextResponse.json({ error: 'Failed to fetch backlinks' }, { status: 500 })
  }
}
