import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import pool from '@/lib/db'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { name } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const result = await pool.query(
    'UPDATE folders SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING id, name',
    [name.trim(), id, userId]
  )
  if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(result.rows[0])
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  // Notes in this folder become unfoldered (ON DELETE SET NULL)
  await pool.query(
    'DELETE FROM folders WHERE id = $1 AND user_id = $2',
    [id, userId]
  )
  return NextResponse.json({ success: true })
}
