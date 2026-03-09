import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { 
  transformToGraphData, 
  calculateFlowMetrics,
  type GraphData,
  type GraphNode,
  type GraphEdge
} from "@/lib/signal-flow-transform";

async function loadMRESignals(request: NextRequest) {
  try {
    const origin = request.headers.get('host');
    const protocol = origin?.includes('localhost') ? 'http' : 'https';
    const res = await fetch(`${protocol}://${origin}/api/trading/signals?type=core`);
    if (!res.ok) throw new Error(`Signal data unavailable (${res.status})`);
    return await res.json();
  } catch (error) {
    console.error("Failed to load MRE signals:", error);
    return null;
  }
}

/**
 * Filter nodes and edges based on view and filter parameters
 */
function filterGraphData(
  graphData: GraphData,
  view?: string,
  filterAssetClass?: string,
  symbol?: string
): GraphData {
  let { nodes, edges } = graphData;

  // Filter by asset class
  if (filterAssetClass) {
    nodes = nodes.filter(node => 
      node.group === filterAssetClass || 
      (node.type === 'strategy' && node.id === `strategy_${filterAssetClass}`)
    );
    
    const nodeIds = new Set(nodes.map(n => n.id));
    edges = edges.filter(edge => 
      nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );
  }

  // Filter by specific symbol
  if (symbol) {
    const tickerNodeId = `ticker_${symbol}`;
    const strategyNodeId = nodes.find(n => 
      n.type === 'ticker' && n.id === tickerNodeId
    )?.group;
    
    if (strategyNodeId) {
      nodes = nodes.filter(node => 
        node.id === tickerNodeId || 
        node.id === `strategy_${strategyNodeId}`
      );
      
      edges = edges.filter(edge => 
        edge.target === tickerNodeId || edge.source === `strategy_${strategyNodeId}`
      );
    }
  }

  // Filter by view type
  if (view === 'overview') {
    // Show only strategy nodes for high-level view
    nodes = nodes.filter(node => node.type === 'strategy');
    edges = []; // No edges in overview
  } else if (view === 'strategy' && filterAssetClass) {
    // Already filtered above by asset class
  } else if (view === 'ticker' && symbol) {
    // Already filtered above by symbol
  }

  return {
    ...graphData,
    nodes,
    edges
  };
}

/**
 * GET /api/signal-flow
 * 
 * Query parameters:
 * - view: overview | strategy | ticker (default: full)
 * - filter: asset_class name (e.g., "technology", "broad_market")  
 * - symbol: specific ticker symbol (e.g., "SPY", "QQQ")
 */
export async function GET(request: NextRequest) {
  try {
    const mreSignals = await loadMRESignals(request);
    if (!mreSignals) {
      return NextResponse.json(
        { error: "Failed to load MRE signals data" },
        { status: 500 }
      );
    }

    // Transform to graph data
    const graphData = transformToGraphData(mreSignals);

    // Apply filters based on query parameters
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") || undefined;
    const filterAssetClass = searchParams.get("filter") || undefined;
    const symbol = searchParams.get("symbol")?.toUpperCase() || undefined;

    const filteredData = filterGraphData(graphData, view, filterAssetClass, symbol);

    // Add metadata about the filtering
    const response = {
      ...filteredData,
      meta: {
        totalNodes: graphData.nodes.length,
        totalEdges: graphData.edges.length,
        filteredNodes: filteredData.nodes.length,
        filteredEdges: filteredData.edges.length,
        view,
        filter: filterAssetClass,
        symbol,
        generated: new Date().toISOString(),
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Error in signal-flow API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}