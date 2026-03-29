// Backfills the links column for all existing notes by parsing [[wikilinks]] from content.
// Run once after adding the links column:
//   node scripts/backfill-links.js

require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

function extractText(content) {
  if (!content || !Array.isArray(content)) return ''
  return content
    .map(block => {
      if (block.content && Array.isArray(block.content)) {
        return block.content
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join(' ')
      }
      return ''
    })
    .filter(Boolean)
    .join(' ')
}

function extractWikilinks(content) {
  const text = extractText(content)
  return [...text.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1])
}

async function main() {
  const { rows } = await pool.query('SELECT id, content FROM notes')
  console.log(`Backfilling links for ${rows.length} notes...`)

  let updated = 0
  for (const row of rows) {
    const links = extractWikilinks(row.content)
    await pool.query('UPDATE notes SET links = $1 WHERE id = $2', [links, row.id])
    if (links.length > 0) {
      console.log(`  Note ${row.id}: ${links.length} link(s) → [${links.join(', ')}]`)
      updated++
    }
  }

  console.log(`Done. ${updated}/${rows.length} notes had wikilinks.`)
  await pool.end()
}

main().catch(err => { console.error(err); process.exit(1) })
