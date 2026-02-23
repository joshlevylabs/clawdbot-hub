"use client";

import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';

interface GraphNode {
  id: string;
  type: 'strategy' | 'ticker';
  label: string;
  assetClass?: string;
  tickerCount?: number;
  avgSignalStrength?: number;
  symbol?: string;
  signal?: 'BUY' | 'HOLD' | 'SELL' | 'WATCH';
  signalStrength?: number;
  currentPrice?: number;
  fearGreed?: number;
  regime?: string;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

interface GraphLink {
  source: string;
  target: string;
  signal: string;
  strength: number;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphLink[];
  metrics: {
    totalBuy: number;
    totalHold: number;
    totalSell: number;
    totalWatch?: number;
    fearGreed: number;
    regime: string;
  };
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

const SIGNAL_COLORS = {
  BUY: '#22c55e',
  HOLD: '#f59e0b',
  SELL: '#ef4444',
  WATCH: '#64748b',
};

const STRATEGY_COLORS = {
  'Equity': '#3b82f6',
  'Fixed Income': '#8b5cf6',
  'Commodities': '#f97316',
  'Digital Assets': '#06b6d4',
};

export default function SignalFlowGraph({ data, filters, onNodeClick }: SignalFlowGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);

  const filterData = useCallback((data: GraphData) => {
    let filteredNodes = [...data.nodes];
    let filteredLinks = [...data.edges];

    // Filter by asset class
    if (filters.assetClass !== 'all') {
      const strategyIds = filteredNodes
        .filter(n => n.type === 'strategy' && n.assetClass === filters.assetClass)
        .map(n => n.id);
      
      filteredNodes = filteredNodes.filter(n => 
        n.type === 'strategy' ? strategyIds.includes(n.id) : 
        filteredLinks.some(l => strategyIds.includes(l.source) && l.target === n.id)
      );
    }

    // Filter by signal type
    if (filters.signalType !== 'all') {
      filteredNodes = filteredNodes.filter(n =>
        n.type === 'strategy' || n.signal === filters.signalType
      );
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filteredNodes = filteredNodes.filter(n =>
        n.type === 'strategy' || 
        (n.symbol && n.symbol.toLowerCase().includes(query)) ||
        n.label.toLowerCase().includes(query)
      );
    }

    // Filter links to match filtered nodes
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    filteredLinks = filteredLinks.filter(l => 
      nodeIds.has(l.source) && nodeIds.has(l.target)
    );

    return { nodes: filteredNodes, links: filteredLinks };
  }, [filters]);

  const getNodeRadius = useCallback((node: GraphNode) => {
    if (node.type === 'strategy') {
      return 25 + (node.tickerCount || 0) * 2;
    }
    return 12;
  }, []);

  const getNodeColor = useCallback((node: GraphNode) => {
    if (node.type === 'strategy') {
      return STRATEGY_COLORS[node.assetClass as keyof typeof STRATEGY_COLORS] || '#64748b';
    }
    return SIGNAL_COLORS[node.signal as keyof typeof SIGNAL_COLORS] || '#64748b';
  }, []);

  const getLinkWidth = useCallback((link: GraphLink) => {
    return 1 + link.strength * 4;
  }, []);

  const setupTooltip = useCallback(() => {
    return d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(15, 23, 42, 0.95)')
      .style('color', '#f1f5f9')
      .style('padding', '12px')
      .style('border-radius', '8px')
      .style('border', '1px solid #334155')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('backdrop-filter', 'blur(4px)')
      .style('z-index', '1000');
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const width = 1200;
    const height = 700;
    const { nodes, links } = filterData(data);

    // Create copies for D3 to mutate
    nodesRef.current = nodes.map(d => ({ ...d }));
    linksRef.current = links.map(d => ({ ...d }));

    // Setup SVG
    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('background', 'transparent');

    const container = svg.append('g');

    // Setup zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Setup tooltip
    const tooltip = setupTooltip();

    // Create force simulation
    const simulation = d3.forceSimulation<GraphNode>(nodesRef.current)
      .force('link', d3.forceLink<GraphNode, GraphLink>(linksRef.current)
        .id(d => d.id)
        .distance(d => {
          const sourceNode = nodesRef.current.find(n => n.id === d.source);
          const targetNode = nodesRef.current.find(n => n.id === d.target);
          if (sourceNode?.type === 'strategy' && targetNode?.type === 'ticker') {
            return 100 + (1 - d.strength) * 50; // Stronger signals closer
          }
          return 150;
        })
      )
      .force('charge', d3.forceManyBody<GraphNode>()
        .strength((d: GraphNode) => d.type === 'strategy' ? -800 : -200)
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<GraphNode>()
        .radius((d: GraphNode) => getNodeRadius(d) + 5)
      );

    simulationRef.current = simulation;

    // Create arrow markers for edges
    const defs = svg.append('defs');
    
    Object.entries(SIGNAL_COLORS).forEach(([signal, color]) => {
      defs.append('marker')
        .attr('id', `arrow-${signal.toLowerCase()}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 8)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .style('fill', color)
        .style('opacity', 0.8);
    });

    // Create links
    const link = container.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(linksRef.current)
      .enter()
      .append('line')
      .style('stroke', d => SIGNAL_COLORS[d.signal as keyof typeof SIGNAL_COLORS] || '#64748b')
      .style('stroke-width', d => getLinkWidth(d))
      .style('stroke-opacity', 0.6)
      .attr('marker-end', d => `url(#arrow-${d.signal.toLowerCase()})`);

    // Create node groups
    const nodeGroup = container.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodesRef.current)
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer');

    // Add circles for nodes
    nodeGroup.append('circle')
      .attr('r', d => getNodeRadius(d))
      .style('fill', d => getNodeColor(d))
      .style('stroke', d => d.type === 'strategy' ? '#fff' : 'none')
      .style('stroke-width', d => d.type === 'strategy' ? 2 : 0)
      .style('opacity', 0.9);

    // Add strategy labels
    nodeGroup
      .filter(d => d.type === 'strategy')
      .append('text')
      .text(d => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .style('fill', '#fff')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none');

    // Add ticker count badges for strategies
    const strategyBadges = nodeGroup
      .filter(d => d.type === 'strategy' && !!d.tickerCount)
      .append('g')
      .attr('class', 'strategy-badge');

    strategyBadges
      .append('circle')
      .attr('cx', d => getNodeRadius(d) + 15)
      .attr('cy', -10)
      .attr('r', 10)
      .style('fill', '#1e293b')
      .style('stroke', '#475569')
      .style('stroke-width', 1);

    strategyBadges
      .append('text')
      .attr('x', d => getNodeRadius(d) + 15)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .text(d => d.tickerCount || 0)
      .style('fill', '#f1f5f9')
      .style('font-size', '8px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none');

    // Add ticker symbols (shown on zoom/hover)
    nodeGroup
      .filter(d => d.type === 'ticker')
      .append('text')
      .text(d => d.symbol || d.label.slice(0, 4))
      .attr('text-anchor', 'middle')
      .attr('dy', '1.5em')
      .style('fill', '#cbd5e1')
      .style('font-size', '8px')
      .style('font-weight', 'bold')
      .style('opacity', 0)
      .style('pointer-events', 'none')
      .attr('class', 'ticker-label');

    // Add drag behavior
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

    nodeGroup.call(drag);

    // Add hover interactions
    nodeGroup
      .on('mouseenter', (event, d) => {
        // Show ticker labels on hover
        if (d.type === 'strategy') {
          nodeGroup.selectAll('.ticker-label').style('opacity', 0.8);
        }

        // Show tooltip
        const content = d.type === 'strategy' ? 
          `<strong>${d.label}</strong><br/>
           Asset Class: ${d.assetClass}<br/>
           Tickers: ${d.tickerCount}<br/>
           Avg Signal: ${(d.avgSignalStrength || 0 * 100).toFixed(1)}%` :
          `<strong>${d.symbol}</strong><br/>
           Signal: ${d.signal}<br/>
           Strength: ${(d.signalStrength || 0 * 100).toFixed(1)}%<br/>
           Price: $${d.currentPrice?.toLocaleString()}`;

        tooltip
          .style('opacity', 1)
          .html(content)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseleave', () => {
        // Hide ticker labels
        nodeGroup.selectAll('.ticker-label').style('opacity', 0);
        
        // Hide tooltip
        tooltip.style('opacity', 0);
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
          assetClass: d.assetClass,
          tickerCount: d.tickerCount,
          avgSignalStrength: d.avgSignalStrength,
        });
      });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => {
          const sourceNode = nodesRef.current.find(n => n.id === d.source);
          return sourceNode?.x || 0;
        })
        .attr('y1', d => {
          const sourceNode = nodesRef.current.find(n => n.id === d.source);
          return sourceNode?.y || 0;
        })
        .attr('x2', d => {
          const targetNode = nodesRef.current.find(n => n.id === d.target);
          return targetNode?.x || 0;
        })
        .attr('y2', d => {
          const targetNode = nodesRef.current.find(n => n.id === d.target);
          return targetNode?.y || 0;
        });

      nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Zoom controls via scroll
    svg.on('wheel.zoom', null); // Remove default zoom
    svg.call(zoom);

    // Cleanup function
    return () => {
      tooltip.remove();
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [data, filters, onNodeClick, filterData, getNodeRadius, getNodeColor, getLinkWidth, setupTooltip]);

  return (
    <div className="w-full h-full relative">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ background: 'transparent' }}
      />
      <div className="absolute bottom-4 right-4 bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-slate-300">
        Scroll to zoom • Drag to pan • Click nodes for details
      </div>
    </div>
  );
}