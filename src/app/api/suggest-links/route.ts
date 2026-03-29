import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import Anthropic from '@anthropic-ai/sdk'
import { extractTextFromContent } from '@/lib/embeddings'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { title, content, allTitles } = await request.json()
    const contentText = extractTextFromContent(content)

    if (!allTitles?.length) return NextResponse.json({ links: [] })

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `You are a Zettelkasten assistant. Given the note below, suggest which notes from the list it should link to.

NOTE TITLE: ${title}
NOTE CONTENT: ${contentText}

AVAILABLE NOTES:
${allTitles.map((t: string) => `- ${t}`).join('\n')}

Return ONLY a JSON array of note titles (max 5, taken exactly from the list above) that are most relevant to link from this note. No explanation, no markdown.`
      }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '[]'
    const cleaned = responseText.replace(/```json\n?|\n?```/g, '').trim()
    const links: string[] = JSON.parse(cleaned)

    return NextResponse.json({ links: links.filter((l: string) => allTitles.includes(l)) })
  } catch (error) {
    console.error('Error suggesting links:', error)
    return NextResponse.json({ error: 'Failed to suggest links' }, { status: 500 })
  }
}
