import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const { userId } = await auth()
  if (userId) redirect('/notes')

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="h-14 flex items-center justify-between px-6 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-900 tracking-tight">Rhizome</span>
          <span className="text-xs text-blue-500 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded font-medium">β</span>
        </div>
        <Link href="/sign-in" className="text-sm text-gray-400 hover:text-gray-900 transition-colors">
          Sign in →
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-semibold text-gray-900 mb-4 tracking-tight">
            Rhizome
          </h1>

          <p className="text-base text-gray-500 leading-relaxed mb-10">
            A self-hosted Zettelkasten with AI tagging, semantic search,
            and a local RAG chatbot. Built on a Raspberry Pi 5.
          </p>

          <div className="flex flex-col gap-4 mb-12">
            {[
              { color: 'bg-blue-500', label: 'AI-powered tagging and connections' },
              { color: 'bg-green-500', label: 'Local RAG chatbot - runs on device' },
              { color: 'bg-red-400', label: 'Self-hosted - your data stays yours' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${item.color} shrink-0`} />
                <p className="text-sm text-gray-500">{item.label}</p>
              </div>
            ))}
          </div>

          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Sign in to Rhizome
          </Link>
        </div>
      </main>

      <footer className="h-12 flex items-center justify-between px-6 border-t border-gray-100">
        <span className="text-xs text-gray-400 whitespace-nowrap">Alexander Wells</span>
        <span className="text-xs text-gray-400 whitespace-nowrap">Self-hosted · Raspberry Pi 5</span>
      </footer>
    </div>
  )
}