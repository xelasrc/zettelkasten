'use client'

import { useEffect } from 'react'
import { BlockNoteView } from '@blocknote/mantine'
import { useCreateBlockNote } from '@blocknote/react'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'

interface EditorProps {
  initialContent: unknown
  onChange: (content: unknown) => void
}

export default function Editor({ initialContent, onChange }: EditorProps) {
  const editor = useCreateBlockNote({
    initialContent: Array.isArray(initialContent) ? initialContent : undefined
  })

  useEffect(() => {
    const unsubscribe = editor.onChange(() => {
      onChange(editor.document)
    })
    return () => unsubscribe()
  }, [editor, onChange])

  return <BlockNoteView editor={editor} theme="light" />
}