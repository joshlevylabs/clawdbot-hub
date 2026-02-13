export interface Newsletter {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  category: string | null;
  cadence: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  status: 'draft' | 'active' | 'paused';
  sender_name: string;
  created_at: string;
  updated_at: string;
  // Computed (joined):
  subscriber_count?: number;
  last_sent_at?: string | null;
}

export interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  newsletter_id: string;
  subscriber_id: string;
  status: 'active' | 'unsubscribed';
  subscribed_at: string;
  unsubscribed_at: string | null;
  // Joined:
  subscriber?: Subscriber;
}

export interface NewsletterIssue {
  id: string;
  newsletter_id: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  status: 'draft' | 'scheduled' | 'sent';
  recipient_count: number;
  open_count: number;
  click_count: number;
  sent_at: string | null;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
  content_data?: Record<string, unknown> | null;
  generation_status?: 'pending' | 'generating' | 'ready' | null;
}

export interface ContentConfig {
  id: string;
  newsletter_id: string;
  source_key: string;
  label: string;
  params: Record<string, unknown>;
  display_order: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewsletterActivity {
  id: string;
  newsletter_id: string | null;
  type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface NewsletterStats {
  total_subscribers: number;
  total_newsletters: number;
  total_issues_sent: number;
  newsletters: Array<{
    id: string;
    name: string;
    subscriber_count: number;
    last_sent_at: string | null;
    issues_sent: number;
    status: string;
  }>;
}
