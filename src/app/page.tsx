import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const { userId } = await auth()
  if (userId) redirect('/notes')

  return (
    <div className="app-container min-h-screen bg-white flex flex-col max-w-6xl mx-auto w-full">
      <header className="h-12 border-b border-stone-200 shrink-0">
        <div className="max-w-3xl mx-auto h-full flex items-center px-6">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-orange-500 tracking-tight">Rhizome</span>
            <span className="text-xs text-orange-500 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded font-medium">β</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-semibold text-stone-900 mb-4 tracking-tight">
            Rhizome
          </h1>

          <p className="text-base text-stone-500 leading-relaxed mb-10">
            Write notes, connect ideas with [[wikilinks]], and chat with your own knowledge base.
          </p>

          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Sign in to Rhizome
          </Link>
        </div>
      </main>

      <footer className="h-12 border-t border-stone-200">
        <div className="max-w-3xl mx-auto h-full flex items-center justify-between px-6">
          <span className="text-xs text-stone-400 whitespace-nowrap">Alexander Wells</span>
          <span className="text-xs text-stone-400 whitespace-nowrap">Self-hosted · Raspberry Pi 5</span>
        </div>
      </footer>
    </div>
  )
}
