import pool from '../src/lib/db'
import { generateEmbedding, extractTextFromContent } from '../src/lib/embeddings'

async function backfill() {
  const result = await pool.query(
    'SELECT id, title, content FROM notes WHERE embedding IS NULL'
  )

  console.log(`Found ${result.rows.length} notes without embeddings`)

  for (const note of result.rows) {
    try {
      const textContent = extractTextFromContent(note.content)
      const fullText = `${note.title} ${textContent}`.trim()

      if (!fullText) {
        console.log(`Skipping note ${note.id} - no text content`)
        continue
      }

      const embedding = await generateEmbedding(fullText)

      await pool.query(
        'UPDATE notes SET embedding = $1 WHERE id = $2',
        [JSON.stringify(embedding), note.id]
      )

      console.log(`✓ Embedded note ${note.id}: ${note.title}`)
    } catch (error) {
      console.error(`✗ Failed note ${note.id}:`, error)
    }
  }

  console.log('Done!')
  process.exit(0)
}

backfill()