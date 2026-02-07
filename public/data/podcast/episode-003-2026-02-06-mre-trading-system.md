# Episode Script: I Built an AI Trading Desk (And You Can Too)

**Episode #:** 3  
**Title:** I Built an AI Trading Desk (And You Can Too)  
**Pillar:** AI for Builders  
**Target Length:** 25-30 minutes  
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

> I'm not talking about some get-rich-quick scheme. I'm talking about a systematic approach to trading that combines quantitative signals, market sentiment, prediction markets, and an actual fleet of AI agents that analyze, recommend, and track every trade.

> I built it. It's running right now. It scored enterprise-level results on JP Morgan's analysis framework — capable of managing over 500 million dollars in assets.

> And today, I'm going to show you exactly how it works.

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

## SECTION 1: How I Got Here — The Problem with Buy and Hold (5 min)

> Let me start with how I got here, because the origin story matters.

> Like most retail investors, I started with the conventional wisdom: buy and hold. Put your money in index funds. Don't try to time the market. Set it and forget it.

*(beat)*

> Sounds great, right? Except here's what nobody tells you: **buy and hold can be dangerous.**

> Think about it. If you bought the S&P 500 in 2000, you didn't break even until 2013. Thirteen years of waiting. If you bought in 2007, you waited until 2013 too. If you needed that money in between — for a house, for retirement, for an emergency — you were selling at a loss.

> Buy and hold assumes you have infinite time and infinite emotional resilience. Most people have neither.

> I stumbled across Chris Vermeulen's work a few years ago. Chris is a quantitative researcher who specializes in what he calls "asset rotation" — the idea that you shouldn't just buy and hold one thing forever. Different asset classes perform well at different times. Stocks, bonds, gold, real estate, energy — they rotate in and out of favor based on the macro environment.

> Here's the insight that changed everything for me: **you don't need to predict the future. You just need to follow the regime.**

> Is the market in a bull regime? Buy stocks. Bear regime? Rotate to bonds or gold. Sideways? Stay in cash and wait for clarity.

> That's the core of asset rotation. Not day trading. Not predicting every tick. Just reading the environment and positioning accordingly.

> The problem is, doing this manually is exhausting. You'd have to track dozens of indicators across multiple asset classes every single day. So I asked a simple question: What if I could automate this? What if I could build a system that does the analysis for me?

> That question became the MRE — the Multi-Regime Engine.

---

## SECTION 2: What is a Regime Signal? (4 min)

> Before we go further, let me explain what a regime signal actually is, because this is the foundation of everything.

> A **regime** is the underlying state of the market. Not the daily noise — the trend. There are three primary regimes:

> **Bull Regime** — Higher highs and higher lows over an extended period. Momentum is positive. The trend is up. This is when you want to be aggressive with risk assets.

> **Bear Regime** — Lower highs and lower lows. Momentum is negative. The trend is down. This is when you want to be defensive — cash, bonds, or inverse positions.

> **Sideways Regime** — No clear direction. The market is consolidating, waiting for a catalyst. This is when you wait for a breakout before committing.

*(beat)*

> Here's why regime signals are so effective: **they filter out the noise.**

> Every day, the financial news tells you the market is either crashing or mooning. It's designed to trigger emotion. But when you zoom out and look at the regime, you see the actual trend.

> Think of it like weather versus climate. The daily price action is weather — unpredictable, noisy, stressful. The regime is climate — the underlying pattern that determines what you should wear.

> Our system calculates regime signals for every major asset class: US stocks, international stocks, bonds, gold, healthcare, energy, real estate, technology. Each one can be in a different regime at the same time.

> For example, right now, gold is in a bull regime — it's been bullish for over 100 days. But small-cap stocks are in a bear regime. If you were blindly buying and holding everything, you'd be holding losers alongside winners. Regime awareness lets you rotate into what's working.

---

## SECTION 3: The MRE Engine — How It Works (6 min)

> So how does the MRE engine actually calculate all of this? Let me walk you through the components.

**Component 1: Fear and Greed Index**

> We pull the CNN Fear & Greed Index daily. This is a composite of seven market indicators — volatility, market momentum, stock price strength, put/call ratio, junk bond demand, market breadth, and safe haven demand.

> When the index is below 30 — extreme fear — that's historically been a buying opportunity. When it's above 70 — extreme greed — that's when you get cautious. We use this as a contrarian indicator.

**Component 2: Regime Detection**

> For each asset class, we calculate regime using exponential moving averages and momentum over 100+ day windows. A bull regime means price is above key moving averages with positive momentum. Bear means the opposite.

> But we don't just say "bull or bear" — we also calculate **confidence**. How strong is the regime? A regime with 85% confidence is very different from one with 55% confidence. This affects position sizing later.

**Component 3: Fibonacci Retracements AND Projections**

> This is where it gets technical, but stay with me because this is powerful.

> **Fibonacci retracements** use two points — a swing high and a swing low — to identify potential support and resistance levels during a pullback. The key levels are 38.2%, 50%, and 61.8%. If we're in a bull regime and price pulls back to the 38.2% retracement, that's often a buying opportunity.

> **Fibonacci projections** go further. They use THREE points — swing low, swing high, and pullback low — to predict where price might go AFTER the pullback. The key projection levels are 127.2%, 161.8%, and 261.8% extensions.

> So in a bull regime, we're looking for pullbacks to retracement levels for entry, and projecting extensions for profit targets. It's math, not magic.

**Component 4: Prediction Markets — Kalshi and Polymarket**

> Here's something most retail systems don't include: we incorporate data from prediction markets.

> Kalshi and Polymarket are platforms where people bet real money on future outcomes — economic indicators, Fed decisions, political events. Unlike surveys or pundit opinions, prediction markets have skin in the game.

> We pull their data on key questions: Will the Fed raise rates? Will inflation surprise to the upside? Will there be a recession in 2026?

> This gives us a probabilistic view of the macro environment that complements our technical analysis. If the prediction markets are pricing in 70% chance of a rate hike but our regime signals are still bullish, that's a yellow flag.

**Component 5: Confidence Models and Expected Accuracy**

> Every signal we generate comes with a confidence score and expected accuracy — and here's how we got those numbers.

> We ran backtests for an **entire week straight**. Not just once — continuously. The system would test a hypothesis, measure the results, identify weaknesses, and improve itself. Then test again. Hundreds of iterations.

> By the end, we had expected accuracy numbers for each asset class based on historical performance. When the regime signal for gold is bullish with these specific parameters, it's been correct 65% of the time over the past decade. That's not a guess — that's empirical.

**Component 6: The Research Foundation**

> The AI models powering this aren't just prompting ChatGPT. We incorporated actual quantitative research into the training.

> Papers on momentum factor investing. Research on regime-switching models. Analysis of Fibonacci effectiveness in trending markets. The models understand WHY these signals work, not just what to calculate.

---

## SECTION 4: The JP Morgan Validation (4 min)

> Here's where I need to pause and talk about validation. Because anyone can build a trading system. The question is: does it actually work?

> We ran our system through JP Morgan's Cross-Asset Strategy and Quantitative Research framework — the same institutional-grade analysis they use to evaluate hedge fund strategies. And the results were... honestly, better than I expected.

*(beat)*

> Let me give you the specific numbers.

**Statistical Significance**

> We ran over **4,100 backtests** across 27 unique configurations. That's not cherry-picking one good result — that's stress-testing across market conditions.

> The overall accuracy came in at **60.09%**. But here's the important part: Buy signal accuracy was **65.65%** with a p-value of essentially zero. That means the result is statistically significant at the 1% level. This isn't random chance.

> The effect size — Cohen's d — was 0.65, which JP Morgan classifies as MEDIUM. Not a weak signal. Not noise.

**Risk-Adjusted Returns**

> The Sharpe ratio — which measures return per unit of risk — averaged **1.13**. Anything above 1.0 is considered good. 45% of our configurations scored above 1.0, and 25% scored above 2.0.

> Breaking it down by asset class, the standouts were:
> - International stocks: Sharpe of **2.19**
> - Broad market: **1.99**
> - Healthcare: **1.78**
> - Financials: **1.44**
> - Technology: **1.24**

> The weakest performers were commodities and bonds — which makes sense, because those asset classes behave differently than equities.

**Institutional Capacity**

> This is the part that blew my mind. JP Morgan's framework assessed our system's **capacity** — how much money it could manage before market impact becomes a problem.

> The verdict: **$100 million to $500 million deployable.** With tier-1 liquidity in broad market, financials, bonds, and technology.

> Their recommended initial allocation? $10 to $50 million, prioritizing broad market index ETFs.

> I'm not managing $50 million. But the system is built to that scale. That's not a toy strategy.

**Alpha Sustainability**

> The framework also assessed whether our edge would decay over time — a critical question for any quantitative strategy.

> The finding: **MEDIUM-HIGH sustainability** with an expected half-life of 2-3 years. The key differentiators were:
> - Our Kalshi prediction market integration — which showed **96.6% accuracy** in directional calls
> - Multi-asset confirmation signals
> - Regime-aware position sizing
> - Cross-asset correlation insights

> The crowding risk was rated MEDIUM. The Fear & Greed Index is publicly available, but few people trade it systematically with the additional filters we use.

**The Verdict**

> JP Morgan's overall assessment: **APPROVED FOR DEPLOYMENT.**

> Key recommendation: Deploy with asymmetric weighting — meaning lean heavier on fear signals than greed signals, because buying extreme fear has historically outperformed selling extreme greed.

> That's exactly what our system does.

> Now, am I managing $500 million? No. But knowing the system passed institutional-grade scrutiny matters. It's not a toy.

---

## SECTION 5: Today's Plays — From Signals to Action (4 min)

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

> Why? The regime had been bullish for 117 days. Confidence was 85%. Momentum was +9.89% over 20 days. And the price had just pulled back to the 38.2% Fibonacci retracement — right at the entry zone. The Fibonacci projections gave us clear profit targets at the 127.2% and 161.8% extensions.

> Meanwhile, Trump had just announced his Fed Chair pick, which caused a 5% selloff in gold. The news was bad, but the technicals were screaming opportunity. And the prediction markets were still pricing gold-favorable outcomes.

> That's the power of systematic analysis. While everyone else was panicking about headlines, the system was saying: "This is exactly the pullback we wanted. Buy the dip."

**Position Sizing**

> One more critical piece: position sizing. I don't bet the same amount on every trade.

> Higher confidence equals larger position. At 50% confidence, I allocate 8% of the portfolio. At 90% confidence, I go up to 25%. This is Kelly Criterion logic applied to a constrained portfolio.

> Every BUY signal also comes with a stop-loss based on Fibonacci retracements and profit targets based on projections. No emotion. Just math.

---

## SECTION 6: The Agent Fleet — AI That Works for You (5 min)

> Now here's where it gets interesting. Having a trading system is one thing. Operating it is another.

> I work a full-time job. I have two kids. I can't be staring at charts all day. So I built something better: **a fleet of AI agents that manage the system for me.**

> Four agents, each with a specific job:

**Agent 1: The Updater**

> This agent runs every 5 minutes during market hours — 6:30 AM to 1:00 PM Pacific. Its job is simple: refresh all the prices, check if any pending orders have triggered, and keep the dashboard current.

> It's the grunt worker. It doesn't think. It just fetches data and pushes updates.

**Agent 2: The Advisor**

> This is the smart one. Before I execute any trade, I ask the Advisor for analysis.

> The Advisor takes the quantitative signal from Today's Plays and adds qualitative context. It searches recent news. It looks for chart patterns — double tops, head and shoulders, wedges. It checks the prediction market data from Kalshi and Polymarket. It checks historical precedent.

> And here's the key: **the Advisor can override the system.**

> If Today's Plays says BUY, but the Advisor sees a bearish divergence forming, or the prediction markets just shifted against the trade, it'll say: "System shows BUY, but I recommend WAIT. Here's why."

> It's the human judgment layer, implemented in AI.

**Agent 3: The Analyst**

> Every day after market close, the Analyst reviews performance. It tracks which signals were accurate, which failed, and why.

> It maintains a running accuracy score for each asset class. It identifies patterns — maybe healthcare signals have been underperforming, or gold signals work better in fear regimes.

> The output goes to a shared document that all agents can read: "Strategy Issues." If something's broken, the Analyst finds it.

**Agent 4: The Optimizer**

> Once a week, the Optimizer takes all the feedback from the Analyst and asks: How can we improve?

> Maybe the confidence threshold for energy stocks should be higher. Maybe the Fibonacci entry zone is too tight. Maybe we should weight the prediction market data more heavily.

> The Optimizer proposes changes, tests them against historical data, and logs improvements to a changelog. This is the same continuous improvement loop we used during that week of backtesting — now running forever.

*(beat)*

> Here's the thing: this isn't science fiction. Every one of these agents is running right now on my Mac Mini, using Claude as the underlying model. They communicate through shared files. They have their own memory. They learn.

> Total cost? About $50/month in API calls. Less than most trading platform subscriptions.

---

## SECTION 7: The Dashboard — Tracking Performance (2 min)

> I'm a visual person. I need to see what's happening.

> So I built a dashboard that shows everything in one place:

> - **Market Sentiment**: Fear/Greed index, global regime, prediction market signals, volatility level
> - **Today's Plays**: The synthesized BUY/HOLD/WATCH/WAIT signals for each asset
> - **Paper Portfolio**: All open positions, pending orders, cash balance
> - **Performance Chart**: My equity curve vs. SPY, the benchmark

> One-click trading. I see a BUY signal, I click the button, and the system calculates position size based on confidence, sets the stop-loss and take-profit using Fibonacci levels, and queues the trade.

> Everything persists. Every trade is logged. Every decision is traceable.

> Right now, the system just started — I'm paper trading to validate before going live. But the infrastructure is there. When the paper trades prove out, I flip a switch and it's real money.

---

## FAITH TIE-IN (1.5 min)

> You might be wondering what any of this has to do with faith. Bear with me.

> There's a proverb that says: "The plans of the diligent lead surely to abundance, but everyone who is hasty comes only to poverty."

*(beat)*

> Notice what it doesn't say. It doesn't say the plans of the talented. It doesn't say the plans of the lucky. It says the diligent.

> Diligence is showing up every day. It's building systems that work while you sleep. It's not chasing the hot stock tip — it's following a process. It's running backtests for a week straight because you want to get it right.

> That's what this system is about. Not getting rich quick. Not gambling. But diligently applying wisdom to decisions, removing emotion, and trusting the process.

> Work done in secret has its own reward. The agents run whether I'm watching or not. The system compounds whether I check it or not.

> That's the goal. Build once. Let it work. Focus on what matters — family, craft, calling.

---

## RECAP & TAKEAWAYS (1.5 min)

> Let's bring it home. Five things to remember from today:

1. **Buy and hold isn't always safe.** Asset rotation — moving between what's working — can protect you during downturns and capture upside during recoveries. Chris Vermeulen's work opened my eyes to this.

2. **Regime signals cut through the noise.** Don't react to daily headlines. Read the underlying trend. Bull, bear, or sideways — position accordingly.

3. **Combine technical analysis with prediction markets.** Fibonacci retracements give you entry points. Projections give you targets. Kalshi and Polymarket give you probabilistic views on macro events. Together, they're powerful.

4. **Validate with institutional-grade frameworks.** We didn't just guess that our system works — we proved it. 4,100 backtests. 65.6% buy accuracy. Sharpe ratio of 1.13. JP Morgan's framework rated it deployable at $100-500 million scale.

5. **AI agents can manage complexity for you.** You don't need to watch the market all day. Build a team of specialized agents — updater, advisor, analyst, optimizer — and let them do the work.

---

## CALL TO ACTION (30 sec)

> If you want to see this system in action, I'm going to share the architecture in the newsletter this week. The actual code. The prompt templates. The agent configurations. The research papers we incorporated.

> Link in the show notes. Subscribe if you haven't.

> And if you're building something similar — trading, research, operations — I'd love to hear about it. Reply to the newsletter or find me on X. Let's compare notes.

---

## OUTRO (15 sec)

> That's The Builder's Frequency. I'm Joshua Levy. Keep building, and I'll see you next week.

---

## POST-RECORD NOTES

**Clips to extract:**
- [ ] Cold open (0:00-0:45) — "What if I told you..."
- [ ] Buy and hold is dangerous — "Thirteen years of waiting"
- [ ] Chris Vermeulen insight — "You don't need to predict the future"
- [ ] Regime explanation — "Weather versus climate"
- [ ] Fibonacci retracements vs projections — "Three points to predict"
- [ ] JP Morgan stats — "65.6% buy accuracy, Sharpe of 1.13"
- [ ] Capacity estimate — "$100 million to $500 million deployable"
- [ ] Kalshi accuracy — "96.6% accurate in directional calls"
- [ ] The GLD example — "While everyone was panicking..."
- [ ] Agent fleet overview — "Four agents, each with a specific job"
- [ ] The Advisor override — "Here's the key..."
- [ ] Faith tie-in — "The plans of the diligent..."

**Keywords for SEO:**
- AI trading system
- Asset rotation strategy
- Chris Vermeulen
- Regime trading
- Fibonacci retracement projection
- Prediction markets trading
- Kalshi Polymarket
- JP Morgan quant analysis
- Institutional trading system
- AI agents automation
- Claude AI trading

**Estimated runtime:** 32 minutes (4,800 words at 150 wpm)

**Attachments:**
- jpm_institutional_analysis.json — Full JP Morgan analysis report
