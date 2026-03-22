import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = { 
  title: {
    default: 'Rhizome',
    template: '%s · Rhizome'
  },
  description: 'A self-hosted Zettelkasten with AI tagging, semantic search, and a local RAG chatbot.',
  authors: [{ name: 'Alexander Wells' }],
  keywords: ['notes', 'zettelkasten', 'knowledge base', 'AI', 'RAG'],
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Rhizome',
    description: 'A self-hosted Zettelkasten with AI tagging and a local RAG chatbot.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}