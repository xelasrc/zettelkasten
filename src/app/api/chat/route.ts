import { auth } from '@clerk/nextjs/server'
import { generateEmbedding, extractTextFromContent } from '@/lib/embeddings'
import pool from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return new Response('Unauthorized', { status: 401 })

  try {
    const { messages } = await request.json()
    const lastUserMessage = messages[messages.length - 1].content

    const embedding = await generateEmbedding(lastUserMessage)
    const result = await pool.query(
      `SELECT id, title, content,
        1 - (embedding <=> $1::vector) as similarity
       FROM notes
       WHERE embedding IS NOT NULL AND user_id = $2
       ORDER BY embedding <=> $1::vector
       LIMIT 10`,
      [JSON.stringify(embedding), userId]
    )

    const aboveThreshold = result.rows.filter((n: any) => n.similarity > 0.3)

    // Cut at the first similarity gap > 0.15 so we don't include loosely related notes
    const relevantNotes = aboveThreshold.filter((_: any, i: number) => {
      if (i === 0) return true
      return aboveThreshold[i - 1].similarity - aboveThreshold[i].similarity <= 0.15
    })

    const notesContext = relevantNotes.map((note: any) => {
      const text = extractTextFromContent(note.content)
      return `--- Note: ${note.title} ---\n${text}`
    }).join('\n\n')

    const noteTitles = relevantNotes.map((n: any) => n.title)

    const systemPrompt = relevantNotes.length > 0
      ? `You are a helpful assistant for a personal knowledge base called Rhizome. Answer the user's question using ONLY the notes provided below. If the answer isn't in the notes, say so clearly. Use markdown formatting in your responses.

NOTES:
${notesContext}

After your response, on a new line write exactly: RHIZOME_USED: followed by the titles of notes you actually referenced, separated by " | ". Only include notes you genuinely used. This line will be hidden from the user. Example: RHIZOME_USED: My Note | Another Note`
      : `You are a helpful assistant for a personal knowledge base called Rhizome. There are no relevant notes about this topic. Tell the user clearly and suggest they create a note about it.`

    const sources = relevantNotes.map((n: any) => ({
      id: n.id,
      title: n.title,
      similarity: n.similarity
    }))

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ sources })}\n\n`))

          const claudeStream = anthropic.messages.stream({
            model: 'claude-haiku-4-5',
            max_tokens: 2048,
            system: systemPrompt,
            messages: messages.map((m: any) => ({ role: m.role, content: m.content }))
          })

          for await (const event of claudeStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`))
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (err) {
          console.error('Stream error:', err)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`))
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Content-Type-Options': 'nosniff',
      }
    })
  } catch (error) {
    console.error('Chat error:', error)
    return new Response(JSON.stringify({ error: 'Chat failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
