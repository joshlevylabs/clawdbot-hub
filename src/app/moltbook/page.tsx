"use client";

import { useState, useEffect } from "react";
import { 
  MessageSquare, 
  ThumbsUp, 
  Users, 
  FileText, 
  RefreshCw, 
  ExternalLink,
  Search,
  Filter,
  Lightbulb,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface MoltbookPost {
  id: string;
  title: string;
  content?: string;
  url?: string;
  submolt: string;
  created_at: string;
  upvotes: number;
  comment_count: number;
}

interface MoltbookComment {
  id: string;
  content: string;
  post_id: string;
  post_title?: string;
  post_author?: string;
  post_url?: string;
  created_at: string;
  upvotes: number;
}

interface MoltbookUpvote {
  id: string;
  post_id: string;
  post_title?: string;
  created_at: string;
}

interface MoltbookFollowing {
  id: string;
  name: string;
  followed_at: string;
}

interface MoltbookData {
  configured: boolean;
  status?: string;
  agent?: {
    id: string;
    name: string;
    karma?: number;
    created_at?: string;
  };
  activity?: {
    posts: MoltbookPost[];
    comments: MoltbookComment[];
    upvotes: MoltbookUpvote[];
    following: MoltbookFollowing[];
  };
  stats?: {
    postCount: number;
    commentCount: number;
    upvoteCount: number;
    followingCount: number;
  };
  error?: string;
}

interface DailyIdea {
  date: string;
  idea: string;
  status: 'pending' | 'explored' | 'building' | 'shipped';
}

export default function MoltbookPage() {
  const [data, setData] = useState<MoltbookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'comments' | 'upvotes' | 'following' | 'ideas'>('posts');
  const [searchQuery, setSearchQuery] = useState("");
  const [dailyIdeas, setDailyIdeas] = useState<DailyIdea[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/moltbook');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch Moltbook data:', error);
      setData({ configured: false, error: 'Failed to fetch data' });
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyIdeas = async () => {
    try {
      const response = await fetch('/data/moltbook-ideas.json');
      if (response.ok) {
        const ideas = await response.json();
        setDailyIdeas(ideas);
      }
    } catch {
      // No ideas file yet
    }
  };

  useEffect(() => {
    fetchData();
    fetchDailyIdeas();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filterItems = <T extends { content?: string; title?: string }>(items: T[]): T[] => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      (item.content?.toLowerCase().includes(query)) ||
      (item.title?.toLowerCase().includes(query))
    );
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 flex items-center gap-3">
            <span className="text-2xl">🦞</span>
            Moltbook Activity
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Theo&apos;s social network for AI agents</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://moltbook.com/u/TheoLevy"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Profile
          </a>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Status Card */}
      {data && (
        <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                data.status === 'claimed' ? 'bg-green-600/20' : 'bg-yellow-600/20'
              }`}>
                🦞
              </div>
              <div>
                <h2 className="font-semibold text-slate-200">{data.agent?.name || 'TheoLevy'}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {data.status === 'claimed' ? (
                    <span className="flex items-center gap-1 text-green-400 text-sm">
                      <CheckCircle className="w-3 h-3" />
                      Claimed & Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-yellow-400 text-sm">
                      <AlertCircle className="w-3 h-3" />
                      Pending Claim
                    </span>
                  )}
                  {data.agent?.karma !== undefined && (
                    <span className="text-slate-500 text-sm">• {data.agent.karma} karma</span>
                  )}
                </div>
              </div>
            </div>
            {data.stats && (
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-xl font-semibold text-slate-200">{data.stats.postCount}</p>
                  <p className="text-slate-500 text-xs">Posts</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-semibold text-slate-200">{data.stats.commentCount}</p>
                  <p className="text-slate-500 text-xs">Comments</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-semibold text-slate-200">{data.stats.upvoteCount}</p>
                  <p className="text-slate-500 text-xs">Upvotes</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-semibold text-slate-200">{data.stats.followingCount}</p>
                  <p className="text-slate-500 text-xs">Following</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search posts, comments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 px-4 py-2 text-sm rounded-md transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'posts' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Posts
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={`flex-1 px-4 py-2 text-sm rounded-md transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'comments' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Comments
        </button>
        <button
          onClick={() => setActiveTab('upvotes')}
          className={`flex-1 px-4 py-2 text-sm rounded-md transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'upvotes' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ThumbsUp className="w-4 h-4" />
          Upvotes
        </button>
        <button
          onClick={() => setActiveTab('following')}
          className={`flex-1 px-4 py-2 text-sm rounded-md transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'following' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Following
        </button>
        <button
          onClick={() => setActiveTab('ideas')}
          className={`flex-1 px-4 py-2 text-sm rounded-md transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'ideas' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          Ideas
        </button>
      </div>

      {/* Content */}
      <div className="bg-slate-850 rounded-xl border border-slate-800 p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-slate-500 animate-spin" />
          </div>
        ) : data?.error ? (
          <div className="text-center py-12">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-slate-400">{data.error}</p>
          </div>
        ) : (
          <>
            {/* Posts Tab */}
            {activeTab === 'posts' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-200">My Posts</h3>
                {!data?.activity?.posts?.length ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 mb-4">{data?.stats?.postCount || 0} posts on Moltbook</p>
                    <a 
                      href="https://www.moltbook.com/u/TheoLevy" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                    >
                      View Posts on Moltbook
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filterItems(data.activity.posts).map(post => (
                      <a 
                        key={post.id} 
                        href={post.url || `https://moltbook.com/post/${post.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-slate-800/50 rounded-lg p-4 hover:bg-slate-700/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h4 className="text-slate-200 font-medium flex items-center gap-2">
                              {post.title}
                              <ExternalLink className="w-3 h-3 text-slate-500" />
                            </h4>
                            {post.content && (
                              <p className="text-slate-400 text-sm mt-1 line-clamp-2">{post.content}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                              <span className="bg-slate-700/50 px-2 py-0.5 rounded">m/{post.submolt}</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(post.created_at)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <div className="text-slate-400">{post.upvotes} ↑</div>
                            <div className="text-slate-500">{post.comment_count} 💬</div>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-200">My Comments</h3>
                {!data?.activity?.comments?.length ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 mb-4">{data?.stats?.commentCount || 0} comments on Moltbook</p>
                    <a 
                      href="https://www.moltbook.com/u/TheoLevy" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                    >
                      View Activity on Moltbook
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filterItems(data.activity.comments).map(comment => (
                      <div key={comment.id} className="bg-slate-800/50 rounded-lg p-4">
                        {/* Thread info */}
                        <a 
                          href={comment.post_url || `https://moltbook.com/post/${comment.post_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 mb-2"
                        >
                          <span className="text-slate-500">on thread:</span>
                          <span className="font-medium">{comment.post_title || comment.post_id}</span>
                          {comment.post_author && (
                            <span className="text-slate-500">by {comment.post_author}</span>
                          )}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {/* Comment content */}
                        <p className="text-slate-300 text-sm whitespace-pre-wrap">{comment.content}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(comment.created_at)}
                          </span>
                          <span>{comment.upvotes} ↑</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Upvotes Tab */}
            {activeTab === 'upvotes' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-200">Posts I&apos;ve Upvoted</h3>
                {!data?.activity?.upvotes?.length ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 mb-4">{data?.stats?.upvoteCount || 0} subscriptions on Moltbook</p>
                    <a 
                      href="https://www.moltbook.com/u/TheoLevy" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                      View Profile on Moltbook
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.activity.upvotes.map(upvote => (
                      <div key={upvote.id} className="bg-slate-800/50 rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <p className="text-slate-300">{upvote.post_title || upvote.post_id}</p>
                          <span className="text-xs text-slate-500">{formatDate(upvote.created_at)}</span>
                        </div>
                        <ThumbsUp className="w-4 h-4 text-green-400" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Following Tab */}
            {activeTab === 'following' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-200">Agents I Follow</h3>
                {!data?.activity?.following?.length ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 mb-4">{data?.stats?.followingCount || 0} agents followed</p>
                    <a 
                      href="https://www.moltbook.com/u/TheoLevy" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                      View Profile on Moltbook
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {data.activity.following.map(agent => (
                      <div key={agent.id} className="bg-slate-800/50 rounded-lg p-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600/20 rounded-full flex items-center justify-center text-lg">
                          🦞
                        </div>
                        <div>
                          <p className="text-slate-200 font-medium">{agent.name}</p>
                          <span className="text-xs text-slate-500">Followed {formatDate(agent.followed_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Ideas Tab */}
            {activeTab === 'ideas' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-200 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-400" />
                  Daily Ideas from Moltbook
                </h3>
                <p className="text-slate-500 text-sm">
                  Ideas Theo generates from exploring the AI agent network — one per day for us to explore together.
                </p>
                {!dailyIdeas.length ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-6 text-center">
                    <Lightbulb className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                    <p className="text-amber-200">No ideas yet</p>
                    <p className="text-amber-200/60 text-sm mt-1">First idea coming after Theo explores Moltbook!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dailyIdeas.map((idea, idx) => (
                      <div key={idx} className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-amber-200">{idea.idea}</p>
                            <span className="text-xs text-amber-200/60 mt-2 block">{idea.date}</span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            idea.status === 'shipped' ? 'bg-green-500/20 text-green-400' :
                            idea.status === 'building' ? 'bg-blue-500/20 text-blue-400' :
                            idea.status === 'explored' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {idea.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Privacy Notice */}
      <div className="bg-slate-800/50 rounded-lg p-4 text-sm text-slate-500">
        <p className="flex items-center gap-2">
          <span className="text-green-400">🔒</span>
          <span>Theo never shares personal information about Joshua or family on Moltbook.</span>
        </p>
      </div>
    </div>
  );
}
