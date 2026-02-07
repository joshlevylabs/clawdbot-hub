# Episode Script: I Built an AI Trading Desk (And You Can Too)

**Episode #:** 3  
**Title:** I Built an AI Trading Desk (And You Can Too)  
**Pillar:** AI for Builders  
**Target Length:** 20-25 minutes  
**Recording Date:** TBD

---

## PRE-RECORD CHECKLIST
- [ ] Water nearby
- [ ] Phone on silent
- [ ] SM7B positioned correctly
- [ ] Camera framed
- [ ] Quiet environment
- [ ] Energy up (stand if needed)

---

## COLD OPEN (45 sec)

> What if I told you that you could build your own trading desk — complete with a team of AI analysts working around the clock — for less than the cost of a Bloomberg terminal subscription?

*(beat)*

> I'm not talking about some get-rich-quick scheme. I'm talking about a systematic approach to trading that combines quantitative signals, market sentiment, and an actual fleet of AI agents that analyze, recommend, and track every trade.

> I built it. It's running right now. And today, I'm going to show you exactly how it works.

---

## INTRO (30 sec)

> You're listening to The Builder's Frequency. I'm Joshua Levy — test engineer by day, founder by night. This is where we talk about building things that matter: businesses, systems, and a life worth passing down.

---

## EPISODE SETUP (1.5 min)

**Today's Topic:** How I built an AI-powered trading system called MRE — the Multi-Regime Engine — and how you can apply the same principles to any domain.

**Why It Matters:** The barrier between retail and institutional trading has never been lower. The same AI tools that hedge funds are scrambling to adopt are available to anyone who can write a prompt.

**What You'll Walk Away With:** 
> By the end of this episode, you'll understand the architecture of an AI trading system, how to synthesize multiple data sources into actionable signals, and how to build a team of AI agents that work for you 24/7.

> Whether you want to trade or not, the patterns here apply to any complex decision-making system. Stick with me.

---

## SECTION 1: The MRE Strategy — What It Actually Does (5 min)

> Let me start by addressing the elephant in the room. I'm not a financial advisor. I'm an engineer who got frustrated by two things: first, the amount of noise in financial media, and second, the realization that most retail investors are trading on vibes.

*(beat)*

> So I asked a simple question: What would it look like to trade based on data instead of emotion?

> That question led me to the work of Robin Vermeulen — a quantitative researcher who developed a framework for understanding market regimes. Not day trading. Not predicting every tick. But understanding the macro environment: Is the market in a bull regime? Bear? Sideways?

> Here's the core insight: **Different regimes require different strategies.** Buying the dip works great in a bull market. It'll destroy you in a bear market. Obvious in hindsight, but most retail traders don't systematically track which regime they're in.

**The MRE engine tracks five key components:**

> **First: Fear and Greed.** We pull the CNN Fear & Greed Index daily. When fear is extreme — below 30 — that's historically been a buying opportunity. When greed is extreme — above 70 — that's when you get cautious.

> **Second: Regime Detection.** For each asset class — stocks, bonds, gold, healthcare, energy — we calculate whether we're in a bull, bear, or sideways regime. This uses exponential moving averages and momentum calculations. A bull regime means higher highs and higher lows over the past 100+ days.

> **Third: Fibonacci Levels.** Once we know the regime, we calculate Fibonacci retracement levels from the recent swing high to swing low. These give us specific entry zones, support levels, and profit targets. Not magic — just math.

> **Fourth: Confidence Scoring.** Every signal gets a confidence score based on regime strength, momentum alignment, and historical accuracy. Low confidence means small positions. High confidence means we lean in.

> **Fifth: Expected Accuracy.** We track how often similar signals have been correct historically. A signal that's been 70% accurate over 100+ instances is very different from one that's been 50% accurate.

> All of this runs automatically. Every market day, the engine pulls fresh data, recalculates everything, and produces what I call the "MRE Signals" — a JSON file that tells me exactly what the system thinks about every asset class.

---

## SECTION 2: Today's Plays — From Signals to Action (5 min)

> Here's the thing most people get wrong about quantitative trading: having data isn't the same as having a decision.

> I've got signals for 15 different asset classes. Do I trade all of them? No. The raw signals aren't actionable — they're inputs.

> So I built a second layer: **Today's Plays.**

> Today's Plays synthesizes the raw signals into four categories:

> **BUY** — The signal is strong. We're in a bull regime with 70%+ confidence, momentum is positive, and the price is within 3% of our Fibonacci entry zone. Or the Fear index is below 30 and we're buying the fear.

> **WATCH** — Sideways regime. Could break either direction. We're watching for a breakout.

> **HOLD** — Bull regime, but the price has run too far from the entry zone. Don't chase. Wait for a pullback.

> **WAIT** — Bear regime. Capital preservation mode. Cash is a position.

*(beat)*

> Let me give you an example from this week. GLD — the gold ETF — was showing as a BUY.

> Why? The regime had been bullish for 117 days. Confidence was 85%. Momentum was +9.89% over 20 days. And the price had just pulled back to the 38.2% Fibonacci retracement — right at the entry zone.

> Meanwhile, Trump had just announced his Fed Chair pick, which caused a 5% selloff in gold. The news was bad, but the technicals were screaming opportunity.

> That's the power of systematic analysis. While everyone else was panicking about headlines, the system was saying: "This is exactly the pullback we wanted. Buy the dip."

**Position Sizing**

> One more critical piece: position sizing. I don't bet the same amount on every trade.

> The formula is simple: higher confidence equals larger position. At 50% confidence, I allocate 8% of the portfolio. At 90% confidence, I go up to 25%. This isn't arbitrary — it's Kelly Criterion logic applied to a constrained portfolio.

> Every BUY signal also comes with a stop-loss and profit target based on Fibonacci extensions. If GLD hits the 127.2% extension, we take profit. If it falls below the 61.8% retracement, we cut the loss.

> No emotion. Just math.

---

## SECTION 3: The Agent Fleet — AI That Works for You (6 min)

> Now here's where it gets interesting. Having a trading system is one thing. Operating it is another.

> I work a full-time job. I have two kids. I can't be staring at charts all day. So I built something better: **a fleet of AI agents that manage the system for me.**

> Four agents, each with a specific job:

**Agent 1: The Updater**

> This agent runs every 5 minutes during market hours — 6:30 AM to 1:00 PM Pacific. Its job is simple: refresh all the prices, check if any pending orders have triggered, and keep the dashboard current.

> It's the grunt worker. It doesn't think. It just fetches data and pushes updates.

**Agent 2: The Advisor**

> This is the smart one. Before I execute any trade, I ask the Advisor for analysis.

> The Advisor takes the quantitative signal from Today's Plays and adds qualitative context. It searches recent news. It looks for chart patterns — double tops, head and shoulders, wedges. It checks historical precedent.

> And here's the key: **the Advisor can override the system.**

> If Today's Plays says BUY, but the Advisor sees a bearish divergence forming or a major news event that changes the thesis, it'll say: "System shows BUY, but I recommend WAIT. Here's why."

> It's the human judgment layer, implemented in AI.

**Agent 3: The Analyst**

> Every day after market close, the Analyst reviews performance. It tracks which signals were accurate, which failed, and why.

> It maintains a running accuracy score for each asset class. It identifies patterns — maybe healthcare signals have been underperforming, or gold signals work better in fear regimes.

> The output goes to a shared document that all agents can read: "Strategy Issues." If something's broken, the Analyst finds it.

**Agent 4: The Optimizer**

> Once a week, the Optimizer takes all the feedback from the Analyst and asks: How can we improve?

> Maybe the confidence threshold for energy stocks should be higher. Maybe the Fibonacci entry zone is too tight. Maybe we should add a filter for earnings season.

> The Optimizer proposes changes, tests them against historical data, and logs improvements to a changelog. It's continuous improvement, automated.

*(beat)*

> Here's the thing: this isn't science fiction. Every one of these agents is running right now on my Mac Mini, using Claude as the underlying model. They communicate through shared files. They have their own memory. They learn.

> Total cost? About $50/month in API calls. Less than most trading platform subscriptions.

---

## SECTION 4: The Dashboard — Tracking Performance (3 min)

> I'm a visual person. I need to see what's happening.

> So I built a dashboard that shows everything in one place:

> - **Market Sentiment**: Fear/Greed index, global regime, volatility level
> - **Today's Plays**: The synthesized BUY/HOLD/WATCH/WAIT signals for each asset
> - **Paper Portfolio**: All open positions, pending orders, cash balance
> - **Performance Chart**: My equity curve vs. SPY, the benchmark

> One-click trading. I see a BUY signal, I click the button, and the system calculates position size, sets the stop-loss and take-profit, and queues the trade.

> If it's after market hours, the trade queues automatically and executes at the next open.

> Everything persists. Every trade is logged. Every decision is traceable.

> And here's what I love most: I can see how I'm doing versus just buying and holding SPY.

> Right now, the system just started — I'm paper trading to validate before going live. But the infrastructure is there. When the paper trades prove out, I flip a switch and it's real money.

---

## FAITH TIE-IN (1.5 min)

> You might be wondering what any of this has to do with faith. Bear with me.

> There's a proverb that says: "The plans of the diligent lead surely to abundance, but everyone who is hasty comes only to poverty."

*(beat)*

> Notice what it doesn't say. It doesn't say the plans of the talented. It doesn't say the plans of the lucky. It says the diligent.

> Diligence is showing up every day. It's building systems that work while you sleep. It's not chasing the hot stock tip — it's following a process.

> That's what this system is about. Not getting rich quick. Not gambling. But diligently applying wisdom to decisions, removing emotion, and trusting the process.

> Work done in secret has its own reward. The agents run whether I'm watching or not. The system compounds whether I check it or not.

> That's the goal. Build once. Let it work. Focus on what matters — family, craft, calling.

---

## RECAP & TAKEAWAYS (1 min)

> Let's bring it home. Three things to remember from today:

1. **Regime matters more than signals.** Know whether you're in a bull, bear, or sideways market before you trade. Different regimes require different strategies.

2. **Synthesize, don't just aggregate.** Having data isn't the same as having a decision. Build a layer that converts raw signals into clear actions: BUY, HOLD, WATCH, WAIT.

3. **AI agents can manage complexity for you.** You don't need to watch the market all day. Build a team of specialized agents — an updater, an advisor, an analyst, an optimizer — and let them do the work.

---

## CALL TO ACTION (30 sec)

> If you want to see this system in action, I'm going to share the architecture in the newsletter this week. The actual code. The prompt templates. The agent configurations.

> Link in the show notes. Subscribe if you haven't.

> And if you're building something similar — trading, research, operations — I'd love to hear about it. Reply to the newsletter or find me on X. Let's compare notes.

---

## OUTRO (15 sec)

> That's The Builder's Frequency. I'm Joshua Levy. Keep building, and I'll see you next week.

---

## POST-RECORD NOTES

**Clips to extract:**
- [ ] Cold open (0:00-0:45) — "What if I told you..."
- [ ] Today's Plays explanation — "BUY, HOLD, WATCH, WAIT"
- [ ] The GLD example — "While everyone was panicking..."
- [ ] Agent fleet overview — "Four agents, each with a specific job"
- [ ] The Advisor can override — "Here's the key..."
- [ ] Faith tie-in — "The plans of the diligent..."

**Keywords for SEO:**
- AI trading system
- Quantitative trading retail
- Fear and Greed Index strategy
- Fibonacci trading
- AI agents automation
- Claude AI trading

**Estimated runtime:** 22 minutes (3,300 words at 150 wpm)
