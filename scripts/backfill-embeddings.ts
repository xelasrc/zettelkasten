import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load env BEFORE anything else
const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
envFile.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return
  const eqIndex = trimmed.indexOf('=')
  if (eqIndex === -1) return
  const key = trimmed.slice(0, eqIndex).trim()
  const val = trimmed.slice(eqIndex + 1).trim()
  process.env[key] = val
})

// Only import AFTER env is set
import('pg').then(async ({ default: pg }) => {
  const { generateEmbedding, extractTextFromContent } = await import('../src/lib/embeddings')
  
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
  })

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
})