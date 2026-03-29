import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import pool from '@/lib/db'
import { generateEmbedding } from '@/lib/embeddings'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { query } = await request.json()
    const embedding = await generateEmbedding(query)

    const result = await pool.query(
      `SELECT id, title, content, tags,
        1 - (embedding <=> $1::vector) as similarity
       FROM notes
       WHERE embedding IS NOT NULL AND user_id = $2
       ORDER BY embedding <=> $1::vector
       LIMIT 5`,
      [JSON.stringify(embedding), userId]
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}