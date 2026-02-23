# MRE Signal Flow UI Specification

**Document:** A-180 D3-React Hybrid Visualization  
**Author:** Steve Jobs (CPO)  
**Date:** 2026-02-23  
**Status:** Draft  

## Overview

The MRE Signal Flow visualization creates an interactive flowchart system for 676+ tickers using D3.js for high-performance graph rendering with React for modal management and UI interactions. The design prioritizes progressive disclosure, intuitive navigation, and real-time responsiveness without compromising browser performance.

## Design Philosophy

### Core Principles
1. **Visual Hierarchy**: Strategy clusters are primary, ticker nodes are secondary
2. **Progressive Disclosure**: Essential info visible, detailed data on demand
3. **Performance First**: Smooth interactions even with 676+ nodes
4. **Contextual Information**: Relevant data appears where users need it
5. **Consistent Language**: Financial terminology users expect

### User Experience Goals
- **Instant Recognition**: Users understand the system state at a glance
- **Effortless Navigation**: Moving between views feels natural
- **Actionable Insights**: Information leads directly to decisions
- **Responsive Feedback**: Every interaction provides immediate visual response

## Component Architecture

### 1. Container Components (React)

#### SignalFlowApp
```tsx
interface SignalFlowAppProps {
  strategies: Strategy[];
  tickers: Ticker[];
  realTimeData: WebSocketConnection;
}

interface SignalFlowAppState {
  currentView: 'overview' | 'strategy' | 'ticker';
  selectedNode: NodeSelection | null;
  filters: FilterState;
  layoutMode: 'force' | 'hierarchical' | 'sector';
}

class SignalFlowApp extends React.Component<SignalFlowAppProps, SignalFlowAppState> {
  private d3Container: React.RefObject<SVGSVGElement>;
  private visualization: D3Visualization;
  
  componentDidMount() {
    // Initialize D3 visualization
    this.visualization = new D3Visualization(
      this.d3Container.current,
      this.props.strategies,
      this.handleNodeClick,
      this.handleNodeHover
    );
  }
  
  render() {
    return (
      <div className="signal-flow-app">
        <Header filters={this.state.filters} onFilterChange={this.handleFilterChange} />
        <div className="visualization-container">
          <svg ref={this.d3Container} className="signal-flow-graph" />
          <ControlPanel 
            layoutMode={this.state.layoutMode}
            onLayoutChange={this.handleLayoutChange}
          />
        </div>
        {this.state.selectedNode && (
          <NodeDetailModal
            node={this.state.selectedNode}
            onClose={this.handleModalClose}
            realTimeData={this.props.realTimeData}
          />
        )}
      </div>
    );
  }
}
```

#### Header Component
```tsx
interface HeaderProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

const Header: React.FC<HeaderProps> = ({ filters, onFilterChange }) => {
  return (
    <header className="signal-flow-header">
      <div className="title-section">
        <h1>Signal Flow</h1>
        <div className="system-status">
          <StatusIndicator type="live" />
          <span>{filters.activeStrategies.length} strategies</span>
          <span>{filters.activeTickers.length} tickers</span>
        </div>
      </div>
      
      <div className="filter-controls">
        <StrategyFilter 
          strategies={filters.availableStrategies}
          selected={filters.activeStrategies}
          onChange={(selected) => onFilterChange({...filters, activeStrategies: selected})}
        />
        
        <PerformanceFilter
          thresholds={filters.performanceThresholds}
          onChange={(thresholds) => onFilterChange({...filters, performanceThresholds: thresholds})}
        />
        
        <SectorFilter
          sectors={filters.availableSectors}
          selected={filters.activeSectors}
          onChange={(selected) => onFilterChange({...filters, activeSectors: selected})}
        />
        
        <SearchInput
          value={filters.searchQuery}
          onChange={(query) => onFilterChange({...filters, searchQuery: query})}
          placeholder="Search tickers..."
        />
      </div>
    </header>
  );
};
```

### 2. D3 Visualization Core

#### D3Visualization Class
```typescript
class D3Visualization {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private container: d3.Selection<SVGGElement, unknown, null, undefined>;
  private simulation: d3.Simulation<NodeData, LinkData>;
  private nodes: NodeData[] = [];
  private links: LinkData[] = [];
  private currentLayout: LayoutType = 'force';
  
  constructor(
    svgElement: SVGSVGElement,
    initialData: GraphData,
    onNodeClick: (node: NodeData) => void,
    onNodeHover: (node: NodeData | null) => void
  ) {
    this.initializeSVG(svgElement);
    this.setupSimulation();
    this.setupEventHandlers(onNodeClick, onNodeHover);
    this.renderInitialData(initialData);
  }
  
  private initializeSVG(element: SVGSVGElement): void {
    this.svg = d3.select(element)
      .attr('viewBox', '0 0 1200 800')
      .call(d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', this.handleZoom.bind(this))
      );
    
    this.container = this.svg.append('g')
      .attr('class', 'visualization-container');
    
    // Add gradient definitions for node styling
    this.addGradientDefinitions();
  }
  
  private setupSimulation(): void {
    this.simulation = d3.forceSimulation<NodeData>()
      .force('link', d3.forceLink<NodeData, LinkData>()
        .id(d => d.id)
        .distance(d => this.getLinkDistance(d))
      )
      .force('charge', d3.forceManyBody()
        .strength(d => this.getNodeCharge(d))
      )
      .force('center', d3.forceCenter(600, 400))
      .force('collision', d3.forceCollide()
        .radius(d => this.getNodeRadius(d) + 5)
      );
  }
}
```

#### Node Rendering System
```typescript
class NodeRenderer {
  private nodeGroups: d3.Selection<SVGGElement, NodeData, SVGGElement, unknown>;
  
  renderNodes(nodes: NodeData[]): void {
    this.nodeGroups = this.container.selectAll('.node-group')
      .data(nodes, d => d.id);
    
    // Enter selection - new nodes
    const enter = this.nodeGroups.enter()
      .append('g')
      .attr('class', 'node-group')
      .call(this.setupNodeInteractions.bind(this));
    
    this.renderStrategyNodes(enter.filter(d => d.type === 'strategy'));
    this.renderTickerNodes(enter.filter(d => d.type === 'ticker'));
    
    // Update selection - existing nodes
    this.updateNodeVisuals(this.nodeGroups.merge(enter));
    
    // Exit selection - removed nodes
    this.nodeGroups.exit()
      .transition()
      .duration(300)
      .attr('opacity', 0)
      .remove();
  }
  
  private renderStrategyNodes(selection: d3.Selection<SVGGElement, StrategyNode, SVGGElement, unknown>): void {
    // Strategy node: large circle with performance indicator ring
    selection.append('circle')
      .attr('class', 'strategy-circle')
      .attr('r', d => this.getStrategyRadius(d));
    
    // Performance ring around strategy
    selection.append('circle')
      .attr('class', 'performance-ring')
      .attr('r', d => this.getStrategyRadius(d) + 8)
      .attr('fill', 'none')
      .attr('stroke-width', 4)
      .attr('stroke', d => this.getPerformanceColor(d.performance));
    
    // Strategy label
    selection.append('text')
      .attr('class', 'strategy-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .text(d => d.name);
    
    // Signal count indicator
    selection.append('circle')
      .attr('class', 'signal-badge')
      .attr('cx', d => this.getStrategyRadius(d) + 15)
      .attr('cy', -10)
      .attr('r', 12);
    
    selection.append('text')
      .attr('class', 'signal-count')
      .attr('x', d => this.getStrategyRadius(d) + 15)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .text(d => d.signalCount);
  }
  
  private renderTickerNodes(selection: d3.Selection<SVGGElement, TickerNode, SVGGElement, unknown>): void {
    // Ticker node: smaller circle with sector color
    selection.append('circle')
      .attr('class', 'ticker-circle')
      .attr('r', d => this.getTickerRadius(d))
      .attr('fill', d => this.getSectorColor(d.sector));
    
    // Price change indicator  
    selection.append('path')
      .attr('class', 'price-indicator')
      .attr('d', d => this.getPriceIndicatorPath(d.priceChange))
      .attr('fill', d => d.priceChange >= 0 ? '#10B981' : '#EF4444');
    
    // Ticker symbol label (shown on hover/zoom)
    selection.append('text')
      .attr('class', 'ticker-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.2em')
      .style('opacity', 0)
      .text(d => d.symbol);
  }
}
```

### 3. Layout Algorithms

#### Force-Directed Layout
```typescript
class ForceDirectedLayout implements LayoutAlgorithm {
  apply(nodes: NodeData[], links: LinkData[]): d3.Simulation<NodeData, LinkData> {
    return d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links)
        .id(d => d.id)
        .distance(this.calculateLinkDistance)
      )
      .force('charge', d3.forceManyBody()
        .strength(-300)
      )
      .force('center', d3.forceCenter(600, 400))
      .force('collision', d3.forceCollide(35));
  }
  
  private calculateLinkDistance(link: LinkData): number {
    // Stronger relationships = shorter distances
    const baseDistance = 100;
    const strength = link.strength || 0.5;
    return baseDistance * (2 - strength);
  }
}
```

#### Hierarchical Layout
```typescript
class HierarchicalLayout implements LayoutAlgorithm {
  apply(nodes: NodeData[], links: LinkData[]): PositionedNode[] {
    // Create hierarchy: Strategies at top, tickers below
    const strategyNodes = nodes.filter(n => n.type === 'strategy');
    const tickerNodes = nodes.filter(n => n.type === 'ticker');
    
    // Position strategies horizontally at top
    strategyNodes.forEach((node, index) => {
      node.fx = (index + 1) * (1200 / (strategyNodes.length + 1));
      node.fy = 150;
    });
    
    // Group tickers by their primary strategy
    const tickersByStrategy = this.groupTickersByStrategy(tickerNodes, links);
    
    // Position tickers in columns below their strategies
    Object.entries(tickersByStrategy).forEach(([strategyId, tickers]) => {
      const strategy = strategyNodes.find(n => n.id === strategyId);
      if (!strategy) return;
      
      tickers.forEach((ticker, index) => {
        ticker.fx = strategy.fx + (index % 3 - 1) * 80; // 3-column grid
        ticker.fy = 300 + Math.floor(index / 3) * 80;
      });
    });
    
    return [...strategyNodes, ...tickerNodes];
  }
}
```

#### Sector Layout
```typescript
class SectorLayout implements LayoutAlgorithm {
  apply(nodes: NodeData[], links: LinkData[]): PositionedNode[] {
    // Group tickers by sector, arrange in clusters
    const tickersBySector = this.groupTickersBySector(nodes);
    const sectors = Object.keys(tickersBySector);
    
    sectors.forEach((sector, sectorIndex) => {
      const sectorAngle = (2 * Math.PI * sectorIndex) / sectors.length;
      const sectorRadius = 200;
      const sectorCenterX = 600 + Math.cos(sectorAngle) * sectorRadius;
      const sectorCenterY = 400 + Math.sin(sectorAngle) * sectorRadius;
      
      const sectorTickers = tickersBySector[sector];
      sectorTickers.forEach((ticker, tickerIndex) => {
        const tickerAngle = (2 * Math.PI * tickerIndex) / sectorTickers.length;
        const tickerRadius = 50;
        
        ticker.fx = sectorCenterX + Math.cos(tickerAngle) * tickerRadius;
        ticker.fy = sectorCenterY + Math.sin(tickerAngle) * tickerRadius;
      });
    });
    
    return nodes;
  }
}
```

### 4. Modal System (React)

#### NodeDetailModal
```tsx
interface NodeDetailModalProps {
  node: NodeSelection;
  onClose: () => void;
  realTimeData: WebSocketConnection;
}

const NodeDetailModal: React.FC<NodeDetailModalProps> = ({ node, onClose, realTimeData }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'signals' | 'attribution'>('overview');
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics | null>(null);
  
  useEffect(() => {
    // Subscribe to real-time updates for this node
    const subscription = realTimeData.subscribe(`attribution:${node.id}`, (metrics) => {
      setRealtimeMetrics(metrics);
    });
    
    return () => subscription.unsubscribe();
  }, [node.id, realTimeData]);
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="node-detail-modal" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <div className="node-title">
            <NodeIcon type={node.type} />
            <h2>{node.name}</h2>
            <LiveIndicator active={realtimeMetrics !== null} />
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </header>
        
        <div className="modal-tabs">
          <TabButton 
            active={activeTab === 'overview'} 
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </TabButton>
          <TabButton 
            active={activeTab === 'signals'} 
            onClick={() => setActiveTab('signals')}
          >
            Signals
          </TabButton>
          <TabButton 
            active={activeTab === 'attribution'} 
            onClick={() => setActiveTab('attribution')}
          >
            Performance
          </TabButton>
        </div>
        
        <div className="modal-content">
          {activeTab === 'overview' && (
            <OverviewTab node={node} metrics={realtimeMetrics} />
          )}
          {activeTab === 'signals' && (
            <SignalsTab nodeId={node.id} realTimeData={realTimeData} />
          )}
          {activeTab === 'attribution' && (
            <AttributionTab nodeId={node.id} metrics={realtimeMetrics} />
          )}
        </div>
      </div>
    </div>
  );
};
```

#### Attribution Tab Component
```tsx
const AttributionTab: React.FC<{ nodeId: string; metrics: RealtimeMetrics | null }> = ({ 
  nodeId, 
  metrics 
}) => {
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '3M'>('1W');
  const [historicalData, setHistoricalData] = useState<AttributionHistory | null>(null);
  
  useEffect(() => {
    // Fetch historical attribution data when timeframe changes
    fetchAttributionHistory(nodeId, timeframe).then(setHistoricalData);
  }, [nodeId, timeframe]);
  
  return (
    <div className="attribution-tab">
      <div className="timeframe-selector">
        {(['1D', '1W', '1M', '3M'] as const).map(tf => (
          <button
            key={tf}
            className={`timeframe-button ${timeframe === tf ? 'active' : ''}`}
            onClick={() => setTimeframe(tf)}
          >
            {tf}
          </button>
        ))}
      </div>
      
      <div className="metrics-grid">
        <MetricCard
          title="Win Rate"
          value={metrics?.winRate}
          format="percentage"
          trend={historicalData?.winRateTrend}
        />
        <MetricCard
          title="Avg Return"
          value={metrics?.avgReturn}
          format="percentage"
          trend={historicalData?.returnTrend}
        />
        <MetricCard
          title="Sharpe Ratio"
          value={metrics?.sharpe}
          format="decimal"
          trend={historicalData?.sharpeTrend}
        />
        <MetricCard
          title="Max Drawdown"
          value={metrics?.maxDrawdown}
          format="percentage"
          trend={historicalData?.drawdownTrend}
          negative={true}
        />
      </div>
      
      <div className="attribution-chart">
        <AttributionChart
          data={historicalData?.chartData}
          timeframe={timeframe}
          loading={!historicalData}
        />
      </div>
      
      <div className="signal-history">
        <h3>Recent Signals</h3>
        <SignalHistoryTable
          signals={historicalData?.recentSignals}
          showOutcomes={true}
        />
      </div>
    </div>
  );
};
```

### 5. Progressive Disclosure System

#### Zoom-Based Detail Levels
```typescript
class ProgressiveDisclosure {
  private zoomThresholds = {
    overview: { min: 0.1, max: 0.5 },    // Show only strategy clusters
    intermediate: { min: 0.5, max: 1.5 }, // Show strategies + major tickers
    detailed: { min: 1.5, max: 4.0 }      // Show all labels and details
  };
  
  updateDetailLevel(zoomLevel: number): void {
    // Strategy labels always visible
    this.svg.selectAll('.strategy-label')
      .style('opacity', 1);
    
    // Ticker labels appear at intermediate zoom
    this.svg.selectAll('.ticker-label')
      .style('opacity', zoomLevel > 0.5 ? 1 : 0);
    
    // Performance rings visible at overview level
    this.svg.selectAll('.performance-ring')
      .style('opacity', zoomLevel < 1.5 ? 1 : 0.3);
    
    // Signal badges scale with zoom
    this.svg.selectAll('.signal-badge')
      .attr('r', zoomLevel < 0.5 ? 8 : 12);
    
    // Price indicators only at high zoom
    this.svg.selectAll('.price-indicator')
      .style('opacity', zoomLevel > 1.0 ? 1 : 0);
  }
}
```

### 6. Real-Time Update System

#### Data Update Manager
```typescript
class DataUpdateManager {
  private updateQueue: UpdateQueue;
  private animationScheduler: AnimationScheduler;
  
  constructor(visualization: D3Visualization, websocket: WebSocketConnection) {
    this.updateQueue = new UpdateQueue();
    this.animationScheduler = new AnimationScheduler();
    
    // Subscribe to real-time data streams
    websocket.subscribe('mre:tick:*', this.handlePriceUpdate.bind(this));
    websocket.subscribe('mre:signals:*', this.handleSignalUpdate.bind(this));
    websocket.subscribe('mre:attribution:*', this.handleAttributionUpdate.bind(this));
  }
  
  private handlePriceUpdate(update: PriceUpdate): void {
    // Queue price change animation
    this.updateQueue.enqueue({
      type: 'price',
      nodeId: update.symbol,
      data: update,
      animation: 'pulse'
    });
    
    this.scheduleProcessing();
  }
  
  private handleSignalUpdate(update: SignalUpdate): void {
    // Queue signal notification animation
    this.updateQueue.enqueue({
      type: 'signal',
      nodeId: update.symbol,
      data: update,
      animation: 'signalFlash'
    });
    
    this.scheduleProcessing();
  }
  
  private scheduleProcessing(): void {
    this.animationScheduler.requestFrame(() => {
      this.processUpdateQueue();
    });
  }
}
```

### 7. Performance Optimization

#### Virtualization Strategy
```typescript
class NodeVirtualization {
  private visibleBounds: BoundingRect;
  private allNodes: NodeData[];
  private visibleNodes: NodeData[];
  
  updateVisibleNodes(zoomTransform: d3.ZoomTransform, viewportSize: Size): void {
    // Calculate visible area with padding
    const padding = 100;
    this.visibleBounds = {
      left: -zoomTransform.x / zoomTransform.k - padding,
      right: (-zoomTransform.x + viewportSize.width) / zoomTransform.k + padding,
      top: -zoomTransform.y / zoomTransform.k - padding,
      bottom: (-zoomTransform.y + viewportSize.height) / zoomTransform.k + padding
    };
    
    // Filter nodes within visible bounds
    this.visibleNodes = this.allNodes.filter(node => 
      this.isNodeVisible(node, this.visibleBounds)
    );
    
    // Update DOM with only visible nodes
    this.renderVisibleNodes(this.visibleNodes);
  }
  
  private isNodeVisible(node: NodeData, bounds: BoundingRect): boolean {
    return node.x >= bounds.left && 
           node.x <= bounds.right &&
           node.y >= bounds.top && 
           node.y <= bounds.bottom;
  }
}
```

### 8. Implementation Timeline

#### Phase 1: Foundation (Week 1-2)
- Basic D3-React component structure
- Simple force-directed layout
- Node rendering system
- Basic click interactions

#### Phase 2: Interactions (Week 3-4)
- Modal system implementation
- Real-time data integration
- Zoom and pan controls
- Filter system

#### Phase 3: Advanced Features (Week 5-6)
- Multiple layout algorithms
- Progressive disclosure system
- Performance optimizations
- Attribution detail views

#### Phase 4: Polish & Performance (Week 7-8)
- Animation system
- Accessibility improvements  
- Load testing with 676 nodes
- Mobile responsiveness

This specification creates a scalable, performant visualization system that handles complex financial data while maintaining intuitive user interactions through thoughtful progressive disclosure and clean React-D3 boundaries.