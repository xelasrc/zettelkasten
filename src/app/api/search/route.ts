import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { generateEmbedding } from '@/lib/embeddings'

export async function POST(request: Request) {
  try {
    const { query } = await request.json()
    
    const embedding = await generateEmbedding(query)
    
    const result = await pool.query(
      `SELECT id, title, content, tags,
        1 - (embedding <=> $1::vector) as similarity
       FROM notes
       WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT 5`,
      [JSON.stringify(embedding)]
    )
    
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}