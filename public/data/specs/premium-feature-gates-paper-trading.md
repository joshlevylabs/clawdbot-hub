# Premium Feature Gates - Paper Trading Analytics

**Document:** A-215 - Premium feature gates per A-203  
**Date:** February 24, 2026  
**Strategy:** Delayed data for both tiers, premium differentiated by analytics depth  

## Freemium Strategy Overview

### Free Tier: "Core Paper Trading"
- Basic portfolio creation and position tracking
- Simple P&L calculations (total return, daily change)
- Current position values with 15-minute delayed data
- Basic transaction history
- Single portfolio limit

### Premium Tier: "Advanced Analytics"  
- Everything in Free tier +
- Performance attribution analytics
- Risk analysis and scoring
- Portfolio psychology insights
- Advanced charts and trends
- Multiple portfolio support
- Export capabilities

## Feature Gate Specifications

### 1. **Performance Attribution (Premium)**

#### Free Tier Shows:
```
Portfolio P&L: +$1,247 (12.4%) 
Daily Change: +$89 (0.9%)
```

#### Premium Tier Shows:
```
Portfolio P&L: +$1,247 (12.4%)
├─ Sector Attribution:
   • Technology: +$789 (63% of gains)
   • Healthcare: +$321 (26% of gains)  
   • Energy: -$47 (losses)
├─ Position Attribution:
   • Top Winner: AAPL +$456 (36.6%)
   • Top Loser: XOM -$67 (-12.1%)
├─ Time Attribution:
   • Last 7 days: +$234
   • Last 30 days: +$1,011
```

#### Implementation:
- **Gate Location:** Portfolio overview screen, performance section
- **Upgrade Prompt:** "See what's driving your returns" + [Upgrade] button
- **Preview:** Show abbreviated version "Based on 3 sectors..." with blur effect

### 2. **Risk Scoring (Premium)**

#### Free Tier:
- No risk metrics displayed

#### Premium Tier:
```
Portfolio Risk Score: 7.2/10 (Aggressive)

Risk Breakdown:
├─ Concentration Risk: HIGH
   • Top 3 positions = 67% of portfolio
├─ Sector Risk: MEDIUM  
   • Technology overweight: 45% vs 28% market
├─ Volatility Risk: HIGH
   • Portfolio beta: 1.34 vs S&P 500
```

#### Implementation:
- **Gate Location:** New "Risk Analysis" tab in portfolio detail
- **Upgrade Prompt:** "Understand your portfolio risk" 
- **Teaser:** Show overall score (7.2/10) but lock breakdown behind paywall

### 3. **Behavioral Psychology Insights (Premium)**

#### Free Tier:
- Basic trade confirmations only

#### Premium Tier:
```
Trading Psychology Report:

📊 Bias Detection:
• Loss Aversion: Holding losers 2.3x longer than winners
• Confirmation Bias: 73% of research on existing holdings
• Overconfidence: 18% more trades after gains

💡 Improvement Suggestions:
• Set stop-loss rules before buying
• Research new opportunities, not just confirmations  
• Track decision journal for pattern awareness
```

#### Implementation:
- **Gate Location:** Monthly psychology report + behavioral alerts
- **Upgrade Prompt:** "Learn why you make trading decisions"
- **Sample:** Show one bias detection, lock full report

### 4. **Advanced Charting (Premium)**

#### Free Tier:
- Basic price chart (30-day line chart only)
- Current price + daily change

#### Premium Tier:
- Multiple timeframes (1D, 1W, 1M, 3M, 1Y)
- Technical indicators (SMA, RSI, MACD)
- Portfolio performance vs benchmarks (S&P 500, sector ETFs)
- Drawdown analysis
- Correlation heatmaps

#### Implementation:
- **Gate Location:** Position detail modals and portfolio analytics
- **Upgrade Prompt:** "Unlock professional charts"
- **Teaser:** Show basic chart, grey out advanced controls

### 5. **Multi-Portfolio Support (Premium)**

#### Free Tier:
- Single portfolio limit
- Upgrade prompt when trying to create second portfolio

#### Premium Tier:
- Unlimited portfolios
- Portfolio comparison tools
- Strategy backtesting across portfolios

#### Implementation:
- **Hard Gate:** Block portfolio creation after first one
- **Upgrade Prompt:** "Compare investment strategies" modal
- **Value Prop:** "Track different goals: retirement, growth, dividend income"

## User Journey & Upgrade Flows

### Primary Upgrade Triggers
1. **After first profit:** "See what drove your $X gain" (attribution)
2. **After portfolio hits $5K:** "Analyze risk as your portfolio grows"
3. **After 10 trades:** "Unlock your trading psychology report"
4. **Trying second portfolio:** "Organize your investment strategies"

### Upgrade Modal Design
```
🎯 Unlock Premium Analytics

✓ Performance attribution breakdown  
✓ Portfolio risk scoring
✓ Trading psychology insights
✓ Advanced charts & indicators
✓ Multiple portfolio tracking

[Start 7-Day Free Trial] - then $9.99/month
[Learn More] [Skip for Now]
```

### Trial Strategy
- **7-day free trial** for premium features
- **Graceful degradation** after trial ends
- **Re-engagement:** Monthly email with premium insights preview

## Implementation Architecture

### Feature Flag System
```javascript
const featureGates = {
  performanceAttribution: userTier === 'premium',
  riskScoring: userTier === 'premium', 
  psychologyInsights: userTier === 'premium',
  advancedCharts: userTier === 'premium',
  multiplePortfolios: userTier === 'premium' || portfolioCount === 0
}
```

### Data Requirements
- User subscription status
- Feature usage analytics
- Attribution calculation engine  
- Risk scoring algorithms
- Behavioral pattern detection

## Premium Pricing Strategy

### Target Price Point: $9.99/month
**Justification:**
- Delayed data costs: $200/month ÷ 100 users = $2/user
- Feature development & maintenance: ~$3/user
- 40% margin target: $4.99 profit per user
- Market positioning: Below Robinhood Gold ($5/month) + tools

### Conversion Targets
- **Trial-to-Paid:** 25%
- **Monthly Churn:** <5%
- **Free-to-Trial:** 15%

### Value Positioning
"The only paper trading app that teaches you **why** you win or lose, not just **what** you bought."

## A/B Testing Framework

### Test 1: Attribution Preview Depth
- **A:** Show sector attribution preview
- **B:** Show only "3 sectors analyzed" teaser

### Test 2: Upgrade Timing
- **A:** Immediate upgrade prompts
- **B:** Progressive engagement (after 3 trades)

### Test 3: Trial Length
- **A:** 7-day trial
- **B:** 14-day trial

### Test 4: Pricing
- **A:** $9.99/month
- **B:** $7.99/month

## Future Ultra-Premium Tier

### When Real-Time Data is Added ($19.99/month)
- Real-time market data (sub-second)
- Live portfolio alerts  
- Real-time risk monitoring
- Advanced order types simulation
- Professional-grade analytics

### Tier Structure Evolution
1. **Free:** Basic paper trading (delayed data)
2. **Premium ($9.99):** Analytics + insights (delayed data)  
3. **Pro ($19.99):** Everything + real-time data

---

**Next Steps:**
- Implement feature flag system in app architecture
- Create subscription management integration
- Build attribution calculation engine
- Design upgrade modal UI components