'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import Nav from '@/components/Nav'
import { useRouter } from 'next/navigation'

interface Note {
  id: number
  title: string
  tags: string[]
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: number
  title: string
  tags: string[]
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  strength: number
}

export default function GraphPage() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [hoveredNote, setHoveredNote] = useState<Note | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/notes')
      .then(res => res.json())
      .then(setNotes)
  }, [])

  useEffect(() => {
    if (!notes.length || !svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight

    const nodes: GraphNode[] = notes.map(n => ({ ...n }))

    const links: GraphLink[] = []
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const sharedTags = nodes[i].tags.filter(t => nodes[j].tags.includes(t))
        if (sharedTags.length > 0) {
          links.push({ source: nodes[i], target: nodes[j], strength: sharedTags.length })
        }
      }
    }

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).distance(120).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(40))

    const g = svg.append('g')

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#e5e5e5')
      .attr('stroke-width', d => d.strength + 0.5)

    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .on('mouseenter', (_, d) => setHoveredNote(d))
      .on('mouseleave', () => setHoveredNote(null))
      .on('click', (_, d) => router.push(`/notes/${d.id}`))
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          }) as any
      )

    node.append('circle')
      .attr('r', d => 6 + d.tags.length * 2)
      .attr('fill', '#0a0a0a')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)

    node.append('text')
      .text(d => d.title.length > 20 ? d.title.slice(0, 20) + '…' : d.title)
      .attr('x', 0)
      .attr('y', d => -(10 + d.tags.length * 2))
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('fill', '#555')
      .attr('pointer-events', 'none')

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!)

      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => { simulation.stop() }
  }, [notes, router])

  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{
          position: 'absolute',
          top: '1rem',
          right: '1.5rem',
          fontSize: '0.8rem',
          color: '#999',
          zIndex: 5,
          pointerEvents: 'none'
        }}>
          {notes.length} notes · scroll to zoom · drag to pan
        </div>

        <svg
          ref={svgRef}
          style={{ width: '100%', height: 'calc(100vh - 56px)', display: 'block' }}
        />

        {hoveredNote && (
          <div style={{
            position: 'absolute',
            bottom: '1.5rem',
            left: '1.5rem',
            background: '#fff',
            border: '1px solid #e5e5e5',
            padding: '1rem 1.25rem',
            maxWidth: '280px',
            pointerEvents: 'none'
          }}>
            <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>{hoveredNote.title}</p>
            {hoveredNote.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {hoveredNote.tags.map(tag => (
                  <span key={tag} style={{
                    fontSize: '0.7rem',
                    background: '#f4f4f4',
                    color: '#555',
                    padding: '2px 8px',
                    border: '1px solid #e5e5e5'
                  }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.5rem' }}>Click to open</p>
          </div>
        )}

        {notes.length > 0 && notes.every(n => n.tags.length === 0) && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#999',
            pointerEvents: 'none'
          }}>
            <p style={{ fontWeight: 500, color: '#555', marginBottom: '0.5rem' }}>No connections yet</p>
            <p style={{ fontSize: '0.85rem' }}>Add tags to your notes to see them connect</p>
          </div>
        )}
      </div>
    </div>
  )
}