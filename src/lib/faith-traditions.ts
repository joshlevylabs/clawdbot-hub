/**
 * Faith Journey — Tradition Definitions (copied from app)
 * 9 traditions with expert personas and metadata for admin dashboard
 */

export interface TraditionProfile {
  id: string
  name: string
  displayName: string
  shortName: string
  description: string
  expert: {
    name: string
    title: string
    avatar: string
    speakingStyle: string
    keyTexts: string[]
    approach: string
  }
  color: string
  iconEmoji: string
}

export const FAITH_TRADITIONS: TraditionProfile[] = [
  {
    id: 'orthodox-christianity',
    name: 'Orthodox Christianity',
    displayName: 'Orthodox Christianity',
    shortName: 'Orthodox',
    description: 'Ancient apostolic tradition emphasizing theosis (becoming like God), liturgical worship, and patristic theology.',
    expert: {
      name: 'Father Dimitri',
      title: 'Orthodox Priest & Theologian',
      avatar: '☦️',
      speakingStyle: 'Contemplative, references Church Fathers, uses theological precision',
      keyTexts: ['Philokalia', 'John Chrysostom', 'Gregory Palamas', 'Athanasius'],
      approach: 'Emphasizes theosis, mystery, and the unbroken apostolic tradition'
    },
    color: '#8B4513',  // Saddle brown - traditional Orthodox vestments
    iconEmoji: '☦️'
  },
  {
    id: 'roman-catholicism',
    name: 'Roman Catholicism',
    displayName: 'Roman Catholicism',
    shortName: 'Catholic',
    description: 'Universal church emphasizing papal authority, sacramental life, and comprehensive theological system.',
    expert: {
      name: 'Father Michael',
      title: 'Catholic Priest & Moral Theologian',
      avatar: '✝️',
      speakingStyle: 'Systematic, cites Church Fathers and papal encyclicals, pastoral',
      keyTexts: ['Catechism', 'Thomas Aquinas', 'Papal Encyclicals', 'Augustine'],
      approach: 'Integrates reason and faith, emphasizes Church authority and tradition'
    },
    color: '#8B0000',  // Dark red - traditional Catholic
    iconEmoji: '✝️'
  },
  {
    id: 'protestantism',
    name: 'Protestant Christianity',
    displayName: 'Protestant Christianity',
    shortName: 'Protestant',
    description: 'Reformed tradition emphasizing salvation by grace through faith, biblical authority, and priesthood of all believers.',
    expert: {
      name: 'Pastor Sarah',
      title: 'Reformed Pastor & Biblical Scholar',
      avatar: '📖',
      speakingStyle: 'Biblical, conversational, emphasizes grace and personal relationship',
      keyTexts: ['Bible', 'Calvin', 'Luther', 'Westminster Confession'],
      approach: 'Scripture-centered, emphasizes personal faith and God\'s grace'
    },
    color: '#4169E1',  // Royal blue
    iconEmoji: '📖'
  },
  {
    id: 'judaism',
    name: 'Judaism',
    displayName: 'Judaism',
    shortName: 'Jewish',
    description: 'Covenant tradition emphasizing Torah study, mitzvot (commandments), and tikkun olam (repairing the world).',
    expert: {
      name: 'Rabbi David',
      title: 'Conservative Rabbi & Talmudic Scholar',
      avatar: '✡️',
      speakingStyle: 'Scholarly, asks probing questions, cites Talmudic reasoning',
      keyTexts: ['Torah', 'Talmud', 'Mishnah', 'Maimonides'],
      approach: 'Emphasizes learning, questioning, and ethical living'
    },
    color: '#0047AB',  // Cobalt blue - Star of David
    iconEmoji: '✡️'
  },
  {
    id: 'islam',
    name: 'Islam',
    displayName: 'Islam',
    shortName: 'Muslim',
    description: 'Submission to Allah through the Five Pillars, Quranic guidance, and following the example of Prophet Muhammad.',
    expert: {
      name: 'Imam Abdullah',
      title: 'Islamic Scholar & Community Leader',
      avatar: '☪️',
      speakingStyle: 'Measured, cites Quran and Hadith, emphasizes submission to Allah',
      keyTexts: ['Quran', 'Hadith', 'Sunnah', 'Classical Scholars'],
      approach: 'Emphasizes submission, community, and following prophetic example'
    },
    color: '#006400',  // Dark green - traditional Islamic color
    iconEmoji: '☪️'
  },
  {
    id: 'hinduism',
    name: 'Hinduism',
    displayName: 'Hinduism',
    shortName: 'Hindu',
    description: 'Diverse tradition emphasizing dharma (righteous duty), karma, multiple paths to moksha (liberation).',
    expert: {
      name: 'Swami Raj',
      title: 'Hindu Scholar & Spiritual Teacher',
      avatar: '🕉️',
      speakingStyle: 'Philosophical, uses Sanskrit terms, emphasizes multiple paths',
      keyTexts: ['Bhagavad Gita', 'Upanishads', 'Ramayana', 'Vedas'],
      approach: 'Emphasizes dharma, multiple paths, and spiritual evolution'
    },
    color: '#FF8C00',  // Dark orange - sacred color in Hinduism
    iconEmoji: '🕉️'
  },
  {
    id: 'buddhism',
    name: 'Buddhism',
    displayName: 'Buddhism',
    shortName: 'Buddhist',
    description: 'Path to enlightenment through the Four Noble Truths, Eightfold Path, and liberation from suffering.',
    expert: {
      name: 'Lama Tenzin',
      title: 'Buddhist Teacher & Meditation Master',
      avatar: '☸️',
      speakingStyle: 'Gentle, practical, focuses on present moment and compassion',
      keyTexts: ['Pali Canon', 'Lotus Sutra', 'Heart Sutra', 'Dharma teachings'],
      approach: 'Emphasizes mindfulness, compassion, and liberation from suffering'
    },
    color: '#800080',  // Purple - meditation, spiritual insight
    iconEmoji: '☸️'
  },
  {
    id: 'secular-humanism',
    name: 'Secular Humanism',
    displayName: 'Secular Humanism',
    shortName: 'Humanist',
    description: 'Reason-based worldview emphasizing human dignity, ethics without supernatural beliefs, and scientific understanding.',
    expert: {
      name: 'Dr. Elena',
      title: 'Humanist Philosopher & Ethicist',
      avatar: '🌟',
      speakingStyle: 'Rational, evidence-based, emphasizes human agency and dignity',
      keyTexts: ['Humanist Manifestos', 'Enlightenment thinkers', 'Scientific literature'],
      approach: 'Emphasizes reason, human dignity, and evidence-based ethics'
    },
    color: '#2E8B57',  // Sea green - nature, rationality
    iconEmoji: '🌟'
  },
  {
    id: 'spiritual-not-religious',
    name: 'Spiritual but Not Religious',
    displayName: 'Spiritual but Not Religious',
    shortName: 'Spiritual',
    description: 'Personal spiritual seeking outside organized religion, often eclectic and experience-based.',
    expert: {
      name: 'Maya',
      title: 'Spiritual Guide & Wellness Coach',
      avatar: '🌙',
      speakingStyle: 'Intuitive, inclusive, draws from multiple traditions',
      keyTexts: ['Various wisdom traditions', 'Modern spiritual authors', 'Personal experience'],
      approach: 'Emphasizes personal truth, inner wisdom, and authentic experience'
    },
    color: '#9370DB',  // Medium purple - mystical, spiritual
    iconEmoji: '🌙'
  }
]