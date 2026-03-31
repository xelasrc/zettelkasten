'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState, useCallback } from 'react'
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
  pinned?: boolean
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  strength: number
}

export default function GraphPage() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [hoveredNote, setHoveredNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const routerRef = useRef(router)
  useEffect(() => { routerRef.current = router }, [router])

  // Refs so ResizeObserver can update the live simulation without rebuilding
  const simRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null)
  const dimRef = useRef({ width: 0, height: 0 })

  useEffect(() => {
    fetch('/api/notes')
      .then(res => res.json())
      .then(data => { setNotes(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const buildGraph = useCallback(() => {
    if (!notes.length || !svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight
    dimRef.current = { width, height }

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

    const nodeRadius = (d: GraphNode) => 7 + d.links.length * 2.5

    const linkedIds = new Set<number>()
    for (const l of links) {
      linkedIds.add(l.source as number)
      linkedIds.add(l.target as number)
    }

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(70).strength(0.8))
      .force('charge', d3.forceManyBody().strength(-180).distanceMax(200))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.25))
      .force('radial', d3.forceRadial(
        (d: any) => linkedIds.has(d.id) ? Math.min(width, height) * 0.15 : Math.min(width, height) * 0.22,
        width / 2, height / 2
      ).strength(0.18))
      .force('collision', d3.forceCollide((d: any) => nodeRadius(d) + 10))
      .alphaDecay(0.03)

    simRef.current = simulation

    const defs = svg.append('defs')
    const filter = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur')
    const merge = filter.append('feMerge')
    merge.append('feMergeNode').attr('in', 'blur')
    merge.append('feMergeNode').attr('in', 'SourceGraphic')

    const g = svg.append('g')

    let currentZoomK = 1

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
        currentZoomK = event.transform.k
        label.attr('opacity', currentZoomK >= 0.6 ? 1 : 0)
      })

    svg.call(zoom)

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#d6d3d1')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.7)

    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => {
        setHoveredNote(d)

        const neighbourIds = new Set<number>([d.id])
        for (const l of links) {
          const s = (l.source as GraphNode).id
          const t = (l.target as GraphNode).id
          if (s === d.id) neighbourIds.add(t)
          if (t === d.id) neighbourIds.add(s)
        }

        node.select('circle').attr('opacity', (n: any) => neighbourIds.has(n.id) ? 1 : 0.15)
        link
          .attr('stroke-opacity', (l: any) => {
            const s = (l.source as GraphNode).id
            const t = (l.target as GraphNode).id
            return s === d.id || t === d.id ? 1 : 0.05
          })
          .attr('stroke', (l: any) => {
            const s = (l.source as GraphNode).id
            const t = (l.target as GraphNode).id
            return s === d.id || t === d.id ? '#f97316' : '#d6d3d1'
          })
        label.attr('opacity', (n: any) => {
          if (currentZoomK < 0.6) return 0
          return neighbourIds.has(n.id) ? 1 : 0
        })

        d3.select(event.currentTarget).select('circle')
          .attr('filter', 'url(#glow)')
          .attr('stroke', '#fdba74')
          .attr('stroke-width', 3)
          .attr('opacity', 1)
      })
      .on('mouseleave', (event, d) => {
        setHoveredNote(null)
        node.select('circle').attr('opacity', 1)
        link.attr('stroke-opacity', 0.7).attr('stroke', '#d6d3d1')
        label.attr('opacity', currentZoomK >= 0.6 ? 1 : 0)
        // use d directly from event args — avoids datum lookup on child element
        d3.select(event.currentTarget).select('circle')
          .attr('filter', null)
          .attr('stroke', d.pinned ? '#fbbf24' : '#fff')
          .attr('stroke-width', 1.5)
      })
      .on('click', (_, d) => routerRef.current.push(`/notes?open=${d.id}`))
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
          .on('end', (_, d) => {
            // use node selection filtered by id — event.sourceEvent.currentTarget is unreliable
            const circle = node.filter((n: any) => n.id === d.id).select('circle')
            if (d.pinned) {
              d.pinned = false
              d.fx = null
              d.fy = null
              circle.attr('stroke', '#fff')
            } else {
              d.pinned = true
              circle.attr('stroke', '#fbbf24')
            }
          }) as any
      )

    node.append('circle')
      .attr('r', nodeRadius)
      .attr('fill', '#f97316')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)

    const label = node.append('text')
      .text(d => d.title.length > 20 ? d.title.slice(0, 20) + '…' : d.title)
      .attr('x', 0)
      .attr('y', d => nodeRadius(d) + 13)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('fill', '#78716c')
      .attr('font-weight', '500')
      .attr('pointer-events', 'none')
      .attr('opacity', 1)

    simulation.on('tick', () => {
      const { width: w, height: h } = dimRef.current
      for (const d of nodes) {
        const r = nodeRadius(d) + 8
        d.x = Math.max(r, Math.min(w - r, d.x!))
        d.y = Math.max(r, Math.min(h - r, d.y!))
      }
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!)
      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => { simulation.stop() }
  }, [notes])

  useEffect(() => {
    const cleanup = buildGraph()
    return cleanup
  }, [buildGraph])

  // ResizeObserver: update dims and nudge the live simulation — no full rebuild
  useEffect(() => {
    if (!svgRef.current) return
    const observer = new ResizeObserver(() => {
      if (!svgRef.current || !simRef.current) return
      const w = svgRef.current.clientWidth
      const h = svgRef.current.clientHeight
      dimRef.current = { width: w, height: h }
      simRef.current
        .force('center', d3.forceCenter(w / 2, h / 2).strength(0.25))
        .alpha(0.3)
        .restart()
    })
    observer.observe(svgRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="app-container flex flex-col h-[100dvh] pb-16 md:pb-0 bg-stone-50 overflow-hidden max-w-6xl mx-auto w-full">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        <div className="h-14 flex items-center justify-between px-4 sm:px-6 border-b border-stone-200 shrink-0">
          <div>
            <h1 className="text-sm font-semibold text-stone-900">Knowledge Graph</h1>
            <p className="text-xs text-stone-400">{notes.length} notes · connected by [[wikilinks]]</p>
          </div>
          <p className="text-xs text-stone-400 hidden sm:block">Scroll to zoom · drag to pin · drag again to unpin</p>
          <p className="text-xs text-stone-400 sm:hidden">Pinch to zoom · drag to pin · drag again to unpin</p>
        </div>

        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
            </div>
          )}

          <svg ref={svgRef} className="w-full h-full block" />

          {hoveredNote && (
            <div className="absolute bottom-20 md:bottom-6 left-4 md:left-6 bg-white border border-stone-200 rounded-lg p-3 md:p-4 max-w-xs shadow-sm pointer-events-none">
              <p className="font-semibold text-sm text-stone-900 mb-2">{hoveredNote.title}</p>
              {hoveredNote.links.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {hoveredNote.links.map(link => (
                    <span key={link} className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full border border-orange-100">
                      [[{link}]]
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-stone-400 mt-2">Click to open note</p>
            </div>
          )}

          {!loading && notes.length > 0 && notes.every(n => n.links.length === 0) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <p className="text-sm font-medium text-stone-400 mb-1">No connections yet</p>
              <p className="text-xs text-stone-300">Type [[Note Title]] in your notes to connect them</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
