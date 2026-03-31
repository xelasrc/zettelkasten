'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { FileText, GitBranch, MessageSquare } from 'lucide-react'

const navItems = [
  { label: 'Notes', href: '/notes', icon: FileText },
  { label: 'Graph', href: '/graph', icon: GitBranch },
  { label: 'Chat', href: '/chat', icon: MessageSquare },
]

export default function Nav() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop: top bar */}
      <header className="hidden md:block shrink-0 bg-[#fdf9f4] border-b border-stone-200 pt-3">
        <div className="max-w-6xl mx-auto flex items-center px-6 gap-5 pb-3">
          <span className="text-sm font-bold text-orange-500 tracking-tight">Rhizome</span>

          <nav className="flex items-center gap-0.5">
            {navItems.map(({ label, href, icon: Icon }) => {
              const active = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    active
                      ? 'bg-orange-50 text-orange-600 font-medium'
                      : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
                  }`}
                >
                  <Icon size={14} strokeWidth={active ? 2 : 1.5} />
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto">
            <UserButton />
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-[#fdf9f4] border-t border-stone-200 z-50 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                active ? 'text-orange-500' : 'text-stone-400'
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2 : 1.5} />
              {label}
            </Link>
          )
        })}
        <div className="flex-1 flex flex-col items-center gap-1 py-3">
          <UserButton />
        </div>
      </nav>
    </>
  )
}
