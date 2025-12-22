# Quick Start Guide for InsightFlow

This guide will help you get InsightFlow up and running in under 5 minutes.

## Prerequisites

- Node.js 14+ installed
- Tableau Desktop or Tableau Cloud access
- (Optional) Slack workspace for notifications
- (Optional) Salesforce account for task creation

## Step 1: Clone and Install

```bash
git clone https://github.com/ravigohel142996/insightflow-tableau-actionable-analytics.git
cd insightflow-tableau-actionable-analytics
npm install
```

## Step 2: Configure Environment (Optional)

For basic functionality, the extension works without configuration.

For Slack/Salesforce integration:
```bash
cp .env.example .env
# Edit .env with your credentials
```

## Step 3: Start the Backend

```bash
npm start
```

You should see:
```
InsightFlow backend server running on port 3000
Health check: http://localhost:3000/health
```

Test the health endpoint:
```bash
curl http://localhost:3000/health
```

## Step 4: Serve the Extension

In a new terminal:
```bash
# Install http-server globally if you don't have it
npm install -g http-server

# Serve the extension
cd tableau-extension
http-server -p 8080 --cors
```

## Step 5: Load in Tableau

### Tableau Desktop
1. Open a dashboard
2. Objects → Extension
3. Choose "Access Local Extensions"
4. Browse to `manifest.trex` in the `tableau-extension/` folder
5. Allow data access when prompted

### Tableau Cloud
1. Upload your extension to a web server with HTTPS
2. Update `manifest.trex` with your URL
3. Load the extension in your dashboard

## What You Should See

1. **Connection Status**: Shows connected dashboard name
2. **Semantic Metrics**: 4 business metrics with values and trends
3. **Active Insights**: Insights based on metric thresholds
4. **Recent Actions**: History of actions taken

## Testing the Extension

### Test Metrics Display
The extension automatically calculates and displays:
- Revenue Risk Index
- Delivery Delay Index
- Customer Health Score
- Pipeline Velocity

### Test Insight Detection
Insights are generated when:
- Metrics breach warning thresholds (>10%)
- Metrics breach critical thresholds (>20%)
- Significant trend changes occur (>5%)

### Test Actions
Try these actions:
1. Click **Acknowledge** - marks insight as reviewed
2. Click **Post to Slack** - sends to Slack (requires config)
3. Click **Create Task** - creates Salesforce task (requires config)
4. Click **Refresh Insights** - reloads insights

## Verify Everything Works

Run this test sequence:

```bash
# Start backend
npm start &

# Wait for startup
sleep 3

# Test health
curl http://localhost:3000/health

# Test metrics posting
curl -X POST http://localhost:3000/api/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "dashboardName": "Test Dashboard",
    "timestamp": "2025-12-22T10:00:00Z",
    "metrics": [{
      "id": "revenue_risk",
      "name": "Revenue Risk Index",
      "value": 0.3,
      "breached": "critical",
      "change": 0.1,
      "trend": "increasing"
    }]
  }'

# Get generated insights
curl http://localhost:3000/api/insights

# Clean up
pkill -f "node backend/server.js"
```

## Common Issues

### Port 3000 Already in Use
```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm start
```

### Extension Won't Load
- Check that http-server is running on port 8080
- Verify the URL in `manifest.trex` matches your server
- For Tableau Cloud, ensure you're using HTTPS

### Backend Connection Failed
- Verify backend is running: `curl http://localhost:3000/health`
- Check CORS is enabled in `server.js`
- Look at browser console for errors

### No Insights Showing
- Wait 30 seconds for auto-refresh
- Click "Refresh Insights" button
- Check that metrics have breached thresholds
- Look at browser console for errors

## Integration Setup

### Slack Integration (5 minutes)

1. Go to https://api.slack.com/apps
2. Create new app → From scratch
3. Choose "Incoming Webhooks"
4. Activate and add webhook to workspace
5. Copy webhook URL
6. Add to `.env`: `SLACK_WEBHOOK_URL=your-webhook-url`
7. Restart backend

Test:
```bash
curl -X POST http://localhost:3000/api/actions/slack \
  -H "Content-Type: application/json" \
  -d '{
    "insightId": "test-123",
    "insight": {
      "title": "Test Insight",
      "description": "Testing Slack integration",
      "severity": "medium",
      "metricName": "Test Metric",
      "timestamp": "2025-12-22T10:00:00Z"
    },
    "dashboardName": "Test Dashboard"
  }'
```

Check your Slack channel for the message!

### Salesforce Integration (10 minutes)

1. Setup → App Manager → New Connected App
2. Enable OAuth Settings
3. OAuth Scopes: `api`, `refresh_token`
4. Save and note Consumer Key & Secret
5. Get your Security Token (Settings → Reset Security Token)
6. Add to `.env`:
   ```
   SALESFORCE_INSTANCE_URL=https://yourinstance.salesforce.com
   SALESFORCE_CLIENT_ID=your-consumer-key
   SALESFORCE_CLIENT_SECRET=your-consumer-secret
   SALESFORCE_USERNAME=your-username
   SALESFORCE_PASSWORD=your-password
   SALESFORCE_SECURITY_TOKEN=your-token
   ```
7. Restart backend

Test:
```bash
curl -X POST http://localhost:3000/api/actions/salesforce \
  -H "Content-Type: application/json" \
  -d '{
    "insightId": "test-123",
    "insight": {
      "title": "Test Insight",
      "description": "Testing Salesforce integration",
      "severity": "high",
      "metricName": "Test Metric",
      "timestamp": "2025-12-22T10:00:00Z"
    },
    "dashboardName": "Test Dashboard"
  }'
```

Check Salesforce for the new task!

## Next Steps

1. **Customize Metrics**: Edit `tableau-extension/main.js` to add your own metrics
2. **Adjust Thresholds**: Modify threshold values to match your business needs
3. **Deploy to Production**: Host on HTTPS server for Tableau Cloud
4. **Add Database**: Replace in-memory storage with PostgreSQL/MongoDB
5. **Set Up Monitoring**: Add logging and error tracking

## Need Help?

- Check the full [README.md](../README.md)
- Review [architecture.md](architecture.md)
- Look at [metrics.md](../backend/config/metrics.md)
- Open an issue on GitHub

## Development Workflow

```bash
# Terminal 1: Backend with auto-reload
npm run dev

# Terminal 2: Extension server
cd tableau-extension && http-server -p 8080 --cors

# Make changes to code
# Reload extension in Tableau to see updates
```

Happy analyzing! 📊
