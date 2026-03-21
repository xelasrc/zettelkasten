import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const { userId } = await auth()
  if (userId) redirect('/notes')

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <header style={{
        borderBottom: '1px solid #e5e5e5',
        padding: '0 2rem',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ fontWeight: 600, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
          Rhizome
        </span>
        <Link href="/sign-in" style={{
          padding: '0.4rem 1rem',
          background: '#0a0a0a',
          color: '#fff',
          textDecoration: 'none',
          fontSize: '0.85rem',
          fontWeight: 500
        }}>
          Sign In
        </Link>
      </header>

      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem'
      }}>
        <div style={{ maxWidth: '480px', width: '100%' }}>
          <h1 style={{
            fontSize: 'clamp(2.5rem, 6vw, 3.5rem)',
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            marginBottom: '1.5rem',
            color: '#0a0a0a'
          }}>
            Rhizome.
          </h1>

          <p style={{
            fontSize: '1rem',
            color: '#555',
            marginBottom: '2.5rem',
            lineHeight: 1.7,
            maxWidth: '380px'
          }}>
            A Zettelkasten powered by AI. Write notes, connect ideas,
            and chat with your own knowledge base.
          </p>

          <Link href="/sign-in" style={{
            display: 'inline-block',
            padding: '0.75rem 2rem',
            background: '#0a0a0a',
            color: '#fff',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 500
          }}>
            Get Started →
          </Link>
        </div>
      </main>

      <footer style={{
        borderTop: '1px solid #e5e5e5',
        padding: '1.25rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: '0.8rem', color: '#999' }}>Alexander Wells</span>
        <span style={{ fontSize: '0.8rem', color: '#999' }}>Self-hosted on Raspberry Pi 5</span>
      </footer>
    </div>
  )
}