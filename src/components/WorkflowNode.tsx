"use client";

import { forwardRef } from 'react';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Filter, 
  Zap, 
  Target, 
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface WorkflowNodeProps {
  name: string;
  description: string;
  inputCount: number;
  outputCount: number;
  pendingCount?: number;
  confirmedCount?: number;
  onClick: () => void;
  nodeType?: 'input' | 'filter' | 'modifier' | 'output' | 'strategy' | 'consensus' | 'persistence';
  version?: string;
  className?: string;
  style?: React.CSSProperties;
  isActive?: boolean;
  isPending?: boolean;
}

const WorkflowNode = forwardRef<HTMLDivElement, WorkflowNodeProps>(({
  name,
  description,
  inputCount,
  outputCount,
  pendingCount,
  confirmedCount,
  onClick,
  nodeType = 'filter',
  version,
  className = '',
  style,
  isActive = false,
  isPending = false
}, ref) => {
  
  // Color schemes and icons based on node type
  const getNodeConfig = () => {
    switch (nodeType) {
      case 'input':
        return {
          bg: 'bg-slate-800/90',
          border: 'border-blue-500/40',
          hoverBorder: 'hover:border-blue-400/60',
          icon: <Activity className="w-3.5 h-3.5 text-blue-400" />,
          iconBg: 'bg-blue-500/20',
          accent: 'text-blue-400'
        };
      case 'output':
        return {
          bg: 'bg-slate-800/90',
          border: 'border-emerald-500/40',
          hoverBorder: 'hover:border-emerald-400/60',
          icon: <Target className="w-3.5 h-3.5 text-emerald-400" />,
          iconBg: 'bg-emerald-500/20',
          accent: 'text-emerald-400'
        };
      case 'strategy':
        return {
          bg: 'bg-slate-800/90',
          border: isPending ? 'border-amber-500/40' : 'border-slate-600/40',
          hoverBorder: isPending ? 'hover:border-amber-400/60' : 'hover:border-slate-500/60',
          icon: <Zap className="w-3.5 h-3.5 text-amber-400" />,
          iconBg: 'bg-amber-500/20',
          accent: isPending ? 'text-amber-400' : 'text-slate-400'
        };
      case 'consensus':
        return {
          bg: 'bg-slate-800/90',
          border: 'border-purple-500/40',
          hoverBorder: 'hover:border-purple-400/60',
          icon: <CheckCircle className="w-3.5 h-3.5 text-purple-400" />,
          iconBg: 'bg-purple-500/20',
          accent: 'text-purple-400'
        };
      case 'persistence':
        return {
          bg: 'bg-slate-800/90',
          border: isPending ? 'border-amber-500/40' : 'border-slate-600/40',
          hoverBorder: isPending ? 'hover:border-amber-400/60' : 'hover:border-slate-500/60',
          icon: <Clock className="w-3.5 h-3.5 text-amber-400" />,
          iconBg: 'bg-amber-500/20',
          accent: isPending ? 'text-amber-400' : 'text-slate-400'
        };
      case 'modifier':
        return {
          bg: 'bg-slate-800/90',
          border: 'border-orange-500/40',
          hoverBorder: 'hover:border-orange-400/60',
          icon: <TrendingUp className="w-3.5 h-3.5 text-orange-400" />,
          iconBg: 'bg-orange-500/20',
          accent: 'text-orange-400'
        };
      default: // filter
        return {
          bg: 'bg-slate-800/90',
          border: 'border-slate-600/40',
          hoverBorder: 'hover:border-slate-500/60',
          icon: <Filter className="w-3.5 h-3.5 text-slate-400" />,
          iconBg: 'bg-slate-500/20',
          accent: 'text-slate-400'
        };
    }
  };

  const config = getNodeConfig();
  const filteredCount = inputCount - outputCount;

  return (
    <div
      ref={ref}
      className={`
        ${config.bg} ${config.border} ${config.hoverBorder}
        relative rounded-xl border-2 p-4 cursor-pointer 
        transition-all duration-200 hover:shadow-lg hover:shadow-black/20
        min-w-[160px] max-w-[200px]
        ${isActive ? 'ring-2 ring-primary-500/50' : ''}
        ${className}
      `}
      style={style}
      onClick={onClick}
    >
      {/* Input connector dot */}
      {nodeType !== 'input' && (
        <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-600 border-2 border-slate-700 rounded-full" />
      )}
      
      {/* Output connector dot */}
      {nodeType !== 'output' && (
        <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-600 border-2 border-slate-700 rounded-full" />
      )}

      {/* Icon */}
      <div className={`${config.iconBg} rounded-lg p-2 w-fit mb-3`}>
        {config.icon}
      </div>

      {/* Node title */}
      <h3 className="text-sm font-bold text-slate-200 mb-1 leading-tight">
        {name}
      </h3>

      {/* Node description/subtitle */}
      <p className="text-xs text-slate-400 mb-3 leading-tight">
        {description}
      </p>

      {/* Metrics */}
      <div className="space-y-1.5">
        {nodeType === 'strategy' && (confirmedCount !== undefined || pendingCount !== undefined) ? (
          <>
            {(confirmedCount || 0) > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Confirmed:</span>
                <span className="text-emerald-400 font-bold">{confirmedCount}</span>
              </div>
            )}
            {(pendingCount || 0) > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Pending:</span>
                <span className="text-amber-400 font-bold">{pendingCount}</span>
              </div>
            )}
          </>
        ) : nodeType === 'persistence' && (confirmedCount !== undefined || pendingCount !== undefined) ? (
          <>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Input:</span>
              <span className="text-slate-300 font-medium">{inputCount}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-emerald-500">Confirmed:</span>
              <span className="text-emerald-400 font-bold">{confirmedCount || 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-amber-500">Pending:</span>
              <span className="text-amber-400 font-bold">{pendingCount || 0}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Input:</span>
              <span className="text-slate-300 font-medium">{inputCount}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Output:</span>
              <span className={`font-bold ${config.accent}`}>{outputCount}</span>
            </div>
            {filteredCount > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Filtered:</span>
                <span className="text-red-400 font-medium">{filteredCount}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Version badge */}
      {version && (
        <div className="mt-3">
          <span className="inline-block bg-slate-700/50 text-slate-500 px-2 py-0.5 rounded text-[9px] font-medium">
            v{version}
          </span>
        </div>
      )}

      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
});

WorkflowNode.displayName = 'WorkflowNode';

export default WorkflowNode;