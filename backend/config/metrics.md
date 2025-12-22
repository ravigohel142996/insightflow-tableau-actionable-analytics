# Semantic Metrics Configuration
# This file defines business-friendly metrics and their thresholds

## Revenue Risk Index
**Definition**: Measures revenue volatility and accounts at risk of churn
- **Calculation**: Weighted score based on:
  - Account health indicators
  - Payment history
  - Usage trends
  - Support ticket volume
- **Thresholds**:
  - Warning: 15% (0.15)
  - Critical: 25% (0.25)
- **Actions**: Monitor closely, engage account managers

## Delivery Delay Index
**Definition**: Tracks project delays and on-time delivery performance
- **Calculation**: Ratio of delayed projects to total projects
- **Thresholds**:
  - Warning: 10% (0.10)
  - Critical: 20% (0.20)
- **Actions**: Review resource allocation, escalate delays

## Customer Health Score
**Definition**: Composite score of customer satisfaction and engagement (0-100)
- **Calculation**: Weighted average of:
  - Product usage frequency
  - Feature adoption rate
  - Support satisfaction scores
  - NPS score
- **Thresholds**:
  - Warning: < 70
  - Critical: < 60
- **Actions**: Customer success outreach, schedule review calls

## Pipeline Velocity
**Definition**: Measures sales pipeline movement and conversion speed
- **Calculation**: (Closed deals value) / (Average time in pipeline)
- **Thresholds**:
  - Warning: < 0.20
  - Critical: < 0.15
- **Actions**: Review sales process, identify bottlenecks

---

## Adding Custom Metrics

To add a new metric to InsightFlow:

1. Define the metric in `main.js` under `extractSemanticMetrics()`
2. Add the calculation logic
3. Set appropriate thresholds
4. Update this documentation

Example:
```javascript
{
    id: 'support_ticket_volume',
    name: 'Support Ticket Volume',
    description: 'Monthly support ticket volume trend',
    calculation: (data) => calculateSupportVolume(data),
    threshold: { warning: 100, critical: 150 }
}
```
