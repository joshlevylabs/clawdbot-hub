import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "backlog" | "in-progress" | "review" | "done";
  priority: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
}

export interface Connection {
  id: string;
  name: string;
  type: "github" | "google" | "anthropic" | "openai" | "slack" | "telegram" | "custom";
  status: "connected" | "disconnected" | "error";
  lastSync?: string;
  apiKey?: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  trigger: string;
  enabled: boolean;
  usageCount: number;
  lastUsed?: string;
}

export interface UsageRecord {
  date: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  model: string;
}

interface HubStore {
  // Tasks
  tasks: Task[];
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, status: Task["status"]) => void;

  // Connections
  connections: Connection[];
  addConnection: (conn: Omit<Connection, "id">) => void;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  deleteConnection: (id: string) => void;

  // Skills
  skills: Skill[];
  addSkill: (skill: Omit<Skill, "id" | "usageCount">) => void;
  updateSkill: (id: string, updates: Partial<Skill>) => void;
  deleteSkill: (id: string) => void;

  // Usage
  usage: UsageRecord[];
  addUsage: (record: UsageRecord) => void;
}

export const useHubStore = create<HubStore>()(
  persist(
    (set) => ({
      // Initial tasks
      tasks: [
        {
          id: "1",
          title: "Build SOT MVP",
          description: "Adversarial GTM simulation engine",
          status: "done",
          priority: "high",
          createdAt: "2026-01-26T14:00:00Z",
          updatedAt: "2026-01-26T17:00:00Z",
        },
        {
          id: "2",
          title: "Build Clawdbot Hub",
          description: "Command center dashboard",
          status: "in-progress",
          priority: "high",
          createdAt: "2026-01-26T17:30:00Z",
          updatedAt: "2026-01-26T17:30:00Z",
        },
      ],

      // Initial connections
      connections: [
        {
          id: "1",
          name: "GitHub",
          type: "github",
          status: "connected",
          lastSync: "2026-01-26T17:00:00Z",
        },
        {
          id: "2",
          name: "Anthropic",
          type: "anthropic",
          status: "connected",
          lastSync: "2026-01-26T17:00:00Z",
        },
        {
          id: "3",
          name: "Telegram",
          type: "telegram",
          status: "connected",
          lastSync: "2026-01-26T17:00:00Z",
        },
        {
          id: "4",
          name: "Google",
          type: "google",
          status: "connected",
          lastSync: "2026-01-26T17:00:00Z",
        },
      ],

      // Initial skills
      skills: [
        {
          id: "1",
          name: "SOT (Stick or Twist)",
          description: "Adversarial GTM simulation for startup ideas",
          trigger: "SOT: <idea>",
          enabled: true,
          usageCount: 1,
          lastUsed: "2026-01-26T16:54:00Z",
        },
      ],

      // Usage records
      usage: [
        {
          date: "2026-01-26",
          inputTokens: 45000,
          outputTokens: 12000,
          cost: 0.85,
          model: "claude-sonnet-4-20250514",
        },
      ],

      // Task actions
      addTask: (task) =>
        set((state) => ({
          tasks: [
            ...state.tasks,
            {
              ...task,
              id: Date.now().toString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })),

      updateTask: (id, updates) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
          ),
        })),

      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        })),

      moveTask: (id, status) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t
          ),
        })),

      // Connection actions
      addConnection: (conn) =>
        set((state) => ({
          connections: [...state.connections, { ...conn, id: Date.now().toString() }],
        })),

      updateConnection: (id, updates) =>
        set((state) => ({
          connections: state.connections.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      deleteConnection: (id) =>
        set((state) => ({
          connections: state.connections.filter((c) => c.id !== id),
        })),

      // Skill actions
      addSkill: (skill) =>
        set((state) => ({
          skills: [...state.skills, { ...skill, id: Date.now().toString(), usageCount: 0 }],
        })),

      updateSkill: (id, updates) =>
        set((state) => ({
          skills: state.skills.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        })),

      deleteSkill: (id) =>
        set((state) => ({
          skills: state.skills.filter((s) => s.id !== id),
        })),

      // Usage actions
      addUsage: (record) =>
        set((state) => ({
          usage: [...state.usage, record],
        })),
    }),
    {
      name: "clawdbot-hub-storage",
    }
  )
);
