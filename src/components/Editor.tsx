'use client'

import { useEffect, useImperativeHandle, forwardRef } from 'react'
import { BlockNoteView } from '@blocknote/mantine'
import { useCreateBlockNote, SuggestionMenuController } from '@blocknote/react'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'

export interface EditorHandle {
  appendWikilinks: (titles: string[]) => void
}

interface EditorProps {
  initialContent: unknown
  onChange: (content: unknown) => void
  noteTitles: string[]
}

const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { initialContent, onChange, noteTitles },
  ref
) {
  const editor = useCreateBlockNote({
    initialContent: Array.isArray(initialContent) ? initialContent : undefined
  })

  useImperativeHandle(ref, () => ({
    appendWikilinks: (titles: string[]) => {
      const blocks = titles.map(title => ({
        type: 'paragraph' as const,
        content: [{ type: 'text' as const, text: `[[${title}]]`, styles: {} }]
      }))
      const lastBlock = editor.document[editor.document.length - 1]
      editor.insertBlocks(blocks, lastBlock, 'after')
    }
  }))

  useEffect(() => {
    const unsubscribe = editor.onChange(() => {
      onChange(editor.document)
    })
    return () => unsubscribe()
  }, [editor, onChange])

  return (
    <BlockNoteView editor={editor} theme="light">
      <SuggestionMenuController
        triggerCharacter="["
        minQueryLength={0}
        shouldOpen={(tr) => {
          const { from } = tr.selection
          const charBeforeCursor = tr.doc.textBetween(Math.max(0, from - 1), from, '')
          return charBeforeCursor === '['
        }}
        getItems={async (query) => {
          return noteTitles
            .filter(t => t.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 10)
            .map(title => ({
              title,
              onItemClick: () => {
                // First [ is already in the document; BlockNote removes the trigger [
                // and query on selection, so we only need to insert [title]]
                editor.insertInlineContent([
                  { type: 'text', text: `[${title}]]`, styles: {} }
                ])
              }
            }))
        }}
      />
    </BlockNoteView>
  )
})

export default Editor
