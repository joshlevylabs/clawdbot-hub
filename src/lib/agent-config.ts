// Agent configuration for badges and color mapping
// Matches AdvisorCards.tsx configuration

export interface AgentConfig {
  id: string;
  name: string;
  emoji: string;
  borderColor: string;
  textColor: string;
  bgColor: string;
}

export const AGENT_CONFIGS: Record<string, AgentConfig> = {
  'chris-vermeulen': {
    id: 'chris-vermeulen',
    name: 'Chris Vermeulen',
    emoji: '🎯',
    borderColor: 'border-amber-500',
    textColor: 'text-amber-400',
    bgColor: 'bg-amber-600/20',
  },
  'warren-buffett': {
    id: 'warren-buffett',
    name: 'Warren Buffett',
    emoji: '🦉',
    borderColor: 'border-emerald-500',
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-600/20',
  },
  'peter-schiff': {
    id: 'peter-schiff',
    name: 'Peter Schiff',
    emoji: '🥇',
    borderColor: 'border-yellow-500',
    textColor: 'text-yellow-400',
    bgColor: 'bg-yellow-600/20',
  },
  'raoul-pal': {
    id: 'raoul-pal',
    name: 'Raoul Pal',
    emoji: '🌊',
    borderColor: 'border-cyan-500',
    textColor: 'text-cyan-400',
    bgColor: 'bg-cyan-600/20',
  },
  'peter-lynch': {
    id: 'peter-lynch',
    name: 'Peter Lynch',
    emoji: '📈',
    borderColor: 'border-violet-500',
    textColor: 'text-violet-400',
    bgColor: 'bg-violet-600/20',
  },
  'ray-dalio': {
    id: 'ray-dalio',
    name: 'Ray Dalio',
    emoji: '⚖️',
    borderColor: 'border-orange-500',
    textColor: 'text-orange-400',
    bgColor: 'bg-orange-600/20',
  },
  'user': {
    id: 'user',
    name: 'My Portfolio',
    emoji: '👤',
    borderColor: 'border-slate-500',
    textColor: 'text-slate-300',
    bgColor: 'bg-slate-600/20',
  },
};

export function getAgentConfig(accountId: string | null): AgentConfig {
  if (!accountId) {
    return AGENT_CONFIGS['user'];
  }
  return AGENT_CONFIGS[accountId] || AGENT_CONFIGS['user'];
}

export function getAgentDisplayName(accountId: string | null): string {
  const config = getAgentConfig(accountId);
  return config.name;
}

// AgentBadge component moved to a separate .tsx file
// This file only contains utility functions and types