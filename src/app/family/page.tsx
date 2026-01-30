"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Heart,
  Calendar,
  Gift,
  Star,
  Cake,
  Clock,
  Sparkles,
  MessageCircle,
  Baby,
  User,
  Edit3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface FamilyMember {
  name: string;
  relation: string;
  birthday: string;
  age: number;
  interests?: string[];
  loveLanguage?: string[];
  favorites?: {
    toys?: string[];
    shows?: string[];
    foods?: string[];
    activities?: string[];
  };
  notes?: string[];
}

interface ImportantDate {
  date: string;
  event: string;
  type: string;
}

interface Tradition {
  name: string;
  frequency: string;
  description: string;
}

interface FamilyData {
  lastUpdated: string;
  location: string;
  members: FamilyMember[];
  importantDates: ImportantDate[];
  anniversary: string;
  traditions: Tradition[];
  traditionIdeas: string[];
  dateNightIdeas: string[];
  familyActivityIdeas: string[];
  conversationTopics: string[];
}

function getNextBirthday(birthday: string): { date: Date; daysUntil: number } {
  const [, month, day] = birthday.split('-').map(Number);
  const today = new Date();
  const thisYear = today.getFullYear();
  
  let nextBday = new Date(thisYear, month - 1, day);
  if (nextBday < today) {
    nextBday = new Date(thisYear + 1, month - 1, day);
  }
  
  const daysUntil = Math.ceil((nextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return { date: nextBday, daysUntil };
}

function formatDate(dateStr: string): string {
  const [month, day] = dateStr.split('-').map(Number);
  const date = new Date(2024, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

function MemberCard({ member }: { member: FamilyMember }) {
  const [expanded, setExpanded] = useState(false);
  const { daysUntil } = getNextBirthday(member.birthday);
  const birthdaySoon = daysUntil <= 30;
  
  const getIcon = () => {
    if (member.relation === 'wife') return Heart;
    if (member.age < 3) return Baby;
    return User;
  };
  const Icon = getIcon();
  
  const getColor = () => {
    if (member.relation === 'wife') return 'text-pink-400 bg-pink-500/10';
    if (member.relation === 'son') return 'text-blue-400 bg-blue-500/10';
    return 'text-primary-400 bg-primary-500/10';
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-4 hover:bg-slate-800/50 transition-colors"
      >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getColor()}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-semibold text-slate-100">{member.name}</h3>
          <p className="text-sm text-slate-500 capitalize">{member.relation} • Age {member.age}</p>
        </div>
        {birthdaySoon && (
          <div className="flex items-center gap-1 text-amber-400 text-sm">
            <Cake className="w-4 h-4" />
            <span>{daysUntil}d</span>
          </div>
        )}
        {expanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-800 pt-3 space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Calendar className="w-4 h-4" />
            <span>Birthday: {new Date(member.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
            {birthdaySoon && <span className="text-amber-400">({daysUntil} days away!)</span>}
          </div>
          
          {member.loveLanguage && member.loveLanguage.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Heart className="w-4 h-4 text-pink-400" />
              <span className="text-slate-400">Love language:</span>
              <span className="text-slate-300">{member.loveLanguage.join(', ')}</span>
            </div>
          )}
          
          {member.interests && member.interests.length > 0 && (
            <div>
              <p className="text-sm text-slate-500 mb-1">Interests</p>
              <div className="flex flex-wrap gap-2">
                {member.interests.map((interest, i) => (
                  <span key={i} className="px-2 py-1 bg-slate-800 rounded-full text-xs text-slate-300">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {member.favorites?.shows && member.favorites.shows.length > 0 && (
            <div>
              <p className="text-sm text-slate-500 mb-1">Favorite Shows</p>
              <div className="flex flex-wrap gap-2">
                {member.favorites.shows.map((show, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs">
                    {show}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {member.notes && member.notes.length > 0 && (
            <div className="text-sm text-slate-400 italic">
              {member.notes.join(' • ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FamilyPage() {
  const [data, setData] = useState<FamilyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [randomTopic, setRandomTopic] = useState('');
  const [randomActivity, setRandomActivity] = useState('');
  const [randomDateIdea, setRandomDateIdea] = useState('');

  useEffect(() => {
    fetch('/api/family')
      .then(res => res.json())
      .then(d => {
        setData(d);
        if (d.conversationTopics?.length) {
          setRandomTopic(d.conversationTopics[Math.floor(Math.random() * d.conversationTopics.length)]);
        }
        if (d.familyActivityIdeas?.length) {
          setRandomActivity(d.familyActivityIdeas[Math.floor(Math.random() * d.familyActivityIdeas.length)]);
        }
        if (d.dateNightIdeas?.length) {
          setRandomDateIdea(d.dateNightIdeas[Math.floor(Math.random() * d.dateNightIdeas.length)]);
        }
      })
      .catch(err => console.error('Failed to load family data:', err))
      .finally(() => setLoading(false));
  }, []);

  const shuffleTopic = () => {
    if (data?.conversationTopics?.length) {
      setRandomTopic(data.conversationTopics[Math.floor(Math.random() * data.conversationTopics.length)]);
    }
  };

  const shuffleActivity = () => {
    if (data?.familyActivityIdeas?.length) {
      setRandomActivity(data.familyActivityIdeas[Math.floor(Math.random() * data.familyActivityIdeas.length)]);
    }
  };

  const shuffleDateIdea = () => {
    if (data?.dateNightIdeas?.length) {
      setRandomDateIdea(data.dateNightIdeas[Math.floor(Math.random() * data.dateNightIdeas.length)]);
    }
  };

  // Calculate upcoming events
  const getUpcomingEvents = () => {
    if (!data) return [];
    const today = new Date();
    const events = data.importantDates.map(d => {
      const [month, day] = d.date.split('-').map(Number);
      let eventDate = new Date(today.getFullYear(), month - 1, day);
      if (eventDate < today) {
        eventDate = new Date(today.getFullYear() + 1, month - 1, day);
      }
      const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { ...d, daysUntil, eventDate };
    });
    return events.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 5);
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-800 rounded w-48" />
          <div className="h-32 bg-slate-800 rounded" />
          <div className="h-32 bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">Could not load family data</p>
      </div>
    );
  }

  const upcomingEvents = getUpcomingEvents();

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 flex items-center gap-3">
            <Users className="w-7 h-7 text-primary-500" />
            Family
          </h1>
          <p className="text-slate-500 mt-1">{data.location}</p>
        </div>
        <div className="text-right text-sm text-slate-500">
          Updated {data.lastUpdated}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Family Members */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-medium text-slate-200 flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-400" />
            Family Members
          </h2>
          <div className="space-y-3">
            {data.members.map((member, i) => (
              <MemberCard key={i} member={member} />
            ))}
          </div>
          
          {/* Traditions */}
          <h2 className="text-lg font-medium text-slate-200 flex items-center gap-2 mt-8">
            <Star className="w-5 h-5 text-amber-400" />
            Family Traditions
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {data.traditions.map((tradition, i) => (
              <div key={i} className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="font-medium text-slate-200">{tradition.name}</h3>
                </div>
                <p className="text-sm text-slate-400">{tradition.description}</p>
                <p className="text-xs text-slate-500 mt-2 capitalize">{tradition.frequency}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Events */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            <h3 className="font-medium text-slate-200 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-400" />
              Upcoming Events
            </h3>
            <div className="space-y-2">
              {upcomingEvents.map((event, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                  <div className="flex items-center gap-2">
                    {event.type === 'birthday' && <Cake className="w-4 h-4 text-pink-400" />}
                    {event.type === 'anniversary' && <Heart className="w-4 h-4 text-red-400" />}
                    {event.type === 'holiday' && <Gift className="w-4 h-4 text-amber-400" />}
                    <span className="text-sm text-slate-300">{event.event}</span>
                  </div>
                  <span className={`text-xs ${event.daysUntil <= 7 ? 'text-amber-400' : 'text-slate-500'}`}>
                    {event.daysUntil === 0 ? 'Today!' : `${event.daysUntil}d`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Conversation Starter */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            <h3 className="font-medium text-slate-200 mb-3 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              Conversation Starter
            </h3>
            <p className="text-slate-300 text-sm italic mb-3">"{randomTopic}"</p>
            <button 
              onClick={shuffleTopic}
              className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              Get another →
            </button>
          </div>

          {/* Activity Idea */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            <h3 className="font-medium text-slate-200 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              Family Activity Idea
            </h3>
            <p className="text-slate-300 text-sm mb-3">{randomActivity}</p>
            <button 
              onClick={shuffleActivity}
              className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              Get another →
            </button>
          </div>

          {/* Date Night Idea */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            <h3 className="font-medium text-slate-200 mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-400" />
              Date Night Idea
            </h3>
            <p className="text-slate-300 text-sm mb-3">{randomDateIdea}</p>
            <button 
              onClick={shuffleDateIdea}
              className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              Get another →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
