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

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <>
      <aside className="hidden md:flex flex-col w-52 border-r border-gray-200 bg-white h-screen sticky top-0 shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-gray-200">
          <span className="font-semibold text-sm text-gray-900 tracking-tight">Rhizome</span>
          <span className="ml-1.5 text-xs text-blue-400 font-medium">β</span>
        </div>

        <nav className="flex flex-col gap-0.5 p-2 flex-1">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon size={15} strokeWidth={active ? 2 : 1.5} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-gray-200 flex items-center">
          <UserButton />
        </div>
      </aside>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                active ? 'text-gray-900' : 'text-gray-400'
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