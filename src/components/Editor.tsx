'use client'

import { useEffect, useImperativeHandle, forwardRef, useRef } from 'react'
import { BlockNoteView } from '@blocknote/mantine'
import { useCreateBlockNote, SuggestionMenuController } from '@blocknote/react'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

export interface EditorHandle {
  appendWikilinks: (titles: string[]) => void
}

interface EditorProps {
  initialContent: unknown
  onChange: (content: unknown) => void
  noteTitles: string[]
  noteTitleSet: Set<string>
  onWikilinkClick: (title: string) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildDecorations(doc: any, noteTitleSet: Set<string>) {
  const decorations: Decoration[] = []
  const re = /\[\[([^\]]+)\]\]/g
  doc.descendants((node: { isText: boolean; text: string }, pos: number) => {
    if (!node.isText || !node.text) return
    let match: RegExpExecArray | null
    re.lastIndex = 0
    while ((match = re.exec(node.text)) !== null) {
      const start = pos + match.index
      const end = start + match[0].length
      const title = match[1]
      const resolved = noteTitleSet.has(title)
      decorations.push(
        Decoration.inline(start, end, {
          class: resolved ? 'wikilink wikilink-resolved' : 'wikilink wikilink-unresolved',
          'data-wikilink': title,
        })
      )
    }
  })
  return DecorationSet.create(doc, decorations)
}

const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { initialContent, onChange, noteTitles, noteTitleSet, onWikilinkClick },
  ref
) {
  const noteTitleSetRef = useRef(noteTitleSet)
  const onWikilinkClickRef = useRef(onWikilinkClick)
  const wikilinkPluginKey = useRef(new PluginKey('wikilinks')).current

  useEffect(() => { noteTitleSetRef.current = noteTitleSet }, [noteTitleSet])
  useEffect(() => { onWikilinkClickRef.current = onWikilinkClick }, [onWikilinkClick])

  const wikilinkExtension = Extension.create({
    name: 'wikilink',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: wikilinkPluginKey,
          state: {
            init(_, state) {
              return buildDecorations(state.doc, noteTitleSetRef.current)
            },
            apply(tr) {
              return buildDecorations(tr.doc, noteTitleSetRef.current)
            },
          },
          props: {
            decorations(state) {
              return wikilinkPluginKey.getState(state)
            },
            handleClick(_view, _pos, event) {
              const target = event.target as HTMLElement
              const el = target.closest('[data-wikilink]')
              if (el) {
                const title = el.getAttribute('data-wikilink')
                if (title) {
                  onWikilinkClickRef.current(title)
                  return true
                }
              }
              return false
            },
          },
        }),
      ]
    },
  })

  const editor = useCreateBlockNote({
    initialContent: Array.isArray(initialContent) ? initialContent : undefined,
    _tiptapOptions: {
      extensions: [wikilinkExtension],
    },
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

  // Force re-decoration when noteTitleSet changes by dispatching a no-op transaction
  useEffect(() => {
    const tiptap = (editor as unknown as { _tiptapEditor: { view: { dispatch: (tr: unknown) => void; state: { tr: unknown } } } })._tiptapEditor
    if (tiptap?.view) {
      tiptap.view.dispatch(tiptap.view.state.tr)
    }
  }, [editor, noteTitleSet])

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
