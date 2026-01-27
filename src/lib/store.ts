import { create } from "zustand";
import { supabase, isSupabaseConfigured, DbTask, DbSkill, DbConnection, DbUsage } from "./supabase";

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
  id?: string;
  date: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  model: string;
}

// Transform functions
const dbToTask = (db: DbTask): Task => ({
  id: db.id,
  title: db.title,
  description: db.description || undefined,
  status: db.status,
  priority: db.priority,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

const dbToSkill = (db: DbSkill): Skill => ({
  id: db.id,
  name: db.name,
  description: db.description || "",
  trigger: db.trigger || "",
  enabled: db.enabled,
  usageCount: db.usage_count,
  lastUsed: db.last_used || undefined,
});

const dbToConnection = (db: DbConnection): Connection => ({
  id: db.id,
  name: db.name,
  type: db.type as Connection["type"],
  status: db.status,
  lastSync: db.last_sync || undefined,
});

const dbToUsage = (db: DbUsage): UsageRecord => ({
  id: db.id,
  date: db.date,
  inputTokens: db.input_tokens,
  outputTokens: db.output_tokens,
  cost: Number(db.cost),
  model: db.model || "",
});

interface HubStore {
  // Loading state
  loading: boolean;
  initialized: boolean;
  
  // Data
  tasks: Task[];
  connections: Connection[];
  skills: Skill[];
  usage: UsageRecord[];

  // Init
  initialize: () => Promise<void>;

  // Task actions
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (id: string, status: Task["status"]) => Promise<void>;

  // Connection actions
  addConnection: (conn: Omit<Connection, "id">) => Promise<void>;
  updateConnection: (id: string, updates: Partial<Connection>) => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;

  // Skill actions
  addSkill: (skill: Omit<Skill, "id" | "usageCount">) => Promise<void>;
  updateSkill: (id: string, updates: Partial<Skill>) => Promise<void>;
  deleteSkill: (id: string) => Promise<void>;

  // Usage actions
  addUsage: (record: Omit<UsageRecord, "id">) => Promise<void>;
}

export const useHubStore = create<HubStore>()((set, get) => ({
  loading: true,
  initialized: false,
  tasks: [],
  connections: [],
  skills: [],
  usage: [],

  initialize: async () => {
    if (get().initialized) return;
    
    if (!isSupabaseConfigured()) {
      console.warn("Supabase not configured, using empty state");
      set({ loading: false, initialized: true });
      return;
    }
    
    try {
      const [tasksRes, skillsRes, connectionsRes, usageRes] = await Promise.all([
        supabase.from("tasks").select("*").order("created_at", { ascending: false }),
        supabase.from("skills").select("*").order("created_at", { ascending: false }),
        supabase.from("connections").select("*").order("created_at", { ascending: false }),
        supabase.from("usage").select("*").order("date", { ascending: false }),
      ]);

      set({
        tasks: (tasksRes.data || []).map(dbToTask),
        skills: (skillsRes.data || []).map(dbToSkill),
        connections: (connectionsRes.data || []).map(dbToConnection),
        usage: (usageRes.data || []).map(dbToUsage),
        loading: false,
        initialized: true,
      });
    } catch (error) {
      console.error("Failed to initialize store:", error);
      set({ loading: false, initialized: true });
    }
  },

  // Task actions
  addTask: async (task) => {
    if (!isSupabaseConfigured()) return;
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: task.title,
        description: task.description || null,
        status: task.status,
        priority: task.priority,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to add task:", error);
      return;
    }

    set((state) => ({
      tasks: [dbToTask(data), ...state.tasks],
    }));
  },

  updateTask: async (id, updates) => {
    const dbUpdates: Partial<DbTask> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description || null;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;

    const { error } = await supabase
      .from("tasks")
      .update(dbUpdates)
      .eq("id", id);

    if (error) {
      console.error("Failed to update task:", error);
      return;
    }

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      ),
    }));
  },

  deleteTask: async (id) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      console.error("Failed to delete task:", error);
      return;
    }

    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
  },

  moveTask: async (id, status) => {
    const { error } = await supabase
      .from("tasks")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Failed to move task:", error);
      return;
    }

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t
      ),
    }));
  },

  // Connection actions
  addConnection: async (conn) => {
    const { data, error } = await supabase
      .from("connections")
      .insert({
        name: conn.name,
        type: conn.type,
        status: conn.status,
        last_sync: conn.lastSync || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to add connection:", error);
      return;
    }

    set((state) => ({
      connections: [dbToConnection(data), ...state.connections],
    }));
  },

  updateConnection: async (id, updates) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.lastSync !== undefined) dbUpdates.last_sync = updates.lastSync;

    const { error } = await supabase
      .from("connections")
      .update(dbUpdates)
      .eq("id", id);

    if (error) {
      console.error("Failed to update connection:", error);
      return;
    }

    set((state) => ({
      connections: state.connections.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  },

  deleteConnection: async (id) => {
    const { error } = await supabase.from("connections").delete().eq("id", id);

    if (error) {
      console.error("Failed to delete connection:", error);
      return;
    }

    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id),
    }));
  },

  // Skill actions
  addSkill: async (skill) => {
    const { data, error } = await supabase
      .from("skills")
      .insert({
        name: skill.name,
        description: skill.description || null,
        trigger: skill.trigger || null,
        enabled: skill.enabled,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to add skill:", error);
      return;
    }

    set((state) => ({
      skills: [dbToSkill(data), ...state.skills],
    }));
  },

  updateSkill: async (id, updates) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.trigger !== undefined) dbUpdates.trigger = updates.trigger;
    if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
    if (updates.usageCount !== undefined) dbUpdates.usage_count = updates.usageCount;
    if (updates.lastUsed !== undefined) dbUpdates.last_used = updates.lastUsed;

    const { error } = await supabase
      .from("skills")
      .update(dbUpdates)
      .eq("id", id);

    if (error) {
      console.error("Failed to update skill:", error);
      return;
    }

    set((state) => ({
      skills: state.skills.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
  },

  deleteSkill: async (id) => {
    const { error } = await supabase.from("skills").delete().eq("id", id);

    if (error) {
      console.error("Failed to delete skill:", error);
      return;
    }

    set((state) => ({
      skills: state.skills.filter((s) => s.id !== id),
    }));
  },

  // Usage actions
  addUsage: async (record) => {
    const { data, error } = await supabase
      .from("usage")
      .insert({
        date: record.date,
        input_tokens: record.inputTokens,
        output_tokens: record.outputTokens,
        cost: record.cost,
        model: record.model,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to add usage:", error);
      return;
    }

    set((state) => ({
      usage: [dbToUsage(data), ...state.usage],
    }));
  },
}));
