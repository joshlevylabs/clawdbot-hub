import { getAgentConfig } from '@/lib/agent-config';

interface AgentBadgeProps {
  accountId: string | null;
  compact?: boolean;
}

export function AgentBadge({ accountId, compact = false }: AgentBadgeProps) {
  const config = getAgentConfig(accountId);
  const size = compact ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-0.5';
  
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-medium border ${config.borderColor} ${config.textColor} ${config.bgColor} ${size}`}
    >
      <span className={compact ? 'text-xs' : ''}>{config.emoji}</span>
      {!compact && <span>{config.name}</span>}
    </span>
  );
}