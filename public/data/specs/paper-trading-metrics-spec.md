# Paper Trading Metrics Specification

**Version:** 1.0  
**Created:** February 23, 2026  
**Owner:** CRO Team  
**Status:** Active

## Overview

This document defines the key performance indicators (KPIs) and tracking requirements for the paper trading MVP and premium tier conversion funnel. With parallel development ongoing, these metrics will guide product decisions and revenue optimization.

---

## 1. User Engagement Metrics

### Daily Active Users (DAU)
- **Definition:** Unique users who interact with paper trading features in a 24-hour period
- **Includes:** Portfolio views, trade execution, signal consumption, performance analysis
- **Segmentation:** Free vs Premium ($3/$9 tiers)
- **Target:** 15% DAU growth month-over-month

### Session Metrics
- **Session Duration:** Time spent in paper trading interface per session
- **Pages Per Session:** Average page views during trading sessions  
- **Session Frequency:** Average sessions per user per week
- **Bounce Rate:** Single-page sessions under 10 seconds

### Feature Adoption
- **Portfolio Creation Rate:** % of users who create their first portfolio within 48 hours
- **First Trade Completion:** % completing first paper trade within 7 days
- **Signal Engagement:** % clicking on MRE signals vs just viewing
- **Today's Plays Usage:** Daily interaction rate with curated trade suggestions

---

## 2. Conversion Funnel Metrics

### Lead Generation
- **Sign-up Rate:** New registrations per day
- **Source Attribution:** Organic, social, email, referral breakdown
- **Intent Signals:** Users viewing pricing page, premium features

### Trial-to-Paid Conversion
- **Free-to-More Levers ($3):** Conversion rate and time-to-convert
- **Free-to-All The Levers ($9):** Direct premium conversion rate
- **More Levers-to-All The Levers:** Tier upgrade rate
- **Conversion Velocity:** Average days from signup to first payment

### Pricing Tier Analysis
- **Tier Distribution:** % breakdown of Free/More Levers/All The Levers
- **Revenue Per User (RPU):** Monthly average across all tiers
- **Customer Lifetime Value (CLV):** 12-month projected value by tier
- **Churn Rate:** Monthly churn by tier with cohort analysis

---

## 3. Revenue Performance

### Monthly Recurring Revenue (MRR)
- **New MRR:** Revenue from new premium subscriptions
- **Expansion MRR:** Revenue from tier upgrades (More→All)
- **Churned MRR:** Revenue lost from cancellations
- **Net MRR Growth:** Month-over-month net revenue change

### Premium Feature Engagement
- **MRE Signal CTR:** Click-through rate on market signals
- **Today's Plays Execution:** % of suggested trades users actually execute
- **Pit Agent Usage:** Sessions per month for $9 tier subscribers
- **Chris Vermeullen Chat:** Individual stock analysis usage frequency

### Revenue Attribution
- **Feature-Driven Conversions:** Which premium features drive upgrades
- **Content-to-Premium:** Blog/newsletter readers who convert
- **Social Proof Impact:** Conversion lift from testimonials/results

---

## 4. Product-Market Fit Indicators

### User Satisfaction
- **Net Promoter Score (NPS):** Quarterly user satisfaction survey
- **Feature Request Volume:** User-initiated enhancement requests
- **Support Ticket Sentiment:** Positive vs negative support interactions

### Retention Cohorts
- **7-Day Retention:** Users active after first week
- **30-Day Retention:** Monthly active user retention
- **90-Day Retention:** Quarterly user stickiness

### Market Validation
- **Referral Rate:** Organic user-to-user referrals
- **Social Sharing:** User-generated content about trading results
- **Premium Feature Stickiness:** Days between last usage and churn

---

## 5. Technical Performance

### Platform Reliability
- **Uptime SLA:** 99.9% availability target for trading functions
- **Trade Execution Speed:** Average latency for paper trade processing
- **Data Sync Accuracy:** Real-time market data refresh reliability

### Mobile vs Web
- **Platform Usage Split:** Mobile app vs web platform engagement
- **Conversion Rate by Platform:** Premium subscription rates mobile vs web
- **Feature Parity Impact:** Usage differences between platforms

---

## 6. Competitive Intelligence

### Market Position
- **User Acquisition Cost (CAC):** Cost per premium subscriber vs competitors
- **Feature Gap Analysis:** Premium features missing vs market leaders
- **Pricing Elasticity:** Conversion sensitivity to tier pricing changes

---

## 7. Implementation Requirements

### Data Collection
- **Event Tracking:** All user interactions with paper trading features
- **Revenue Webhooks:** Real-time subscription status changes
- **Cohort Segmentation:** User grouping by signup date, source, behavior

### Reporting Dashboard
- **Real-time Metrics:** Live DAU, MRR, conversion rates
- **Weekly Reports:** Automated performance summaries
- **Monthly Deep Dives:** Cohort analysis and trend identification

### Success Thresholds
- **Launch Success:** 1,000+ active paper traders within 30 days
- **Premium Viability:** 10%+ conversion to paid tiers by month 2
- **Growth Validation:** 25% month-over-month user growth for 3 months

---

## 8. Risk Metrics

### Churn Warning Signals
- **Engagement Decline:** 50%+ reduction in session frequency
- **Feature Abandonment:** Premium users not using paid features
- **Support Escalation:** Negative feedback patterns

### Revenue Protection
- **Churn Prediction:** ML model for subscription cancellation risk
- **Win-back Campaigns:** Re-engagement program effectiveness
- **Competitive Defection:** Users mentioning competitor alternatives

---

## Implementation Notes

This specification supports the CEO's decision for parallel development with two premium tiers. Metrics will be tracked via:
- Custom analytics events in the app
- Stripe/payment webhook integration
- Weekly automated reports to leadership team

**Next Steps:**
1. Implement tracking infrastructure
2. Set up automated dashboard
3. Establish weekly metric review cadence
4. Define alert thresholds for key metrics

---

*Document Owner: Dave (CRO) | Last Updated: Feb 23, 2026*