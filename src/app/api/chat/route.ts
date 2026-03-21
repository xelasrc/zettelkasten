import { NextResponse } from 'next/server'
import { generateEmbedding, extractTextFromContent } from '@/lib/embeddings'
import pool from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { message } = await request.json()

    const embedding = await generateEmbedding(message)
    const result = await pool.query(
      `SELECT id, title, content, tags,
        1 - (embedding <=> $1::vector) as similarity
       FROM notes
       WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT 5`,
      [JSON.stringify(embedding)]
    )

    const relevantNotes = result.rows.filter(n => n.similarity > 0.3)

    const notesContext = relevantNotes.map((note: any) => {
      const text = extractTextFromContent(note.content)
      return `--- Note: ${note.title} ---\n${text}`
    }).join('\n\n')

    const prompt = relevantNotes.length > 0
      ? `You are a helpful assistant for a personal knowledge base called Rhizome. Answer the user's question using ONLY the notes provided below. If the answer isn't in the notes, say so clearly. Be concise and direct.

NOTES:
${notesContext}

USER QUESTION: ${message}`
      : `You are a helpful assistant for a personal knowledge base called Rhizome. The user asked: "${message}". There are no relevant notes in their knowledge base about this topic. Tell them this and suggest they create a note about it.`

    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:3b',
        prompt,
        stream: false
      })
    })

    const ollamaData = await ollamaResponse.json()

    return NextResponse.json({
      answer: ollamaData.response,
      sources: relevantNotes.map((n: any) => ({ id: n.id, title: n.title, similarity: n.similarity }))
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }
}