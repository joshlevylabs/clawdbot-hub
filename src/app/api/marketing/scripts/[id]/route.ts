import { NextRequest, NextResponse } from 'next/server';

// Scripts embedded directly (Vercel has read-only filesystem)
const SCRIPTS: Record<string, string> = {
  '005': `# Episode Script: Three Signal Flows, Six Agents, One Trading Desk — How the MRE Actually Makes Decisions

**Episode #:** 5
**Title:** Three Signal Flows, Six Agents, One Trading Desk — How the MRE Actually Makes Decisions
**Pillar:** AI for Builders
**Target Length:** 12-15 minutes
**Recording Date:** TBD

---

## COLD OPEN (30 sec)

> Every morning at 6:30 AM Pacific, before I've finished my first cup of coffee, a map redraws itself.

*(beat)*

> Not a geographical map. A signal flow map. Hundreds of nodes. Dozens of connections. And every single line on that map represents a live trading signal — buy, hold, or watch — flowing through a system that didn't exist three months ago.

> Today I want to show you what that map looks like, how three separate signal flows feed into it, and how six AI agents modeled after legendary traders decide what's actually worth acting on.

---

## INTRO (20 sec)

> You're listening to The Builder's Frequency. I'm Joshua Levy — test engineer by day, founder by night. This is where we talk about building things that matter.

> Episode 3, I showed you how I built the MRE — the Market Research Engine. Episode 4, I showed you the AI agents running the whole operation. Today, I'm going deeper. Into the signal architecture. Into how this thing actually thinks.

**⚠️ DISCLAIMER**

> Quick reminder — I am not a financial advisor. This is not financial advice. Everything I'm sharing is experimental. I'm building this in public, testing with my own money, and documenting what I learn. Don't copy my trades. Do your own research. Consult a professional. Cool? Let's go.

---

## SECTION 1: The Signal Flow Map — A Living, Breathing Picture (3 min)

> So here's the thing. When I first built the MRE back in January, it was essentially a scoring engine. Fear and Greed index comes in, regime detection runs, signals go out. Simple. Linear. One input, one output.

> But that's not how markets work. Markets are a web. Everything is connected to everything else. The VIX spikes and suddenly your crypto positions correlate with your bond positions in ways they didn't yesterday. A geopolitical event in the Middle East moves oil, which moves energy stocks, which shifts the entire regime detection.

> So I asked myself — what if instead of a pipeline, I built a map?

*(beat)*

> That's what the signal flow map is. Every day, the MRE generates a dynamic, visual representation of every signal it's tracking. And I mean *every* signal. Each ticker — we're covering over 670 assets across equities, ETFs, crypto, commodities, bonds — each one becomes a node on the map. The connections between them represent signal strength, confidence level, and regime alignment.

> If you pulled it up right now on the dashboard, you'd see clusters. Buy signals clustering in one region. Hold signals in another. Watch signals — the ones we're monitoring but not acting on — forming their own constellation at the edges.

> And here's what makes it interesting: this map *changes every day*. It's not static. When the Fear and Greed index shifts from 45 to 52, that ripples through the entire graph. Nodes move. Connections strengthen or weaken. Some signals that were BUY yesterday become HOLD today. The map tells the story of what the market is doing right now — not what it was doing last week.

> Think of it like a weather radar for trading signals. Green clusters are your opportunity zones. Yellow is your hold-and-watch territory. And when things turn red — when signals start diverging from their expected patterns — that's when the system gets really cautious.

---

## SECTION 2: Three Signal Flows — The Architecture (5 min)

> Now, the map is the visualization. But what feeds the map? This is where the architecture gets interesting. There are three separate signal flows — three distinct pipelines — that all converge to produce what you see.

> I think of them as three lenses looking at the same market from completely different angles.

### Signal Flow One: The Buy Scanner

> The first signal flow is what I call the Buy Scanner. Its entire job is to find new buy opportunities.

> Every day, this flow ingests fresh market data — price action, volume, regime detection for each asset, Fibonacci retracement levels, fear and greed sentiment — and it asks one question: *Should we be buying this right now?*

> It's not just looking at technicals. It's incorporating geopolitical signals. Prediction markets from Kalshi and Polymarket. If there's a geopolitical event that the prediction markets are pricing at high probability — say, a new tariff announcement or an escalation in a conflict zone — that feeds directly into how the Buy Scanner evaluates positions.

> Here's a real example. A few weeks ago, prediction markets were pricing in a specific policy change at about 72% probability. The Buy Scanner picked that up, cross-referenced it against our asset universe, and flagged three energy-sector positions that historically benefit from that kind of policy shift. Those became BUY signals with a geopolitical overlay tag, so the agents downstream knew exactly *why* those signals were triggered.

> The Buy Scanner is aggressive by design. It's looking for opportunity. It's the optimist in the system. But it doesn't act alone.

### Signal Flow Two: The Sell Signal Generator

> The second signal flow is the mirror image. I call it the Sell Signal Generator. Its job is to look at everything we currently hold — or everything the system has flagged as a buy — and determine when it's time to get out.

> This is the skeptic. The risk manager. The one asking, *What could go wrong?*

> It monitors regime changes in real time. If SPY shifts from a bullish regime to a transitional one, the Sell Signal Generator doesn't wait. It immediately re-evaluates every position that was predicated on bullish momentum. It looks at correlated pairs — we track over 34,000 of them — and if your pair divergence starts reversing, that's a sell trigger.

> It also watches the Fear and Greed index through a different lens than the Buy Scanner. The Buy Scanner loves fear — fear means discount prices. The Sell Signal Generator loves greed — greed means the market is overextended and it's time to take profits.

> So you have this natural tension built into the architecture. One flow is constantly finding reasons to buy. The other is constantly finding reasons to sell. And that tension is *the point*. Because when both flows agree — when the Buy Scanner says buy *and* the Sell Signal Generator says hold — that's a high-conviction signal.

### Signal Flow Three: The Agent Decision Layer

> The third signal flow is where it gets personal. Literally.

> I have six AI trading agents. Each one is modeled after a real, legendary investor — with their actual trading philosophy, risk tolerance, and decision-making framework encoded into their system prompt.

*(beat)*

> Let me introduce them.

> **Chris Vermeulen** — the technical analyst. He's looking at chart patterns, regime cycles, and mean reversion. If the technicals don't support a trade, Chris won't touch it. Doesn't matter what the fundamentals say.

> **Warren Buffett** — the value investor. He's looking for intrinsic value. He wants to buy great assets at fair prices and hold them. He's the one who will ignore a BUY signal on a speculative crypto position because it doesn't meet his quality criteria.

> **Peter Schiff** — the hard money advocate. Gold, commodities, inflation hedges. If the macro environment suggests currency debasement or inflationary pressure, Schiff is your guy. He's also the most skeptical of tech-heavy positions.

> **Raoul Pal** — the macro strategist. He's thinking in terms of global liquidity cycles, the dollar, crypto as a macro asset. When the liquidity tide is rising, Raoul gets aggressive. When it's receding, he gets defensive.

> **Peter Lynch** — the growth-at-a-reasonable-price investor. He's looking for asymmetric opportunities. Companies and assets that are undervalued relative to their growth potential. He'll buy what Buffett won't — if the numbers work.

> **Ray Dalio** — the all-weather strategist. Diversification is his religion. He's building a portfolio that can survive any regime — inflation, deflation, rising growth, falling growth. He's the one rebalancing when everyone else is chasing momentum.

> Here's how the third signal flow works: The Buy Scanner and Sell Signal Generator produce their signals. Those signals get fed to all six agents simultaneously. And each agent independently decides — based on their unique philosophy — whether to act on that signal.

> Chris might see a BUY signal on QQQ and say yes, the technical setup is perfect. Buffett might see the same signal and say no, it's overvalued relative to earnings. Schiff might ignore it entirely because he's allocated to gold. Raoul might say yes because global liquidity is expanding.

> The system doesn't require consensus. Each agent manages their own portfolio. But when you see four, five, or all six agents agreeing on a signal? That's when you pay attention. That's a confluence signal. And historically in our testing, confluence signals have a significantly higher accuracy rate.

---

## SECTION 3: How It All Comes Together (3 min)

> So let me paint the full picture for you. Because this is the part that gets me excited.

> 6:30 AM Pacific, every trading day. The MRE wakes up. Fresh market data comes in. The Buy Scanner runs. The Sell Signal Generator runs. The signal flow map redraws itself. And then — simultaneously — all six agents receive the day's signals.

> Each agent runs their analysis. They look at their current positions. They look at their available capital. They cross-reference the signals against their personal investment thesis. And they make decisions. Buy this. Sell that. Hold everything. Each agent acts independently.

> By 7:00 AM, the dashboard on my hub has updated. I can see the signal flow map — which signals are hot, which are cooling off, where the clusters are forming. I can see each agent's portfolio — who bought what, who sold what, who's sitting on their hands. I can see conviction overlap — are Chris and Raoul aligned? Is Buffett disagreeing with Lynch? That disagreement is information.

> And the beautiful thing is — I didn't make any of those decisions. The system did. Based on three independent signal flows that check and balance each other.

> Now, do I still have override capability? Absolutely. This is paper trading — I'm still testing, still validating, still learning. But the architecture is designed so that when I trust it enough, the system can run autonomously. And every day that it runs, every day I can back-test its decisions against actual market outcomes, that trust builds a little more.

---

## SECTION 4: What I've Learned Building This (2 min)

> Let me leave you with three lessons from building this system. Because this episode is really about the architecture — but the architecture taught me something deeper.

> **Lesson one: Tension is a feature, not a bug.** Having a Buy Scanner and a Sell Signal Generator that naturally disagree? That's not a design flaw. That's the whole point. The best decisions come from structured disagreement. If you're building any kind of AI system — trading or otherwise — build in the adversarial check. Make your system argue with itself.

> **Lesson two: Personality creates differentiation.** Six generic agents looking at the same data would produce the same output. Six agents with deeply encoded philosophies produce six different perspectives. That diversity of thought is where alpha lives. When you're building AI agents, don't just give them a task. Give them a *worldview*.

> **Lesson three: Maps beat dashboards.** I had a traditional dashboard for weeks. Numbers, tables, charts. It was fine. But the moment I switched to a signal flow map — a visual, spatial representation of the system's thinking — I started seeing patterns I'd missed entirely. Clusters forming before the numbers confirmed them. Divergences appearing as visual breaks in the graph. If you're building a complex system, find a way to make it visible. Not just readable. Visible.

---

## OUTRO & CTA (1 min)

> That's the signal flow architecture. Three flows — find the buys, find the sells, let six different expert minds decide what's worth acting on. All converging on a map that redraws itself every single day.

> If you found this interesting, here's what I'd ask: subscribe. Whether you're on YouTube, Spotify, or Apple Podcasts — hit that button. Every subscription helps this show reach more builders who are trying to create something real.

> And if you want to see the actual signal flow map in action — the live dashboard, the agent portfolios, the daily signals — I'm considering opening up a view-only version for listeners. Drop a comment or send me a message if that's something you'd want to see.

> I'm Joshua Levy. This has been The Builder's Frequency. Keep building. I'll see you next week.`,
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const script = SCRIPTS[id];

  if (!script) {
    return NextResponse.json({ error: 'Script not found' }, { status: 404 });
  }

  return NextResponse.json({ id, script });
}
