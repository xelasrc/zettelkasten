import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(request: Request) {
  try {
    const { title, content } = await request.json()

    const contentText = JSON.stringify(content)

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a Zettelkasten assistant. Analyze the note below and return ONLY a JSON object with no explanation, no markdown, no preamble.

The JSON must contain:
- tags: array of 3-6 lowercase hyphenated tags
- related_concepts: array of 3 related concepts not explicitly mentioned in the note
- summary: one sentence summary
- suggested_links: array of 2-3 note titles this should connect to

NOTE TITLE: ${title}

NOTE CONTENT: ${contentText}

Respond with only the JSON object.`
        }
      ]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    const cleaned = responseText.replace(/```json\n?|\n?```/g, '').trim()
    const suggestions = JSON.parse(cleaned)
    
    return NextResponse.json(suggestions)
  } catch (error) {
    console.error('Error generating tags:', error)
    return NextResponse.json({ error: 'Failed to generate tags' }, { status: 500 })
  }
}