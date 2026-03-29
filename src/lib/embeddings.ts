export async function generateEmbedding(text: string): Promise<number[]> {
  const ollamaUrl = process.env.OLLAMA_URL ?? 'http://localhost:11434'
  const response = await fetch(`${ollamaUrl}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text',
      prompt: text
    })
  })
  const data = await response.json()
  return data.embedding
}

export function extractWikilinks(content: unknown): string[] {
  const text = extractTextFromContent(content)
  return [...text.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1])
}

export function extractTextFromContent(content: unknown): string {
  if (!content) return ''

  // Handle plain string
  if (typeof content === 'string') return content

  // Handle BlockNote array format
  if (Array.isArray(content)) {
    return content
      .map((block: any) => {
        if (block.content && Array.isArray(block.content)) {
          return block.content
            .filter((item: any) => item.type === 'text')
            .map((item: any) => item.text)
            .join(' ')
        }
        return ''
      })
      .filter(Boolean)
      .join(' ')
  }

  return ''
}