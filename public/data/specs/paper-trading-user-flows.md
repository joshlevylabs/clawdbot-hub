# Paper Trading User Flows - Scope-Controlled MVP

**Document:** A-212 - Finalizing user flows for A-168 to eliminate scope creep concerns  
**Date:** February 24, 2026  
**Decision Context:** CEO approved delayed data strategy for both tiers, manual entry MVP  

## Strategic Constraints

### 🚫 Scope Boundaries (Anti-Creep)
- **NO brokerage sync in V1** - Manual portfolio entry only
- **NO real-time data** - 15-minute delayed data for both free/premium 
- **NO automated trade execution** - Educational paper trading only
- **NO complex order types** - Market orders and basic limit orders only
- **NO options trading** - Stocks and ETFs only

### ✅ Core MVP Features
- Manual portfolio creation and position tracking
- Basic P&L calculations using delayed market data
- Simple buy/sell transaction logging
- Performance metrics (total return, daily P&L)

## User Flow Hierarchy

### 1. **Entry Points**
```
Finance Tab → [Paper Trading] card
                ↓
            Portfolio Overview
```

### 2. **First-Time Setup**
```
Portfolio Overview (empty state)
    ↓
"Create Your First Portfolio" CTA
    ↓
Portfolio Name Input → "Start Trading"
    ↓
Portfolio Dashboard (empty positions)
```

### 3. **Core Trading Flow**
```
Portfolio Dashboard
    ↓
[+ Add Position] button
    ↓
Add Position Modal:
- Symbol search (ticker lookup)
- Quantity input 
- Entry price input
- Date picker (when purchased)
- [Add Position] CTA
    ↓
Position added to portfolio list
    ↓
Auto-refresh P&L (every 15 min with delayed data)
```

### 4. **Position Management**
```
Portfolio Dashboard → Position row tap
    ↓
Position Detail Modal:
- Current price (delayed)
- Entry price & date
- Shares held
- Current P&L ($/%){
- [Sell Partial] / [Sell All] buttons
    ↓
Sell Modal:
- Quantity to sell (default: all)
- Current market price (delayed, read-only)
- Estimated proceeds
- [Confirm Sale] CTA
    ↓
Position updated/removed from portfolio
```

## Screen Specifications

### A. Portfolio Overview Screen
**Layout:** Card-based list within Finance tab
- Portfolio name + total value/P&L
- Quick stats: Position count, daily change
- [+ Add Position] FAB
- Position list (symbol, shares, P&L)

**Empty State:** 
"Start Paper Trading"
"Practice investing without risking real money"
[Create Portfolio] CTA

### B. Add Position Modal
**Fields:**
1. Stock symbol (searchable dropdown)
2. Number of shares (numeric input)
3. Purchase price (auto-filled with current price, editable)
4. Purchase date (date picker, defaults today)

**Validation:**
- Symbol must exist in market data
- Shares > 0
- Price > $0.01
- Date <= today

### C. Position Detail Modal
**Information Display:**
- Symbol + company name
- Current price (15-min delayed indicator)
- Shares owned
- Total value (price × shares)
- Purchase details (date, price, cost basis)
- P&L calculation (absolute $ and %)
- Simple line chart (price trend, 30-day max)

## Data Architecture (Simplified)

### Portfolio Table
```sql
id, user_id, name, created_at, updated_at
```

### Position Table
```sql
id, portfolio_id, symbol, shares, entry_price, 
entry_date, status (active/sold), created_at
```

### Transaction Table 
```sql
id, position_id, type (buy/sell), shares, price, 
date, notes, created_at
```

### Market Data Integration
- **Source:** Delayed market data feed ($200/month)
- **Refresh:** Every 15 minutes during market hours
- **Storage:** Latest price only (no historical beyond 30 days)
- **Symbols:** US equities + major ETFs only

## Interaction Patterns

### Mobile-First Design
- **Large tap targets** (minimum 44pt)
- **Swipe actions** on position rows (swipe → sell)
- **Pull-to-refresh** for market data updates
- **Progressive disclosure** (overview → detail → action)

### Performance Considerations
- **Lazy loading** of portfolio data
- **Local caching** of market prices (15-min TTL)
- **Optimistic updates** for position changes
- **Background sync** when app resumes

## Educational Elements (Minimal)
- Delayed data indicator: "Prices updated 15 minutes ago"
- First position hint: "This is practice money - experiment freely!"
- P&L context: "Paper gains/losses don't predict real trading results"

## Success Metrics
- Portfolio creation rate (% of finance tab visitors)
- Position additions per portfolio
- Time spent in trading interface
- Retention at 7/30 days

## Anti-Scope-Creep Guardrails
1. **No feature requests during V1** - Document for V2
2. **Manual input only** - Resist API sync temptation
3. **Basic calculations only** - No complex analytics in V1
4. **Single portfolio limit** - Simplify data model
5. **Cash position ignored** - Focus on stock positions only

---

**Next Steps:**
- A-215: Design premium feature gates around performance attribution
- Technical implementation via A-167, A-202, A-205
- UI mockups and SwiftUI implementation