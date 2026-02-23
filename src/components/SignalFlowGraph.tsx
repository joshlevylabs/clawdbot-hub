"use client";

import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';

// ============ Types ============

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  type: 'strategy' | 'ticker';
  label: string;
  group?: string;
  assetClass?: string;
  tickerCount?: number;
  avgSignalStrength?: number;
  symbol?: string;
  signal?: 'BUY' | 'HOLD' | 'SELL' | 'WATCH';
  signalStrength?: number;
  currentPrice?: number;
  fearGreed?: number;
  regime?: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  signal: string;
  strength: number;
}

interface GraphData {
  nodes: GraphNode[];
  edges: Array<{ source: string; target: string; signal: string; strength: number }>;
  metrics: {
    totalBuy: number;
    totalHold: number;
    totalSell: number;
    totalWatch?: number;
    fearGreed: number;
    regime: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface Filters {
  assetClass: string;
  signalType: string;
  searchQuery: string;
}

interface SelectedNode {
  id: string;
  type: 'strategy' | 'ticker';
  label: string;
  symbol?: string;
  signal?: 'BUY' | 'HOLD' | 'SELL' | 'WATCH';
  signalStrength?: number;
  currentPrice?: number;
  fearGreed?: number;
  regime?: string;
  assetClass?: string;
  tickerCount?: number;
  avgSignalStrength?: number;
}

interface SignalFlowGraphProps {
  data: GraphData;
  filters: Filters;
  onNodeClick: (node: SelectedNode) => void;
}

// ============ Constants ============

const SIGNAL_COLORS: Record<string, string> = {
  BUY: '#22c55e',
  HOLD: '#f59e0b',
  SELL: '#ef4444',
  WATCH: '#64748b',
};

const ASSET_CLASS_COLORS: Record<string, string> = {
  broad_market: '#3b82f6',
  technology: '#8b5cf6',
  financials: '#06b6d4',
  healthcare: '#ec4899',
  energy: '#f97316',
  real_estate: '#14b8a6',
  international: '#6366f1',
  bonds: '#a78bfa',
  commodities: '#eab308',
};

// ============ Component ============

export default function SignalFlowGraph({ data, filters, onNodeClick }: SignalFlowGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Get actual container dimensions
    const containerRect = containerRef.current.getBoundingClientRect();
    const width = containerRect.width || 900;
    const height = containerRect.height || 650;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Remove any stale tooltips
    d3.selectAll('.signal-flow-tooltip').remove();

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // ---- Filter Data ----
    let filteredNodes = data.nodes.map(d => ({ ...d }));
    let filteredEdges = [...data.edges];

    if (filters.assetClass !== 'all') {
      const ac = filters.assetClass;
      filteredNodes = filteredNodes.filter(n =>
        (n.type === 'strategy' && (n.assetClass === ac || n.group === ac || n.id === `strategy_${ac}`)) ||
        (n.type === 'ticker' && n.group === ac)
      );
    }

    if (filters.signalType !== 'all') {
      filteredNodes = filteredNodes.filter(n =>
        n.type === 'strategy' || n.signal === filters.signalType
      );
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      filteredNodes = filteredNodes.filter(n =>
        n.type === 'strategy' ||
        (n.symbol?.toLowerCase().includes(q)) ||
        n.label.toLowerCase().includes(q)
      );
    }

    // Keep only edges whose both endpoints survive the filter
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    filteredEdges = filteredEdges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

    // Also ensure strategy nodes for any surviving ticker are included
    for (const e of filteredEdges) {
      if (!nodeIds.has(e.source)) {
        const sn = data.nodes.find(n => n.id === e.source);
        if (sn) { filteredNodes.push({ ...sn }); nodeIds.add(sn.id); }
      }
    }

    if (filteredNodes.length === 0) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .style('fill', '#64748b')
        .style('font-size', '16px')
        .text('No matching signals');
      return;
    }

    // ---- Setup ----
    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    // Tooltip
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'signal-flow-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(15, 23, 42, 0.95)')
      .style('color', '#f1f5f9')
      .style('padding', '10px 14px')
      .style('border-radius', '8px')
      .style('border', '1px solid #475569')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', '9999')
      .style('max-width', '220px')
      .style('line-height', '1.5');

    // ---- Build D3 Simulation ----
    // D3 links need node references - use filteredEdges as link data
    const linkData: GraphLink[] = filteredEdges.map(e => ({
      source: e.source,
      target: e.target,
      signal: e.signal,
      strength: e.strength,
    }));

    const simulation = d3.forceSimulation<GraphNode>(filteredNodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(linkData)
        .id(d => d.id)
        .distance(120)
      )
      .force('charge', d3.forceManyBody<GraphNode>()
        .strength(d => d.type === 'strategy' ? -600 : -150)
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<GraphNode>()
        .radius(d => d.type === 'strategy' ? 50 : 22)
      )
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05));

    // ---- Draw Edges ----
    const linkGroup = g.append('g').attr('class', 'links');
    const link = linkGroup.selectAll('line')
      .data(linkData)
      .enter()
      .append('line')
      .style('stroke', d => SIGNAL_COLORS[d.signal] || '#475569')
      .style('stroke-width', d => 1 + d.strength * 2)
      .style('stroke-opacity', 0.4);

    // ---- Draw Nodes ----
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const node = nodeGroup.selectAll<SVGGElement, GraphNode>('g')
      .data(filteredNodes)
      .enter()
      .append('g')
      .style('cursor', 'pointer');

    // Strategy nodes: larger colored circles with label
    node.filter(d => d.type === 'strategy')
      .each(function(d) {
        const el = d3.select(this);
        const r = 30;
        const color = ASSET_CLASS_COLORS[d.assetClass || d.group || ''] || '#64748b';

        // Outer glow
        el.append('circle')
          .attr('r', r + 4)
          .style('fill', 'none')
          .style('stroke', color)
          .style('stroke-width', 1.5)
          .style('stroke-opacity', 0.3);

        // Main circle
        el.append('circle')
          .attr('r', r)
          .style('fill', color)
          .style('fill-opacity', 0.2)
          .style('stroke', color)
          .style('stroke-width', 2);

        // Label (asset class name)
        const label = (d.label || d.assetClass || '').replace(/_/g, ' ');
        // Split into words for wrapping
        const words = label.split(' ');
        if (words.length <= 2) {
          el.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .style('fill', '#e2e8f0')
            .style('font-size', '10px')
            .style('font-weight', '600')
            .style('pointer-events', 'none')
            .text(label.length > 12 ? label.substring(0, 11) + '…' : label);
        } else {
          el.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '-0.3em')
            .style('fill', '#e2e8f0')
            .style('font-size', '9px')
            .style('font-weight', '600')
            .style('pointer-events', 'none')
            .text(words.slice(0, Math.ceil(words.length / 2)).join(' '));
          el.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.9em')
            .style('fill', '#e2e8f0')
            .style('font-size', '9px')
            .style('font-weight', '600')
            .style('pointer-events', 'none')
            .text(words.slice(Math.ceil(words.length / 2)).join(' '));
        }

        // Ticker count badge
        if (d.tickerCount) {
          el.append('circle')
            .attr('cx', r - 4)
            .attr('cy', -(r - 4))
            .attr('r', 9)
            .style('fill', '#1e293b')
            .style('stroke', color)
            .style('stroke-width', 1.5);
          el.append('text')
            .attr('x', r - 4)
            .attr('y', -(r - 4))
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .style('fill', '#f1f5f9')
            .style('font-size', '9px')
            .style('font-weight', 'bold')
            .style('pointer-events', 'none')
            .text(d.tickerCount);
        }
      });

    // Ticker nodes: colored circles with always-visible symbol label
    node.filter(d => d.type === 'ticker')
      .each(function(d) {
        const el = d3.select(this);
        const r = 14;
        const color = SIGNAL_COLORS[d.signal || 'WATCH'] || '#64748b';

        // Circle
        el.append('circle')
          .attr('r', r)
          .style('fill', color)
          .style('fill-opacity', 0.25)
          .style('stroke', color)
          .style('stroke-width', 2);

        // Signal dot in center
        el.append('circle')
          .attr('r', 4)
          .style('fill', color);

        // Symbol label — ALWAYS VISIBLE
        el.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', r + 14)
          .style('fill', '#94a3b8')
          .style('font-size', '10px')
          .style('font-weight', '600')
          .style('pointer-events', 'none')
          .text(d.symbol || d.label);
      });

    // ---- Drag ----
    const drag = d3.drag<SVGGElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = undefined;
        d.fy = undefined;
      });

    node.call(drag);

    // ---- Interactions ----
    node
      .on('mouseenter', (event, d) => {
        const content = d.type === 'strategy'
          ? `<strong>${(d.label || d.assetClass || '').replace(/_/g, ' ')}</strong><br/>
             Tickers: ${d.tickerCount || 0}<br/>
             Avg Strength: ${((d.avgSignalStrength || 0) * 100).toFixed(0)}%`
          : `<strong>${d.symbol}</strong><br/>
             Signal: <span style="color:${SIGNAL_COLORS[d.signal || 'WATCH']}">${d.signal}</span><br/>
             Strength: ${((d.signalStrength || 0) * 100).toFixed(0)}%${d.currentPrice ? `<br/>Price: $${d.currentPrice.toLocaleString()}` : ''}`;

        tooltip
          .html(content)
          .style('opacity', 1)
          .style('left', (event.pageX + 12) + 'px')
          .style('top', (event.pageY - 12) + 'px');

        // Highlight connected edges
        link.style('stroke-opacity', l => {
          const src = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
          const tgt = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
          return (src === d.id || tgt === d.id) ? 0.9 : 0.15;
        });
      })
      .on('mousemove', (event) => {
        tooltip
          .style('left', (event.pageX + 12) + 'px')
          .style('top', (event.pageY - 12) + 'px');
      })
      .on('mouseleave', () => {
        tooltip.style('opacity', 0);
        link.style('stroke-opacity', 0.4);
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick({
          id: d.id,
          type: d.type,
          label: d.label,
          symbol: d.symbol,
          signal: d.signal,
          signalStrength: d.signalStrength,
          currentPrice: d.currentPrice,
          fearGreed: d.fearGreed,
          regime: d.regime,
          assetClass: d.assetClass || d.group,
          tickerCount: d.tickerCount,
          avgSignalStrength: d.avgSignalStrength,
        });
      });

    // ---- Tick ----
    simulation.on('tick', () => {
      // D3 mutates source/target to node objects after forceLink resolves
      link
        .attr('x1', d => (d.source as GraphNode).x || 0)
        .attr('y1', d => (d.source as GraphNode).y || 0)
        .attr('x2', d => (d.target as GraphNode).x || 0)
        .attr('y2', d => (d.target as GraphNode).y || 0);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Auto-fit after simulation settles
    simulation.on('end', () => {
      // Calculate bounding box of all nodes
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      filteredNodes.forEach(n => {
        if (n.x !== undefined && n.y !== undefined) {
          minX = Math.min(minX, n.x - 50);
          minY = Math.min(minY, n.y - 50);
          maxX = Math.max(maxX, n.x + 50);
          maxY = Math.max(maxY, n.y + 50);
        }
      });

      if (minX < Infinity) {
        const bw = maxX - minX;
        const bh = maxY - minY;
        const scale = Math.min(width / bw, height / bh, 1.2) * 0.85;
        const tx = (width - bw * scale) / 2 - minX * scale;
        const ty = (height - bh * scale) / 2 - minY * scale;

        svg.transition()
          .duration(500)
          .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
      }
    });

    return () => {
      tooltip.remove();
      simulation.stop();
    };
  }, [data, filters, onNodeClick]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg ref={svgRef} className="w-full h-full" />
      <div className="absolute bottom-3 right-3 bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-slate-400">
        Scroll to zoom · Drag to pan · Click nodes for details
      </div>
    </div>
  );
}
