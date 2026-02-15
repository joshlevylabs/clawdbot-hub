/**
 * Prayer templates library — pre-built elements per tradition
 * Used to generate daily prayers based on compass alignment
 */

export interface PrayerElements {
  openings: string[];
  scriptures: { text: string; ref: string }[];
  reflections: string[];
  intentions: string[];
  closings: string[];
  icon: string;
  nativeGreeting?: string; // Hebrew/Arabic/Greek opening
}

export const TRADITION_PRAYERS: Record<string, PrayerElements> = {
  Judaism: {
    icon: '✡️',
    nativeGreeting: 'מודה אני לפניך — Modeh Ani Lefanecha',
    openings: [
      'מודה אני לפניך, מלך חי וקיים, שהחזרת בי נשמתי בחמלה — רבה אמונתך.\n\nI gratefully thank You, living and eternal King, for You have returned my soul within me with compassion — great is Your faithfulness.',
      'ברוך אתה ה׳ אלוקינו מלך העולם, אשר קדשנו במצוותיו.\n\nBlessed are You, Lord our God, King of the Universe, who has sanctified us with Your commandments.',
      'ברוך אתה ה׳ אלוקינו מלך העולם, שעשה לי כל צרכי.\n\nBlessed are You, Lord our God, King of the Universe, who provides for all my needs.',
      'ברוך אתה ה׳ אלוקינו מלך העולם, המכין מצעדי גבר.\n\nBlessed are You, Lord our God, King of the Universe, who makes firm the steps of man.',
    ],
    scriptures: [
      { text: 'שְׁמַע יִשְׂרָאֵל ה׳ אֱלֹקֵינוּ ה׳ אֶחָד — Hear, O Israel: The Lord our God, the Lord is One.', ref: 'Deuteronomy 6:4' },
      { text: 'Trust in the Lord with all your heart, and do not lean on your own understanding. In all your ways acknowledge Him, and He will make straight your paths.', ref: 'Proverbs 3:5-6' },
      { text: 'The Lord is my shepherd; I shall not want. He makes me lie down in green pastures. He leads me beside still waters. He restores my soul.', ref: 'Psalm 23:1-3' },
      { text: 'Commit your way to the Lord; trust in Him, and He will act. He will bring forth your righteousness as the light, and your justice as the noonday.', ref: 'Psalm 37:5-6' },
      { text: 'For I know the plans I have for you, declares the Lord, plans for welfare and not for evil, to give you a future and a hope.', ref: 'Jeremiah 29:11' },
      { text: 'The beginning of wisdom is the fear of the Lord, and knowledge of the Holy One is understanding.', ref: 'Proverbs 9:10' },
      { text: 'He has told you, O man, what is good; and what does the Lord require of you but to do justice, and to love kindness, and to walk humbly with your God?', ref: 'Micah 6:8' },
      { text: 'The heavens declare the glory of God, and the sky above proclaims His handiwork. Day to day pours out speech, and night to night reveals knowledge.', ref: 'Psalm 19:1-2' },
      { text: 'Create in me a clean heart, O God, and renew a right spirit within me.', ref: 'Psalm 51:10' },
      { text: 'Unless the Lord builds the house, those who build it labor in vain. Unless the Lord watches over the city, the watchman stays awake in vain.', ref: 'Psalm 127:1' },
      { text: 'Prepare your work outside; get everything ready for yourself in the field, and after that build your house.', ref: 'Proverbs 24:27' },
      { text: 'The plans of the diligent lead surely to abundance, but everyone who is hasty comes only to poverty.', ref: 'Proverbs 21:5' },
    ],
    reflections: [
      'Today I reflect on the Jewish teaching of tikkun olam — repairing the world through my actions, however small. Each deed carries the weight of intention.',
      'The Talmud teaches: "Who is wise? One who learns from every person." Today I approach each encounter as a teacher placed in my path.',
      'In the spirit of mussar, I examine my middot — my character traits. Where can I grow today in patience, in generosity, in truth?',
      'As the rabbis taught: "It is not upon you to finish the work, but neither are you free to desist from it." I take today one step at a time.',
      'The Mishnah reminds us: "The world stands on three things — Torah, service, and acts of lovingkindness." Today I seek to embody all three.',
      'Rabbi Nachman of Breslov said: "The whole world is a very narrow bridge, and the main thing is not to be afraid." I cross today\'s bridge with courage.',
      'Hillel asked: "If I am not for myself, who will be for me? But if I am only for myself, what am I? And if not now, when?" Today is when.',
    ],
    intentions: [
      'יְהִי רָצוֹן — May it be Your will, Hashem, that my work today be a sanctification of Your name. Guide my hands as I build, and let my efforts bring blessing to my family and community.',
      'Ribbono shel Olam — Master of the Universe — grant me the wisdom to see opportunity where others see obstacle, and the courage to act when others hesitate.',
      'Today I set my kavanah — my deepest intention — toward building something meaningful. May my labor be more than productivity; may it be avodah, sacred service.',
      'May the One who blessed our ancestors bless the work of my hands today. Let me build with integrity, lead with humility, and create with purpose.',
    ],
    closings: [
      'עֹשֶׂה שָׁלוֹם בִּמְרוֹמָיו, הוּא יַעֲשֶׂה שָׁלוֹם עָלֵינוּ\n\nMay the One who makes peace in the heavens make peace upon us and upon all Israel. Amen.',
      'יְבָרֶכְךָ ה׳ וְיִשְׁמְרֶךָ — May the Lord bless you and keep you. May the Lord make His face shine upon you and be gracious to you. May the Lord lift up His countenance upon you and give you peace. Amen.',
      'The Lord goes before you today. Walk in His light, build with His blessing, and return this evening with a grateful heart. Amen.',
      'May the words of my mouth and the meditation of my heart be acceptable before You, Lord, my Rock and my Redeemer. Amen.',
    ],
  },

  Catholicism: {
    icon: '⛪',
    nativeGreeting: 'In Nomine Patris, et Filii, et Spiritus Sancti',
    openings: [
      '✝️ In the Name of the Father, and of the Son, and of the Holy Spirit. Amen.\n\nO Jesus, through the Immaculate Heart of Mary, I offer You my prayers, works, joys, and sufferings of this day.',
      '✝️ In the Name of the Father, and of the Son, and of the Holy Spirit. Amen.\n\nLord God, I thank You for this new day. I lift my heart to You and ask for the grace to live it well.',
      '✝️ In the Name of the Father, and of the Son, and of the Holy Spirit. Amen.\n\nCome, Holy Spirit, fill the hearts of Your faithful and kindle in us the fire of Your love.',
      '✝️ In the Name of the Father, and of the Son, and of the Holy Spirit. Amen.\n\nMorning offering: O my God, I offer You all my thoughts, words, deeds, and sufferings of this day for the intentions of Your Sacred Heart.',
    ],
    scriptures: [
      { text: 'For I know the plans I have for you, declares the Lord, plans for welfare and not for evil, to give you a future and a hope.', ref: 'Jeremiah 29:11' },
      { text: 'I can do all things through Christ who strengthens me.', ref: 'Philippians 4:13' },
      { text: 'Be still, and know that I am God. I will be exalted among the nations, I will be exalted in the earth.', ref: 'Psalm 46:10' },
      { text: 'Trust in the Lord with all your heart, and do not lean on your own understanding. In all your ways acknowledge Him, and He will make straight your paths.', ref: 'Proverbs 3:5-6' },
      { text: 'The Lord is my light and my salvation — whom shall I fear? The Lord is the stronghold of my life — of whom shall I be afraid?', ref: 'Psalm 27:1' },
      { text: 'Come to me, all who labor and are heavy laden, and I will give you rest. Take my yoke upon you, and learn from me, for I am gentle and lowly in heart.', ref: 'Matthew 11:28-29' },
      { text: 'And we know that for those who love God all things work together for good, for those who are called according to His purpose.', ref: 'Romans 8:28' },
      { text: 'Have I not commanded you? Be strong and courageous. Do not be frightened, and do not be dismayed, for the Lord your God is with you wherever you go.', ref: 'Joshua 1:9' },
      { text: 'But seek first the kingdom of God and His righteousness, and all these things will be added to you.', ref: 'Matthew 6:33' },
      { text: 'Whatever you do, work heartily, as for the Lord and not for men, knowing that from the Lord you will receive the inheritance as your reward.', ref: 'Colossians 3:23-24' },
    ],
    reflections: [
      'The Catholic tradition calls us to offer our daily work as prayer — each task a small liturgy. Today I unite my labor with the self-offering of Christ.',
      'St. Francis de Sales reminds us: "Be who you are and be that well." Today I strive for sanctity not in grand gestures but in faithful presence to each moment.',
      'The Catechism teaches that work is both a duty and a privilege. Through our labor we participate in God\'s creative work and serve our neighbor.',
      'St. Ignatius invites us to "find God in all things." Today I look for the divine in the ordinary — in each conversation, each challenge, each quiet moment.',
      'St. Thérèse of Lisieux taught the "Little Way" — doing small things with great love. Today every small act of kindness is my prayer.',
      'The Eucharistic mystery reminds us: what seems ordinary bread becomes extraordinary grace. May my ordinary work today become extraordinary service.',
    ],
    intentions: [
      'Lord Jesus, I place this day in Your hands. Guide my work, guard my family, and grant me the grace to be a faithful steward of the gifts You have given me.',
      'Sacred Heart of Jesus, I place all my trust in You. Bless the work of my hands, the words of my mouth, and the thoughts of my heart this day.',
      'Holy Spirit, be my counselor in every decision today. Mary, Mother of God, pray for me that I may be worthy of the promises of Christ.',
      'Lord, help me to be an instrument of Your peace today. Where there is darkness, let me bring light. Where there is despair, hope.',
    ],
    closings: [
      'Angel of God, my guardian dear, to whom God\'s love commits me here, ever this day be at my side, to light and guard, to rule and guide. Amen.\n\nIn the Name of the Father, and of the Son, and of the Holy Spirit. Amen. ✝️',
      'May the Lord bless us, protect us from all evil, and bring us to everlasting life. Through Christ our Lord. Amen. ✝️',
      'Glory be to the Father, and to the Son, and to the Holy Spirit. As it was in the beginning, is now, and ever shall be, world without end. Amen. ✝️',
      'St. Michael the Archangel, defend us in battle. Be our protection against the wickedness and snares of the devil. Amen. ✝️',
    ],
  },

  'Orthodox Christianity': {
    icon: '☦️',
    nativeGreeting: 'Ἅγιος ὁ Θεός, Ἅγιος Ἰσχυρός, Ἅγιος Ἀθάνατος — Trisagion',
    openings: [
      '☦️ Ἅγιος ὁ Θεός, Ἅγιος Ἰσχυρός, Ἅγιος Ἀθάνατος, ἐλέησον ἡμᾶς.\n\nHoly God, Holy Mighty, Holy Immortal, have mercy on us.\n\nGlory to the Father, and to the Son, and to the Holy Spirit, now and ever and unto ages of ages. Amen.',
      '☦️ Lord Jesus Christ, Son of God, have mercy on me, a sinner.\n\nΚύριε Ἰησοῦ Χριστέ, Υἱὲ τοῦ Θεοῦ, ἐλέησόν με τὸν ἁμαρτωλόν.\n\nThrough the prayers of our holy fathers, Lord Jesus Christ our God, have mercy on us.',
      '☦️ O Heavenly King, Comforter, Spirit of Truth, who art everywhere present and fillest all things, Treasury of good things and Giver of life: come and dwell in us, cleanse us from every stain, and save our souls, O Good One.',
      '☦️ In the Name of the Father, and of the Son, and of the Holy Spirit. Amen.\n\nLord Jesus Christ, Son of God, have mercy on me.\n\nGlory to You, our God, glory to You.',
    ],
    scriptures: [
      { text: 'The Lord is my shepherd; I shall not want. He makes me lie down in green pastures. He leads me beside still waters. He restores my soul.', ref: 'Psalm 23:1-3' },
      { text: 'Be still, and know that I am God. I will be exalted among the nations, I will be exalted in the earth.', ref: 'Psalm 46:10' },
      { text: 'I am the vine; you are the branches. Whoever abides in me and I in him, he it is that bears much fruit, for apart from me you can do nothing.', ref: 'John 15:5' },
      { text: 'For God has not given us a spirit of fear, but of power and of love and of a sound mind.', ref: '2 Timothy 1:7' },
      { text: 'But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control.', ref: 'Galatians 5:22-23' },
      { text: 'Create in me a clean heart, O God, and renew a right spirit within me. Cast me not away from Your presence, and take not Your Holy Spirit from me.', ref: 'Psalm 51:10-11' },
      { text: 'Come to me, all who labor and are heavy laden, and I will give you rest.', ref: 'Matthew 11:28' },
      { text: 'The light shines in the darkness, and the darkness has not overcome it.', ref: 'John 1:5' },
    ],
    reflections: [
      'The Desert Fathers teach: "Sit in your cell and your cell will teach you everything." Today I bring stillness and attentiveness to whatever I do.',
      'The Orthodox tradition calls us to theosis — becoming more like God through grace. Every act of love, truth, and beauty today is participation in the divine nature.',
      'St. John Chrysostom said: "Prayer is the place of refuge for every worry, a foundation for cheerfulness, a source of constant happiness." I begin this day in that refuge.',
      'The Jesus Prayer — "Lord Jesus Christ, have mercy on me" — is my anchor today. In each breath, in each task, I return to this prayer of the heart.',
      'The icon tradition teaches us that matter can bear the divine. My work today, however material, can become a vessel for God\'s grace.',
      'St. Seraphim of Sarov said: "Acquire the Spirit of Peace and a thousand souls around you will be saved." Today I seek inner peace above all.',
    ],
    intentions: [
      'Lord Jesus Christ, Son of God, bless the work before me today. Grant me Your peace, Your wisdom, and the strength to do all things for Your glory.',
      'Most Holy Theotokos, save us. Through your intercessions, holy Mother of God, grant me grace for this day — patience in difficulty, joy in labor, love in all things.',
      'O Lord, grant me to greet the coming day in peace. Help me in all things to rely upon Your holy will. In every hour of the day reveal Your will to me.',
      'Lord, teach me to be generous. Teach me to serve You as You deserve; to give and not to count the cost; to labor and not to ask for reward.',
    ],
    closings: [
      'Through the prayers of our holy fathers, Lord Jesus Christ our God, have mercy on us and save us. Amen.\n\nGlory to the Father, and to the Son, and to the Holy Spirit, now and ever and unto ages of ages. Amen. ☦️',
      'Lord, now let Your servant depart in peace, according to Your word; for my eyes have seen Your salvation. Glory to God in all things. Amen. ☦️',
      'It is truly right to bless You, O Theotokos, ever blessed and most pure, and the Mother of our God. More honorable than the Cherubim, and more glorious beyond compare than the Seraphim. Amen. ☦️',
      'Preserve me, O Lord, by Your grace. Grant me a peaceful day and a sinless evening. To You, O Lord, I lift up my soul. Amen. ☦️',
    ],
  },

  'Evangelical Christianity': {
    icon: '✝️',
    nativeGreeting: 'Good morning, Lord',
    openings: [
      'Good morning, Lord! Thank You for this new day — a fresh mercy, a new beginning. I come before You with a grateful heart, ready to walk in Your purpose.',
      'Heavenly Father, I praise You for waking me up this morning. Your mercies are new every morning; great is Your faithfulness. I surrender this day to You.',
      'Lord Jesus, I thank You for Your grace that sustains me. This is the day that the Lord has made — I will rejoice and be glad in it!',
      'Father God, I come to You this morning with open hands and an open heart. Thank You for Your love that never fails. I commit this day to You.',
    ],
    scriptures: [
      { text: 'This is the day that the Lord has made; let us rejoice and be glad in it.', ref: 'Psalm 118:24' },
      { text: 'I can do all things through Christ who strengthens me.', ref: 'Philippians 4:13' },
      { text: 'For God so loved the world, that He gave His only Son, that whoever believes in Him should not perish but have eternal life.', ref: 'John 3:16' },
      { text: 'And we know that for those who love God all things work together for good, for those who are called according to His purpose.', ref: 'Romans 8:28' },
      { text: 'The Lord is my strength and my shield; my heart trusts in Him, and I am helped.', ref: 'Psalm 28:7' },
      { text: 'Be strong and courageous. Do not be frightened, and do not be dismayed, for the Lord your God is with you wherever you go.', ref: 'Joshua 1:9' },
      { text: 'Delight yourself in the Lord, and He will give you the desires of your heart.', ref: 'Psalm 37:4' },
      { text: 'But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.', ref: 'Isaiah 40:31' },
      { text: 'No weapon formed against you shall prosper, and every tongue that rises against you in judgment you shall condemn.', ref: 'Isaiah 54:17' },
      { text: 'The thief comes only to steal and kill and destroy. I came that they may have life and have it abundantly.', ref: 'John 10:10' },
    ],
    reflections: [
      'Jesus calls us to be salt and light in the world. Today my workplace, my family, my community — these are my mission field. How will I shine?',
      'Paul wrote: "Whatever you do, do it all for the glory of God." Today I turn my daily tasks into worship — not working for people, but for the Lord.',
      'God doesn\'t just save us from something — He saves us for something. Today I lean into the purpose He has designed specifically for me.',
      'The Bible says: "As iron sharpens iron, so one person sharpens another." Today I seek out those who sharpen me and offer the same to others.',
      'Jesus said: "Seek first the kingdom of God and His righteousness, and all these things will be added to you." Today I put first things first.',
      'David wrote: "Your word is a lamp to my feet and a light to my path." Today I let Scripture guide my decisions, not just my feelings.',
    ],
    intentions: [
      'Lord, I pray for divine appointments today — encounters You have planned that I might not expect. Open my eyes to see them and my heart to receive them.',
      'Father, give me the wisdom to make good decisions today. Help me steward my time, my resources, and my relationships well for Your kingdom.',
      'Jesus, be Lord over my schedule today. Where I plan, give me flexibility. Where I\'m uncertain, give me clarity. In all things, give me peace.',
      'Holy Spirit, fill me fresh today. Let me hear Your voice above the noise. Lead me to the right words, the right actions, the right attitude.',
    ],
    closings: [
      'Lord, I go into this day knowing that You go before me, behind me, and beside me. Nothing can separate me from Your love. In Jesus\' mighty name, Amen! 🙏',
      'Now to Him who is able to do immeasurably more than all we ask or imagine, according to His power that is at work within us — to Him be glory! Amen! 🙏',
      'May the God of hope fill you with all joy and peace in believing, so that by the power of the Holy Spirit you may abound in hope. Amen! 🙏',
      'The Lord bless you and keep you. The Lord make His face shine upon you and be gracious to you. The Lord lift up His countenance upon you and give you peace. Amen! 🙏',
    ],
  },

  Islam: {
    icon: '☪️',
    nativeGreeting: 'بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ — Bismillah ir-Rahman ir-Rahim',
    openings: [
      'بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\n\nIn the Name of God, the Most Gracious, the Most Merciful.\n\nAll praise is due to Allah, Lord of all the worlds. I begin this day in gratitude and submission to His will.',
      'بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\n\nIn the Name of God, the Most Gracious, the Most Merciful.\n\nAlhamdulillah — all praise belongs to Allah who gave us life after He caused us to sleep, and unto Him is the resurrection.',
      'بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\n\nIn the Name of God, the Most Gracious, the Most Merciful.\n\nO Allah, by Your leave we have reached the morning. By Your leave we live and die, and unto You is the resurrection.',
    ],
    scriptures: [
      { text: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ — All praise is due to Allah, Lord of all the worlds. The Most Gracious, the Most Merciful. Master of the Day of Judgment.', ref: 'Quran 1:2-4 (Al-Fatihah)' },
      { text: 'Indeed, with hardship comes ease. Indeed, with hardship comes ease.', ref: 'Quran 94:5-6 (Ash-Sharh)' },
      { text: 'And whoever puts their trust in Allah, He will be enough for them. Indeed, Allah achieves His purpose. Allah has already set a destiny for everything.', ref: 'Quran 65:3 (At-Talaq)' },
      { text: 'So verily, with the hardship, there is relief. Verily, with the hardship, there is relief.', ref: 'Quran 94:5-6 (Ash-Sharh)' },
      { text: 'Allah does not burden a soul beyond that it can bear.', ref: 'Quran 2:286 (Al-Baqarah)' },
      { text: 'And We have certainly made the Quran easy for remembrance, so is there any who will remember?', ref: 'Quran 54:17 (Al-Qamar)' },
      { text: 'Indeed, the mercy of Allah is near to the doers of good.', ref: 'Quran 7:56 (Al-A\'raf)' },
      { text: 'And when My servants ask you concerning Me — indeed I am near. I respond to the invocation of the supplicant when he calls upon Me.', ref: 'Quran 2:186 (Al-Baqarah)' },
    ],
    reflections: [
      'Islam teaches that every act done with the right niyyah (intention) becomes ibadah (worship). Today I set my intention: all that I do is in service to Allah.',
      'The Prophet Muhammad ﷺ said: "The best of people are those most beneficial to people." Today I seek to benefit those around me through my work and my character.',
      'Tawakkul — trusting in Allah while tying your camel. Today I work diligently and trust that the outcomes are in Allah\'s hands.',
      'The Quran teaches: "Indeed, Allah is with the patient." Patience (sabr) is not passive waiting but active perseverance with grace.',
      'The Prophet ﷺ said: "None of you truly believes until he loves for his brother what he loves for himself." Today I build with generosity of spirit.',
      'In Islamic tradition, seeking knowledge is an obligation. Today I approach every challenge as an opportunity to learn and grow closer to truth.',
    ],
    intentions: [
      'اللَّهُمَّ — O Allah, grant me wisdom in my work today. Let my efforts be a source of barakah (blessing) for my family and my community. Guide me on the straight path.',
      'Ya Rabb — O Lord, I ask You for beneficial knowledge, good provision, and accepted deeds. Make this day a means of drawing closer to You.',
      'O Allah, I ask You for strength to do what is right, patience to endure what is difficult, and wisdom to know the difference. Ameen.',
      'Allahumma — O Allah, make me grateful for Your blessings, patient in Your trials, and content with Your decree. Guide my work today toward what pleases You.',
    ],
    closings: [
      'حَسْبُنَا ٱللَّهُ وَنِعْمَ ٱلْوَكِيلُ\n\nHasbunallahu wa ni\'mal wakeel — Allah is sufficient for us, and He is the best Disposer of affairs.\n\nMay Allah grant you a blessed and productive day. Ameen. ☪️',
      'سُبْحَانَ ٱللَّهِ وَبِحَمْدِهِ\n\nSubhanAllahi wa bihamdihi — Glory be to Allah and praise Him.\n\nMay the peace and mercy of Allah be upon you today and always. Ameen. ☪️',
      'اللَّهُمَّ أَنْتَ السَّلاَمُ وَمِنْكَ السَّلاَمُ\n\nAllahumma Antas-Salaam wa minkas-salaam — O Allah, You are Peace and from You comes peace.\n\nGo in peace today. Ameen. ☪️',
    ],
  },

  // For blended alignments or less common primary traditions
  Universal: {
    icon: '🕊️',
    nativeGreeting: 'In the stillness of this morning',
    openings: [
      'In the stillness of this morning, I pause to acknowledge the sacred — the breath in my lungs, the light breaking through, the gift of another day to live with purpose.',
      'I begin this day with gratitude — for life, for consciousness, for the opportunity to create meaning through my actions.',
      'As a new day dawns, I center myself in what is true, good, and beautiful. I am here. I am present. I am ready.',
    ],
    scriptures: [
      { text: 'What does the Lord require of you but to do justice, and to love kindness, and to walk humbly with your God?', ref: 'Micah 6:8' },
      { text: 'Trust in the Lord with all your heart, and do not lean on your own understanding. In all your ways acknowledge Him, and He will make straight your paths.', ref: 'Proverbs 3:5-6' },
      { text: 'The beginning of wisdom is this: Get wisdom. Though it cost all you have, get understanding.', ref: 'Proverbs 4:7' },
      { text: 'There is a time for everything, and a season for every activity under the heavens.', ref: 'Ecclesiastes 3:1' },
      { text: 'Whatever is true, whatever is honorable, whatever is just, whatever is pure, whatever is lovely, whatever is commendable — think about these things.', ref: 'Philippians 4:8' },
      { text: 'For everything there is a season, and a time for every matter under heaven.', ref: 'Ecclesiastes 3:1' },
    ],
    reflections: [
      'Across all traditions, a common thread emerges: our actions define us more than our beliefs alone. Today I choose to act with integrity and compassion.',
      'The world\'s great traditions agree: wisdom begins with humility, and service to others is the highest calling. Today I seek both.',
      'Every spiritual tradition teaches the golden rule in its own language. Today I practice treating others as I wish to be treated — in word, in deed, in thought.',
      'Faith, at its core, is trusting that life has meaning beyond what we can see. Today I act on that trust.',
      'The mystics of every tradition speak of finding the divine in the everyday. Today I look for transcendence in the mundane.',
    ],
    intentions: [
      'May I walk this day with integrity — true to my values, present to those around me, and faithful to the work set before me.',
      'I set my intention for this day: to be a force for good, to create more than I consume, and to leave each person I meet a little better.',
      'Grant me the serenity to accept what I cannot change, the courage to change what I can, and the wisdom to know the difference.',
      'Today I commit to building something meaningful — not just for myself, but for those who come after me. Let my work be my legacy.',
    ],
    closings: [
      'May peace be upon you today. Go forward with courage, work with purpose, and return this evening with a grateful heart. 🕊️',
      'May you be blessed with strength for today\'s challenges, wisdom for today\'s decisions, and grace for today\'s encounters. Peace be with you. 🕊️',
      'The path stretches forward. Walk it with intention, with kindness, and with faith that your steps matter. Shalom. Salaam. Peace. 🕊️',
    ],
  },
};

// Map tradition names from compass to template keys
export function getTraditionKey(alignment: string): string {
  const mapping: Record<string, string> = {
    'Judaism': 'Judaism',
    'Reform Judaism': 'Judaism',
    'Orthodox Judaism': 'Judaism',
    'Conservative Judaism': 'Judaism',
    'Catholicism': 'Catholicism',
    'Roman Catholicism': 'Catholicism',
    'Orthodox Christianity': 'Orthodox Christianity',
    'Eastern Orthodox': 'Orthodox Christianity',
    'Greek Orthodox': 'Orthodox Christianity',
    'Russian Orthodox': 'Orthodox Christianity',
    'Evangelical Christianity': 'Evangelical Christianity',
    'Evangelical Protestantism': 'Evangelical Christianity',
    'Protestantism': 'Evangelical Christianity',
    'Mainline Protestantism': 'Evangelical Christianity',
    'Islam': 'Islam',
    'Sunni Islam': 'Islam',
    'Shia Islam': 'Islam',
    'Sufism': 'Islam',
  };
  return mapping[alignment] || 'Universal';
}

// Deterministic "random" based on date — same prayer all day
function dateHash(dateStr: string, salt: number = 0): number {
  let hash = salt;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function pickElement<T>(arr: T[], dateStr: string, salt: number = 0): T {
  const idx = dateHash(dateStr, salt) % arr.length;
  return arr[idx];
}

export interface GeneratedPrayer {
  tradition_alignment: string;
  opening: string;
  scripture_text: string;
  scripture_ref: string;
  reflection: string;
  intention: string;
  closing: string;
  full_text: string;
}

export function generatePrayer(
  primaryAlignment: string,
  secondaryAlignment: string | null,
  dateStr: string,
  lessonTopic?: string | null,
): GeneratedPrayer {
  const tradKey = getTraditionKey(primaryAlignment);
  const templates = TRADITION_PRAYERS[tradKey] || TRADITION_PRAYERS['Universal'];
  
  // Pick elements deterministically based on date
  const opening = pickElement(templates.openings, dateStr, 1);
  const scripture = pickElement(templates.scriptures, dateStr, 2);
  let reflection = pickElement(templates.reflections, dateStr, 3);
  const intention = pickElement(templates.intentions, dateStr, 4);
  const closing = pickElement(templates.closings, dateStr, 5);

  // If there's a lesson topic, weave it into the reflection
  if (lessonTopic) {
    reflection = `Today's lesson explores "${lessonTopic}." ${reflection}`;
  }

  // If blended, add a secondary element
  let blendNote = '';
  if (secondaryAlignment && secondaryAlignment !== primaryAlignment) {
    const secKey = getTraditionKey(secondaryAlignment);
    const secTemplates = TRADITION_PRAYERS[secKey];
    if (secTemplates && secKey !== tradKey) {
      const secScripture = pickElement(secTemplates.scriptures, dateStr, 6);
      blendNote = `\n\n— From the ${secondaryAlignment} tradition —\n${secScripture.text}\n— ${secScripture.ref}`;
    }
  }

  const full_text = [
    opening,
    '',
    '— Scripture —',
    scripture.text,
    `— ${scripture.ref}`,
    blendNote,
    '',
    '— Reflection —',
    reflection,
    '',
    '— Intention —',
    intention,
    '',
    '— Closing —',
    closing,
  ].filter(Boolean).join('\n');

  return {
    tradition_alignment: primaryAlignment,
    opening,
    scripture_text: scripture.text,
    scripture_ref: scripture.ref,
    reflection,
    intention,
    closing,
    full_text,
  };
}
