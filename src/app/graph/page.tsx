'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import Sidebar from '@/components/Nav'
import { useRouter } from 'next/navigation'

interface Note {
  id: number
  title: string
  links: string[]
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: number
  title: string
  links: string[]
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
    const titleToId = new Map(nodes.map(n => [n.title, n.id]))

    const links: GraphLink[] = []
    for (const node of nodes) {
      for (const linkedTitle of node.links) {
        const targetId = titleToId.get(linkedTitle)
        if (targetId !== undefined && targetId !== node.id) {
          links.push({ source: node.id, target: targetId, strength: 1 })
        }
      }
    }

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(140).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(45))

    const g = svg.append('g')

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on('zoom', (event) => g.attr('transform', event.transform))

    svg.call(zoom)

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 1.5)

    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .on('mouseenter', (_, d) => setHoveredNote(d))
      .on('mouseleave', () => setHoveredNote(null))
      .on('click', (_, d) => router.push(`/notes?open=${d.id}`))
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
      .attr('r', d => 7 + d.links.length * 2)
      .attr('fill', '#1e40af')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('opacity', 0.85)

    node.append('text')
      .text(d => d.title.length > 22 ? d.title.slice(0, 22) + '…' : d.title)
      .attr('x', 0)
      .attr('y', d => -(12 + d.links.length * 2))
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('fill', '#374151')
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
    <div className="flex h-[100dvh] pb-16 md:pb-0 bg-gray-50 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        <div className="h-14 flex items-center justify-between px-4 sm:px-6 border-b border-gray-200 shrink-0">
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Knowledge Graph</h1>
            <p className="text-xs text-gray-400">{notes.length} notes · connected by [[wikilinks]]</p>
          </div>
          <p className="text-xs text-gray-400 hidden sm:block">Scroll to zoom · drag to pan</p>
          <p className="text-xs text-gray-400 sm:hidden">Pinch to zoom · drag to pan</p>
        </div>

        <div className="flex-1 relative">
          <svg ref={svgRef} className="w-full h-full block" />

          {hoveredNote && (
            <div className="absolute bottom-20 md:bottom-6 left-4 md:left-6 bg-white border border-gray-200 rounded-lg p-3 md:p-4 max-w-xs shadow-sm pointer-events-none">
              <p className="font-semibold text-sm text-gray-900 mb-2">{hoveredNote.title}</p>
              {hoveredNote.links.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {hoveredNote.links.map(link => (
                    <span key={link} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                      [[{link}]]
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">Click to open note</p>
            </div>
          )}

          {notes.length > 0 && notes.every(n => n.links.length === 0) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <p className="text-sm font-medium text-gray-400 mb-1">No connections yet</p>
              <p className="text-xs text-gray-300">Type [[Note Title]] in your notes to connect them</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
