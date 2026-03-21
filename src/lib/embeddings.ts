export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('http://localhost:11434/api/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'nomic-embed-text',
      prompt: text
    })
  })
  const data = await response.json()
  return data.embedding
}

export function extractTextFromContent(content: unknown): string {
  if (!content || typeof content !== 'object') return ''
  
  const blocks = (content as any)
  if (!Array.isArray(blocks)) return ''
  
  return blocks
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