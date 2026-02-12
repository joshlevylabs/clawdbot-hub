# Episode Script: I Built an AI Trading Desk (And You Can Too)

**Episode #:** 3  
**Title:** I Built an AI Trading Desk (And You Can Too)  
**Pillar:** AI for Builders  
**Target Length:** 35-38 minutes  
**Recording Date:** TBD

---

## SCRIPT VERSION

| Version | Date | Changes |
|---------|------|---------|
| v8 | 2026-02-13 | Major update: MRE V13 "Universe Edition" — 676 tickers, 5 strategies, overnight optimizer, paper trading status, bug war stories, expanded agent fleet |
| v7 | 2026-02-07 | Added legal disclaimers + "Today's Plays" newsletter CTAs throughout (after intro, after Section 5, strengthened CTA section) |
| v6 | 2026-02-07 | Merged "Why I'm Building This" + "How I Got Here" into single cohesive Section 1 |

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

> What if I told you that you could build your own trading desk — covering 676 assets, running five independent strategies, with a team of AI analysts optimizing parameters overnight — for less than the cost of a Bloomberg terminal subscription?

*(beat)*

> I'm not talking about some get-rich-quick scheme. I'm talking about a systematic approach to trading that combines quantitative signals, market sentiment, prediction markets, thirty-four thousand correlated pairs, and an actual fleet of AI agents that analyze, recommend, and track every trade.

> I built it in eight days. It's running right now. It scored enterprise-level results on JP Morgan's analysis framework — capable of managing over 500 million dollars in assets.

> And today, I'm going to show you exactly how it works — including the bugs that almost blew it up.

---

## INTRO (30 sec)

> You're listening to The Builder's Frequency. I'm Joshua Levy — test engineer by day, founder by night. This is where we talk about building things that matter: businesses, systems, and a life worth passing down.

**⚠️ IMPORTANT DISCLAIMER**

> Before we go any further, I need to be crystal clear about something: **I am not a financial advisor.** Nothing in this episode — or anywhere on this podcast — constitutes financial advice.

> Everything I'm sharing today is **experimental.** I'm building this system in public, testing it with my own money, and documenting the journey. This is educational content about how I'm approaching a personal project.

> **Do not trade based on anything I say.** Do your own research. Consult a licensed financial professional before making any investment decisions. Past performance doesn't guarantee future results. You can lose money — possibly all of it.

> I'm sharing this because I think the process is interesting, not because I think you should copy me. Clear? Okay. Let's go.

---

## SECTION 1: Why I'm Building This — The Clock is Ticking (7 min)

> Before I show you the system, I need to tell you why I'm building it. Because this isn't a hobby project. This is survival.

*(beat)*

> Here's the thing. I'm a test engineer at a major tech company. I've been doing this for over a decade. I'm good at it. But I'm not naive about what's coming.

> **AI is going to replace my job.**

> Not might. Will. It's not a question of if — it's a question of when. And I've done the math. I give myself roughly **5 to 10 years** before my role as a full-time test engineer becomes obsolete. Maybe less.

> Look at what's already happening. AI can write code. AI can review code. AI can generate test cases, find bugs, and automate entire QA pipelines. Right now, in 2026, these tools still need human oversight. But that gap is closing fast. Every month, the models get better. Every month, the oversight required gets smaller.

> The same skills that make me valuable today — pattern recognition, systematic thinking, debugging complex systems — those are exactly the skills that AI is getting good at.

> So I asked myself a hard question: **If I have 5 to 10 years left in this career, what do I do with that time?**

> I could bury my head in the sand. Pretend it's not happening. Ride the wave until it crashes.

> Or I could use this window — while I still have a stable income — to build something that replaces that income before I'm forced to.

> And to give you a sense of what that building actually looks like: the system I'm about to show you went through **thirteen versions in eight days.** V6 to V13. Each one a step change. V7 added prediction market data. V10 expanded from 9 assets to 25. And V13 — the "Universe Edition" — covers 676 tickers with five independent strategies and an overnight optimizer.

> Eight days. Thirteen versions. That's what building with urgency looks like.

**Why 60/40 Won't Save Me**

> Now, the conventional wisdom would say: just invest. Build a nest egg. The classic 60/40 portfolio — 60% stocks, 40% bonds. Buy and hold. Don't try to time the market. Set it and forget it.

*(beat)*

> Here's the problem: **I don't have time for buy and hold.**

> I stumbled across Chris Vermeulen's work a few years ago. Chris is a quantitative researcher who completely changed how I think about investing. His critique of the traditional 60/40 approach is devastating — and it's especially devastating for someone on a compressed timeline like me.

> Let me explain.

> A traditional 60/40 investor sits through drawdowns of 30% to 50%. That's not a minor dip — that's watching half your portfolio disappear. And here's the kicker: **it can take YEARS to recover.**

> Look at the S&P 500 from 2000 to 2013. If you bought at the dot-com peak in March 2000, you watched your portfolio drop 50% by 2002. Then it slowly recovered — and you finally broke even in late 2007. Great, right? Except two months later, the financial crisis hit, and you lost another 50%. You didn't permanently recover your 2000 investment until **2013**.

> That's **thirteen years** of stress. Two massive crashes. And if you needed that money in between — for a house, for retirement, for an emergency — you were selling at a loss.

*(beat)*

> Now think about my situation. I have 5 to 10 years before AI potentially eliminates my job. If a crash hits in year 3, and I'm down 50%, and it takes 7 years to recover... **I'm done.** I don't have 13 years of runway. I don't have the luxury of waiting out a lost decade.

> Buy and hold assumes you have infinite time and infinite emotional resilience. I have neither.

> The second issue: the 60/40 split offers a **false sense of security.** The whole premise is that stocks and bonds are negatively correlated — when one goes down, the other goes up. Diversification protects you.

> Except in 2022, both stocks AND bonds fell simultaneously. The promised diversification failed. In high-inflation or rising-rate environments, that historical negative correlation breaks down completely.

> So you're holding two losing assets, telling yourself you're "diversified." That's not strategy. That's hope.

> And third: by design, a 60/40 portfolio **forces you to keep owning losing assets.** Chris Vermeulen puts it bluntly: wealth builds faster when it's not constantly being "repaired" from losses.

> If you lose 50%, you need a 100% gain just to get back to even. That's not building wealth — that's running on a treadmill.

**The Math I Need to Hit**

> So let me be specific about what I actually need.

> To sustain my family's current lifestyle — mortgage, kids, savings, the basics — I need approximately **$200,000 per year** in income. That's my target. That's what this system needs to eventually generate.

> I'm starting with **$100,000** in a brokerage account. That's money I've saved over years. It's not nothing, but it's not hedge fund capital either.

> If I need $200K per year from a $100K account, that's a 200% annual return. That's not realistic. That's gambling.

> But that's not the plan. The plan has three phases:

> **Phase 1: Grow the Capital.** For the next 5-10 years, while I still have my engineering salary, I'm not trying to live off trading income. I'm trying to grow the account. Every dollar I save goes into the brokerage. Every gain compounds. If I can average 15-20% annual returns and add $30-40K per year from my salary... in 7-8 years, that $100K becomes $500K to $800K.

> **Phase 2: Transition to Income.** Once the account is large enough, the math changes. A 25-30% return on $700K is over $200K per year. That's still aggressive, but it's in the realm of what systematic traders achieve.

> **Phase 3: Scale and Diversify.** Beyond that, you reduce risk, target 15% returns on a larger base. The goal isn't to get rich quick. The goal is reliable income — before I'm forced to find out if I can.

**The Alternative: Asset Revesting**

> So what does Chris Vermeulen advocate instead of 60/40? He calls it **"Asset Revesting"** — a tactical approach focused on capital protection and trend following.

> Here's the core insight that changed everything for me: **you don't need to predict the future. You just need to follow the regime.**

> Instead of a fixed allocation, you rotate capital between stocks, bonds, commodities, or cash — depending on which asset class is currently in a strong uptrend. If nothing meets your criteria for a healthy trend? You hold cash. Vermeulen says he may hold 100% cash for up to 40% of the year if no asset is trending well.

> That sounds crazy to a traditional investor. "But you're missing gains!" Maybe. But you're also missing losses. And **not losing is the first rule of compounding.**

> The strategy ignores news, earnings, and "hope." It relies strictly on price mechanics — technical modeling of price, volume, and cycles to decide when to move into or out of a position.

> Is the market in a bull regime? Buy stocks. Bear regime? Rotate to bonds or gold. Sideways? Stay in cash and wait for clarity.

> That's asset revesting. Not day trading. Not predicting every tick. Just reading the environment and positioning accordingly.

> The problem is, doing this manually is exhausting. You'd have to track dozens of indicators across multiple asset classes every single day. So I asked a simple question: **What if I could automate this? What if I could build a system that does the analysis for me?**

> That question became the MRE — the Multi-Regime Engine.

> So that's why I built it. That's why I'm sharing this with you. Because I'm betting my family's financial future on this system working.

> If that sounds dramatic... good. It should. This isn't a game to me.

*(beat)*

> And if you want to follow along with how this experiment unfolds — whether the system works or crashes and burns — I publish daily updates in a newsletter called **"Today's Plays."** Every day, the system generates its signals. Every day, I document what it says. You can track the wins, the losses, and everything in between.

> Link in the show notes. It's free. I'll remind you again at the end.

> Now let me explain how the system actually works.

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

> Think of it like the tide versus the waves. The waves crash in every direction — chaotic, loud, hard to predict. But the tide? The tide tells you whether the water is rising or falling. You can't fight the tide. Daily price action is waves. The regime is the tide.

> Our system now calculates regime signals for **676 individual tickers.** That's the full S&P 500, the NASDAQ-100, the Dow 30, and 159 ETFs covering every corner of the market. Each one gets its own regime classification.

> For example, right now, gold is in a bull regime — it's been bullish for over 100 days. But small-cap stocks are in a bear regime. If you were blindly buying and holding everything, you'd be holding losers alongside winners. Regime awareness lets you rotate into what's working.

> And here's what's wild: the full pipeline — regime detection, signal generation, all five strategies across all 676 tickers — runs in about **102 seconds.** Under two minutes to analyze the entire investable universe.

---

## SECTION 3: The MRE Engine — How It Works (8 min)

> So how does the MRE engine actually calculate all of this? Let me walk you through the components. And fair warning — this section has gotten a LOT bigger since I first built this thing.

> When I started, the MRE had one strategy. One. The Fear and Greed Contrarian. It watched the CNN index, and when people panicked, it said buy. Simple and elegant.

> Here's the problem: **the market isn't always scared or greedy.** Sometimes it's just... neutral. And during neutral markets, the Fear and Greed strategy produces exactly zero signals. I know this because I watched it happen. Days would go by. Nothing. The system was sitting there, fully built, staring at the market, saying "I have no opinion."

> That's when I realized: you can't run a trading desk on a single signal. You need a portfolio of strategies the same way you need a portfolio of assets. Diversify your signals.

> So now the MRE runs **five independent strategies.** Let me walk through each one.

**Strategy 1: Fear and Greed Contrarian (The Original)**

> We pull the CNN Fear & Greed Index daily. This is a composite of seven market indicators — volatility, market momentum, stock price strength, put/call ratio, junk bond demand, market breadth, and safe haven demand.

> When the index is below 30 — extreme fear — that's historically been a buying opportunity. When it's above 70 — extreme greed — that's when you get cautious. This is the classic contrarian play. It still works. It just can't be the only play.

**Strategy 2: Regime Confirmation**

> This strategy buys dips within established bull regimes. If an asset has been in a confirmed bull regime and pulls back 2-5%, that's not a trend break — that's a discount. The regime confirmation strategy triggers on those dips.

> Think of it as the "trust the trend" strategy. The macro environment says up. Price just got cheaper. Buy.

**Strategy 3: RSI Oversold**

> RSI — Relative Strength Index — is a classic technical indicator. When RSI drops below 30, the asset is "oversold." Historically, that's a mean-reversion setup. Price has been pushed too far too fast, and it tends to bounce.

> This strategy catches those bounces. It's purely technical — it doesn't care about the Fear and Greed index. It doesn't care about the news. Just the math of price momentum.

**Strategy 4: Mean Reversion (Bollinger Bands)**

> Similar idea, different math. Bollinger Bands measure how far price has deviated from its moving average. When price touches or breaks below the lower band, it's statistically stretched. This strategy buys the snap-back.

**Strategy 5: Pair Mean Reversion**

> This is the fun one. The system analyzed all 676 tickers against each other and discovered **34,760 correlated pairs.** Of those, **2,654 pairs** have a correlation above 0.95 — meaning they move together more than 95% of the time.

> When two highly correlated assets diverge — one drops while the other holds — that divergence tends to close. This strategy trades the convergence. It's like pairs trading at a hedge fund, except my AI found the pairs for me overnight.

*(beat)*

> Five strategies. Each one independent. Each one looking at the market through a different lens. When multiple strategies agree on the same asset at the same time? That's when you pay attention.

**The Data Stack**

> Now let me talk about what feeds these strategies, because the data layer has expanded massively.

> We still use the core signals: CNN Fear & Greed, regime detection with exponential moving averages, Fibonacci retracements and projections, and prediction market data from Kalshi and Polymarket.

> But we've added:

> **VIX data** — 30 years of volatility history. The VIX tells you how scared the options market is. We use it for crash mode detection. When the VIX spikes above certain thresholds, the system shifts into capital preservation mode.

> **Market breadth** — Two flavors. First, the RSP/SPY ratio with 23 years of history. RSP is the equal-weight S&P 500, SPY is the cap-weight. When RSP outperforms SPY, breadth is healthy — most stocks are participating. When SPY leads, the rally is narrow and fragile.

> Second, **internal breadth.** We calculate what percentage of our 676 tickers are trading above their 50-day moving average. Right now? 465 out of 675 — that's 68.9%. That tells you the market is generally healthy but not euphoric. If that number drops below 40%? Something's wrong.

> **Sector rotation** — We track 10 sector ETFs — technology, healthcare, energy, financials, the works. Where money is flowing between sectors tells you what regime the market is actually in, regardless of what the headlines say.

> **34,760 correlated pairs** — As I mentioned, the system maps the entire correlation matrix of our universe. This isn't just for the pair strategy — it also tells us when correlations are breaking down, which is often an early warning of regime change.

**Fibonacci Retracements AND Projections**

> This is where it gets technical, but stay with me because this is powerful.

> **Fibonacci retracements** use two points — a swing high and a swing low — to identify potential support and resistance levels during a pullback. The key levels are 38.2%, 50%, and 61.8%. If we're in a bull regime and price pulls back to the 38.2% retracement, that's often a buying opportunity.

> **Fibonacci projections** go further. They use THREE points — swing low, swing high, and pullback low — to predict where price might go AFTER the pullback. The key projection levels are 127.2%, 161.8%, and 261.8% extensions.

> So in a bull regime, we're looking for pullbacks to retracement levels for entry, and projecting extensions for profit targets. It's math, not magic.

**Prediction Markets — Kalshi and Polymarket**

> Here's something most retail systems don't include: we incorporate data from prediction markets.

> Kalshi and Polymarket are platforms where people bet real money on future outcomes — economic indicators, Fed decisions, political events. Unlike surveys or pundit opinions, prediction markets have skin in the game.

> We pull their data on key questions: Will the Fed raise rates? Will inflation surprise to the upside? Will there be a recession in 2026?

> This gives us a probabilistic view of the macro environment that complements our technical analysis. If the prediction markets are pricing in 70% chance of a rate hike but our regime signals are still bullish, that's a yellow flag.

**Confidence Models and Expected Accuracy**

> Every signal we generate comes with a confidence score and expected accuracy — and here's how we got those numbers.

> I used Clawdbot — my AI co-pilot — running cron jobs every five minutes for an **entire week straight**. The system would test a hypothesis, measure the results, identify weaknesses, and improve itself. Then test again. Hundreds of iterations, completely automated.

> By the end, we had expected accuracy numbers for each asset class based on historical performance. When the regime signal for gold is bullish with these specific parameters, it's been correct 65% of the time over the past decade. That's not a guess — that's empirical.

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

> And since that validation, the system has gotten dramatically more sophisticated. Five strategies instead of one. 676 assets instead of 15. An overnight optimizer running hundreds of thousands of backtests. The JP Morgan framework validated the foundation — and we've built a skyscraper on it.

---

## SECTION 5: Today's Plays — From Signals to Action (5 min)

> Here's the thing most people get wrong about quantitative trading: having data isn't the same as having a decision.

> I've got signals for **676 different tickers.** Five strategies per ticker. Do I trade all of them? Obviously not. The raw signals aren't actionable — they're inputs.

> So I built a second layer: **Today's Plays.**

> Today's Plays synthesizes the raw signals into four categories:

> **BUY** — The signal is strong. We're in a bull regime with 70%+ confidence, momentum is positive, and the price is within 3% of our Fibonacci entry zone. Or the Fear index is below 30 and we're buying the fear. Or the RSI is oversold. Or Bollinger Bands are stretched. Or a correlated pair has diverged. And ideally — multiple of these agree.

> **WATCH** — Sideways regime. Could break either direction. We're watching for a breakout.

> **HOLD** — Bull regime, but the price has run too far from the entry zone. Don't chase. Wait for a pullback.

> **WAIT** — Bear regime. Capital preservation mode. Cash is a position.

*(beat)*

> Let me give you an example from how the system actually plays out. GLD — the gold ETF — has been one of our strongest positions.

> Gold's regime has been bullish for over 117 days. Confidence at 85%. When Trump announced his Fed Chair pick and gold sold off 5%, the news felt bad. But here's what the system saw:

> The regime was intact. Momentum was still +9.89% over 20 days. The selloff hadn't broken the trend — it had just created a discount. Price had pulled back exactly to the 38.2% Fibonacci retracement — the first major entry zone in a bull trend.

> The prediction markets confirmed it — still pricing gold-favorable outcomes despite the headline noise.

> News said sell. The regime said buy the dip. Multiple strategies agreed. We followed the regime.

> GLD is now one of eight positions in the paper portfolio. More on that in a minute.

**Multi-Signal Confirmation**

> Here's something I learned the hard way: a single strategy saying BUY is interesting. Two strategies saying BUY is worth attention. Three or more? That's when you act.

> The system now tracks how many of the five strategies agree on each signal. We call this the confirmation level — 1-of-5, 2-of-5, up to 5-of-5. The overnight optimizer actually tests which confirmation threshold works best for each asset in each regime.

> Some assets trade better on single-strategy signals. Others need three strategies to agree before the edge appears. The system knows which is which.

**Position Sizing**

> One more critical piece: position sizing. I don't bet the same amount on every trade.

> Higher confidence equals larger position. At 50% confidence, I allocate 8% of the portfolio. At 90% confidence, I go up to 25%. This is Kelly Criterion logic applied to a constrained portfolio.

> Every BUY signal also comes with a stop-loss based on Fibonacci retracements and profit targets based on projections. No emotion. Just math.

*(beat)*

> **This is exactly what you get in the "Today's Plays" newsletter.** Every morning before market open, I publish the system's signals — what's showing BUY, what's showing HOLD, what's in WATCH mode. I show the confidence levels, the entry zones, the targets.

> And here's the key: I also track performance. Did last week's BUY signals hit their targets? Did the stops get triggered? What's the running accuracy?

> It's a real-time window into whether this system actually works. I'm not hiding the losses. I'm documenting everything — because that's the only way to know if this is real or if I'm fooling myself.

> Again, **this is all experimental.** I'm not telling you to trade these signals. I'm showing you my process. But if you want to follow along and see how it plays out — link in the show notes.

---

## SECTION 6: The Agent Fleet — AI That Works for You (6 min)

> Now here's where it gets interesting. Having a trading system is one thing. Operating it is another.

> I work a full-time job. I have two kids. I can't be staring at charts all day. So I built something better: **a fleet of AI agents that manage the system for me.**

> Four agents, each with a specific job. But fair warning — the fourth one has leveled up dramatically.

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

**Agent 4: The Overnight Optimizer (The Beast)**

> Okay. This is the one that changed everything.

> The original Optimizer ran weekly and made incremental adjustments. That was V7.

> The V13 Optimizer is a **five-phase quantitative pipeline** that I set running before bed and wake up to calibrated signals. Let me walk you through the phases because this is where the real engineering lives.

> **Phase 1: Walk-Forward Validation.** This is the antidote to overfitting. Instead of testing on the same data you trained on — which is how you fool yourself into thinking a strategy works — we use rolling train/test windows. Train on 2020-2023. Test on 2024. Slide forward. Train on 2021-2024. Test on 2025. Only out-of-sample results count.

> **Phase 2: Parameter Grid Search.** For each of the five strategies, there are tunable parameters — RSI thresholds, Bollinger Band widths, dip percentages, hold periods. The optimizer searches across all reasonable combinations. We're talking over **300,000 backtests** across the grid. Five strategies times hundreds of parameter combinations times hundreds of assets.

> **Phase 3: Multi-Signal Confirmation.** Remember the 1-of-5 through 5-of-5 confirmation levels? The optimizer tests every threshold for every asset. Maybe SPY trades best when 2 strategies agree. Maybe GLD needs 3. The system figures it out empirically.

> **Phase 4: Regime-Conditional Optimization.** Here's the thing — a strategy that works in a bull market might be terrible in a bear market. So we don't just find the "best" strategy. We find the **best strategy per regime per asset.** RSI Oversold might be your bull-regime play for tech stocks, but Pair Mean Reversion might be better for energy in sideways markets. The optimizer maps this entire landscape.

> **Phase 5: Monte Carlo Robustness.** The final filter. We run 100 randomized trials — shuffled data, perturbed parameters, random noise — and check if the results hold. If a strategy only works with exact parameters and falls apart with small changes? It's fragile. We penalize fragile strategies and reward robust ones.

*(beat)*

> Five phases. 300,000+ backtests. All 676 tickers calibrated in **39 minutes.** I set it before bed. I wake up to fresh, battle-tested parameters.

> That's not me staring at charts. That's a quant team working overnight while I sleep.

> Here's the thing: this isn't science fiction. Every one of these agents is running right now on my Mac Mini, using Claude as the underlying model. They communicate through shared files. They have their own memory. They learn.

> Total cost? About $50/month in API calls. Less than most trading platform subscriptions.

---

## SECTION 7: The Dashboard and Paper Trading — Keeping It Real (3 min)

> I'm a visual person. I need to see what's happening.

> So I built a dashboard — the Hub — that shows everything in one place:

> - **Market Sentiment**: Fear/Greed index, global regime, prediction market signals, volatility level, VIX status
> - **Today's Plays**: The synthesized BUY/HOLD/WATCH/WAIT signals across all 676 tickers
> - **Universe Table**: Searchable, filterable, sortable. You can find any ticker instantly. Color-coded by category — stocks, ETFs, sectors. Filter bars to slice by regime, strategy, or signal strength.
> - **Paper Portfolio**: All open positions, live P&L synced with Alpaca every 5 minutes
> - **Performance Chart**: My equity curve vs. SPY, the benchmark

> One-click trading. I see a BUY signal, I click the button, and the system calculates position size based on confidence, sets the stop-loss and take-profit using Fibonacci levels, and queues the trade.

> Everything persists. Every trade is logged. Every decision is traceable.

*(beat)*

> Now let me be honest about the paper trading, because I think transparency matters more than ego.

> I started paper trading on February 9th with $100,000. As of right now, the portfolio is at **$99,340.** That's a drawdown of about **6.45%.**

> Eight open positions: SPY, EFA, GLD, TLT, VNQ, XLE, XLF, XLV. That's broad market, international, gold, bonds, real estate, energy, financials, and healthcare. The system diversified across asset classes exactly like it should.

> All positions were opened with 10-day hold targets. The market has been soft since then — a general pullback. So the drawdown is partially market conditions.

> But here's why I'm telling you this: **this is what building in public looks like.** I didn't wait for a perfect month of gains to tell you about the system. I'm telling you about it while it's down 6.45%.

> If I only shared when things were going well, I'd be lying to you. And there are plenty of other podcasts that will lie to you. This isn't one of them.

> The question isn't whether the system has a bad week. Every system does. The question is whether the process is sound and whether the drawdowns are within expected parameters. A 6.45% drawdown with 8 diversified positions in a soft market? That's not a system failure. That's reality.

> When the paper trades prove out over a meaningful sample — months, not weeks — I flip a switch and it's real money.

---

## SECTION 8: The Bug War Stories — What Almost Went Wrong (3 min)

> I want to tell you about some bugs, because this is the part most people building in public skip. They show you the dashboard. They show you the architecture diagram. They don't show you the 2 AM debugging sessions.

*(beat)*

> **Bug Number One: The Five-Minute Hold.**

> In V8, I discovered that the system was counting hold days in **poll cycles** instead of calendar days. The Updater runs every 68 seconds. And the hold days calculation was incrementing by one each time the Updater ran. So when the system said "hold for 5 days," it was actually holding for 5 poll cycles — **five and a half minutes.**

> The result? The system executed **50 rapid trades on QQQ.** Bought, sold, bought, sold, over and over. Lost $5,356 in a single afternoon of churn. And because it executed that many round trips in a day, it triggered the **Pattern Day Trader flag** on the account.

> In a paper trading account, that's embarrassing. In a real account, that's catastrophic. The PDT flag locks you out of trading for 90 days unless you maintain $25,000 minimum equity.

> All because of a unit conversion error. Minutes versus days. The most classic engineering bug there is.

*(beat)*

> **Bug Number Two: The Rogue Dashboard.**

> This one was subtle. The dashboard was supposed to display the signals from the MRE engine. Just display them. Read the data, show the data.

> Except somewhere along the way, the dashboard started generating its own signals. It had its own logic for when to buy and sell — completely separate from the MRE engine. So the MRE would say HOLD, and the dashboard would say BUY, and trades would execute based on the dashboard's logic.

> Two brains, one account. The MRE was being overridden by its own UI. I was debugging the engine looking for problems, and the problem was in the frontend.

*(beat)*

> **Bug Number Three: Cross-Strategy Conflicts.**

> When you go from one strategy to five, you can get situations where Strategy A says BUY on SPY and Strategy B says BUY on SPY — but with different parameters. Different entry prices. Different stop-losses. Different hold periods.

> Both would try to execute. On a shared account. With conflicting stop-losses. So one strategy's stop-loss would trigger the other strategy's position to close prematurely.

> The fix was a position-level deconfliction layer — essentially a referee that says "only one active position per symbol, and the Optimizer decides which strategy owns it."

*(beat)*

> Why am I telling you this? Because **this is what real building looks like.** The architecture diagram is clean. The live system is messy. The gap between those two things is where the learning happens.

> Every one of these bugs made the system better. The hold-days bug taught me to always validate units. The dashboard bug taught me to enforce clear data flow — the engine decides, the dashboard displays, period. The cross-strategy bug taught me that adding capabilities requires adding coordination.

> If you're building anything — a trading system, a SaaS app, a startup — you will hit bugs like these. The question isn't whether you'll hit them. It's whether you'll fix them and keep going.

---

## FAITH TIE-IN (1.5 min)

> You might be wondering what any of this has to do with faith. Bear with me.

> There's a proverb that says: "The plans of the diligent lead surely to abundance, but everyone who is hasty comes only to poverty."

*(beat)*

> Notice what it doesn't say. It doesn't say the plans of the talented. It doesn't say the plans of the lucky. It says the diligent.

> Diligence is showing up every day. It's building systems that work while you sleep. It's not chasing the hot stock tip — it's following a process. It's running 300,000 backtests overnight because you want to get it right. It's counting hold days in actual days, not poll cycles.

> That's what this system is about. Not getting rich quick. Not gambling. But diligently applying wisdom to decisions, removing emotion, and trusting the process.

> Thirteen versions in eight days. Every version better than the last. Each bug found and fixed. Not because I'm talented — because I kept showing up.

> Work done in secret has its own reward. The agents run whether I'm watching or not. The system compounds whether I check it or not. The optimizer calibrates 676 tickers while I sleep.

> That's the goal. Build once. Let it work. Focus on what matters — family, craft, calling.

---

## RECAP & TAKEAWAYS (2 min)

> Let's bring it home. Seven things to remember from today:

1. **Buy and hold isn't always safe.** Asset rotation — moving between what's working — can protect you during downturns and capture upside during recoveries. Chris Vermeulen's work opened my eyes to this.

2. **Regime signals cut through the noise.** Don't react to daily headlines. Read the underlying trend. Bull, bear, or sideways — position accordingly.

3. **One strategy isn't enough.** The Fear and Greed Contrarian produced zero signals in neutral markets. Five strategies — technical, contrarian, mean reversion, pairs — give you coverage in all market conditions. Diversify your signals like you diversify your assets.

4. **Validate with institutional-grade frameworks.** We didn't just guess that our system works — we proved it. 4,100 backtests. 65.6% buy accuracy. Sharpe ratio of 1.13. JP Morgan's framework rated it deployable at $100-500 million scale.

5. **Bugs are features in disguise.** The five-minute hold bug, the rogue dashboard, the cross-strategy conflicts — every one of them made the system better. Build, break, fix, repeat. That's the process.

6. **AI agents can manage complexity for you.** You don't need to watch the market all day. Build a team of specialized agents — updater, advisor, analyst, optimizer — and let them do the work. The overnight optimizer runs 300,000+ backtests across 676 tickers in 39 minutes. That's a quant team for $50 a month.

7. **Be honest about where you are.** I'm down 6.45% on the paper portfolio. That's real. I didn't wait for a win streak to tell you about this system. Building in public means showing the drawdowns too.

---

## CALL TO ACTION (45 sec)

> If you want to follow this experiment in real-time, subscribe to **"Today's Plays"** — my daily newsletter where I publish the MRE system's signals before market open.

> Every day, you'll see: What's showing BUY across 676 tickers. What's in HOLD mode. What the confidence levels are. What the Fibonacci entry zones and targets look like. Which strategies are agreeing.

> And more importantly, you'll see the results. Did the signals work? What's the running accuracy? Am I beating buy-and-hold, or am I fooling myself?

> This is a live experiment. I'm not cherry-picking wins. I'm showing you everything — the good, the bad, and the bugs that made me lose $5,000 in five minutes. If this system is going to replace my income in 5-10 years, I need to know if it actually works. And now you can follow along.

> Link is in the show notes. It's free.

> **One more time for the lawyers:** I am not a financial advisor. This is not financial advice. Everything I'm sharing is experimental and educational. Don't trade based on my signals. Do your own research. Past performance doesn't guarantee anything. You can lose money.

> But if you're curious about the process — the architecture, the code, the agent configurations, the five strategies, the overnight optimizer — that's all in the newsletter too. Subscribe and I'll send it to you.

> And if you're building something similar — trading, research, operations — I'd love to hear about it. Reply to the newsletter or find me on X. Let's compare notes.

---

## OUTRO (15 sec)

> That's The Builder's Frequency. I'm Joshua Levy. Keep building, and I'll see you next week.

---

## POST-RECORD NOTES

**Clips to extract:**
- [ ] Cold open (0:00-0:45) — "676 assets, five strategies..."
- [ ] Buy and hold is dangerous — "Thirteen years of waiting"
- [ ] Chris Vermeulen insight — "You don't need to predict the future"
- [ ] Regime explanation — "Tide versus waves"
- [ ] "Zero signals in neutral markets" — Why one strategy isn't enough
- [ ] Five strategies walkthrough — "Each one looking through a different lens"
- [ ] 34,760 correlated pairs — "My AI found the pairs for me overnight"
- [ ] Fibonacci retracements vs projections — "Three points to predict"
- [ ] JP Morgan stats — "65.6% buy accuracy, Sharpe of 1.13"
- [ ] Capacity estimate — "$100 million to $500 million deployable"
- [ ] Kalshi accuracy — "96.6% accurate in directional calls"
- [ ] The GLD example — "News said sell. The regime said buy the dip."
- [ ] Five-minute hold bug — "50 rapid QQQ trades, $5,356 lost"
- [ ] Rogue dashboard bug — "Two brains, one account"
- [ ] Overnight Optimizer — "300,000 backtests, 39 minutes, while I sleep"
- [ ] Agent fleet overview — "Four agents, each with a specific job"
- [ ] The Advisor override — "Here's the key..."
- [ ] Paper trading honesty — "Down 6.45%. That's real."
- [ ] Faith tie-in — "The plans of the diligent..."
- [ ] Version velocity — "Thirteen versions in eight days"

**Keywords for SEO:**
- AI trading system
- Asset rotation strategy
- Chris Vermeulen
- Regime trading
- Multi-strategy quantitative trading
- Fibonacci retracement projection
- Prediction markets trading
- Kalshi Polymarket
- JP Morgan quant analysis
- Institutional trading system
- AI agents automation
- Claude AI trading
- Overnight parameter optimization
- Walk-forward validation
- Monte Carlo robustness
- Pair trading correlation
- RSI oversold strategy
- Bollinger Bands mean reversion
- Paper trading portfolio
- Building in public

**Estimated runtime:** 37 minutes (~5,550 words at 150 wpm)

**Attachments:**
- jpm_institutional_analysis.json — Full JP Morgan analysis report
