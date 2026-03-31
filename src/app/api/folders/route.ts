import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import pool from '@/lib/db'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await pool.query(
    'SELECT id, name FROM folders WHERE user_id = $1 ORDER BY name ASC',
    [userId]
  )
  return NextResponse.json(result.rows)
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const result = await pool.query(
    'INSERT INTO folders (user_id, name) VALUES ($1, $2) RETURNING id, name',
    [userId, name.trim()]
  )
  return NextResponse.json(result.rows[0])
}
