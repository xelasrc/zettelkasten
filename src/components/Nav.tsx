'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'

export default function Nav() {
  const pathname = usePathname()

  const links = [
    { label: 'Notes', href: '/notes' },
    { label: 'Graph', href: '/graph' },
    { label: 'Chat', href: '/chat' }
  ]

  return (
    <header style={{
      borderBottom: '1px solid #e5e5e5',
      padding: '0 1.5rem',
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      background: '#fff',
      zIndex: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Link href="/notes" style={{
          fontWeight: 600,
          fontSize: '0.95rem',
          letterSpacing: '-0.01em',
          paddingRight: '1.5rem',
          textDecoration: 'none',
          color: '#0a0a0a'
        }}>
          Rhizome
        </Link>
        <nav style={{ display: 'flex', borderLeft: '1px solid #e5e5e5' }}>
          {links.map(item => (
            <Link
              key={item.label}
              href={item.href}
              style={{
                padding: '0 1.25rem',
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none',
                fontSize: '0.85rem',
                color: pathname === item.href ? '#0a0a0a' : '#999',
                borderRight: '1px solid #e5e5e5',
                fontWeight: pathname === item.href ? 500 : 400,
                borderBottom: pathname === item.href ? '2px solid #0a0a0a' : '2px solid transparent'
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <UserButton />
    </header>
  )
}