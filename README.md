# InsightFlow - Actionable Analytics for Tableau Cloud

InsightFlow is a production-grade Tableau Cloud extension that transforms dashboard insights into actionable workflows by integrating with Slack and Salesforce. It monitors business metrics, detects meaningful changes, and enables teams to respond quickly with contextual actions.

## Overview

InsightFlow bridges the gap between analytics and action by:
- **Monitoring semantic business metrics** in real-time from Tableau dashboards
- **Detecting insights** based on threshold breaches, trend changes, and period-over-period comparisons
- **Delivering contextual notifications** to Slack with action buttons
- **Creating tasks and cases** in Salesforce with full metric context
- **Tracking action status** and closing the feedback loop

## Key Features

### 1. Tableau Extension
- Built using Tableau Extensions API v1.0
- Connects to Tableau Cloud dashboards
- Reads dashboard data, parameters, and selected marks
- Clean, enterprise-ready UI with no distractions

### 2. Semantic Metrics Layer
Business-friendly metric definitions that translate raw data into actionable insights:
- **Revenue Risk Index** - Measures revenue volatility and at-risk accounts
- **Delivery Delay Index** - Tracks project delays and on-time delivery
- **Customer Health Score** - Composite satisfaction and engagement score
- **Pipeline Velocity** - Sales pipeline movement and conversion speed

### 3. Insight Detection Logic
Rule-based and statistical analysis (no AI/ML claims):
- Threshold breach detection (warning/critical levels)
- Trend change identification
- Period-over-period comparison
- Configurable sensitivity and thresholds

### 4. Action Layer

#### Slack Integration
- Post insights to channels with rich formatting
- Action buttons: Acknowledge, Assign, View Dashboard
- Block Kit for professional message layout
- Webhook or Bot Token support

#### Salesforce Integration
- Create Tasks for medium priority insights
- Create Cases for critical alerts
- Attach full metric context and dashboard links
- OAuth 2.0 authentication

### 5. Feedback Loop
- Track all actions taken (Slack posts, Salesforce tasks, acknowledgments)
- Display recent action history in the extension
- Real-time status updates

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Tableau Dashboard                      │
│                    (Data Source)                        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ Tableau Extensions API
                       │
┌──────────────────────▼──────────────────────────────────┐
│              InsightFlow Extension                      │
│              (tableau-extension/)                       │
│                                                         │
│  • Read dashboard data and parameters                  │
│  • Calculate semantic metrics                          │
│  • Generate insights locally                           │
│  • Display UI with metrics, insights, and actions      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ REST API
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Backend Service (Optional)                 │
│              (backend/)                                 │
│                                                         │
│  • Store metrics and insights                          │
│  • Enhanced insight detection                          │
│  • Action coordination                                 │
└──────┬─────────────────────────────────┬────────────────┘
       │                                 │
       │                                 │
┌──────▼─────────┐            ┌──────────▼──────────┐
│     Slack      │            │     Salesforce      │
│  Integration   │            │    Integration      │
│                │            │                     │
│ • Post msgs    │            │ • Create tasks      │
│ • Action btns  │            │ • Create cases      │
└────────────────┘            └─────────────────────┘
```

## Project Structure

```
insightflow-tableau-actionable-analytics/
│
├── index.html                 # Main UI (Tableau extension frontend)
├── main.js                    # Core logic and Tableau API integration
├── styles.css                 # Professional, minimal styling
├── manifest.trex              # Tableau extension manifest
│
├── tableau-extension/         # Original extension source (for reference)
│   ├── index.html
│   ├── main.js
│   ├── styles.css
│   └── manifest.trex
│
├── backend/                   # Backend service (optional)
│   ├── server.js              # Express server
│   ├── slackService.js        # Slack API integration
│   ├── salesforceService.js   # Salesforce API integration
│   └── config/
│       └── metrics.md         # Semantic metrics documentation
│
├── docs/                      # Documentation
│   ├── architecture.md        # Detailed architecture
│   └── screenshots/           # UI screenshots
│
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
├── package.json               # Node.js dependencies
└── README.md                  # This file
```

**Note**: The extension files are now in the repository root for GitHub Pages deployment.

## Setup Instructions

### Prerequisites
- Node.js 14+ (for backend service)
- Tableau Cloud account with extension support
- Slack workspace (for Slack integration)
- Salesforce account (for Salesforce integration)

### 1. Clone the Repository
```bash
git clone https://github.com/ravigohel142996/insightflow-tableau-actionable-analytics.git
cd insightflow-tableau-actionable-analytics
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
```bash
cp .env.example .env
# Edit .env with your credentials
```

Required variables:
- `SLACK_WEBHOOK_URL` or `SLACK_BOT_TOKEN` - For Slack integration
- `SALESFORCE_INSTANCE_URL`, `SALESFORCE_CLIENT_ID`, etc. - For Salesforce

### 4. Start the Backend Service
```bash
npm start
# Or for development with auto-reload:
npm run dev
```

The backend will run on `http://localhost:3000`

### 5. Set Up the Tableau Extension

#### Option A: GitHub Pages (Recommended for Quick Start)
The extension is now hosted at: https://ravigohel142996.github.io/insightflow-tableau-actionable-analytics/

1. Use the extension directly from GitHub Pages
2. Update `manifest.trex` source-location URL to point to the GitHub Pages URL
3. Load the extension in Tableau Desktop or Tableau Cloud

#### Option B: Local Development
1. Serve the extension files locally:
   ```bash
   # Install a simple HTTP server
   npm install -g http-server
   
   # Serve from the repository root
   http-server -p 8080 --cors
   ```

2. Update `manifest.trex` source-location URL if needed
3. Load the extension in Tableau Desktop or Tableau Cloud

#### Option C: Custom Production Deployment
1. Host the extension files (`index.html`, `main.js`, `styles.css`, `manifest.trex`) on a web server with HTTPS
2. Update the `manifest.trex` with your production URL
3. Sign the manifest file (for Tableau Cloud)
4. Add the extension to your Tableau dashboard

### 6. Configure Slack Integration

#### Webhook Method (Simpler)
1. Go to https://api.slack.com/apps
2. Create a new app
3. Enable Incoming Webhooks
4. Add webhook to workspace
5. Copy webhook URL to `.env` as `SLACK_WEBHOOK_URL`

#### Bot Token Method (More Features)
1. Create Slack app at https://api.slack.com/apps
2. Add OAuth scopes: `chat:write`, `chat:write.customize`
3. Install app to workspace
4. Copy Bot User OAuth Token to `.env` as `SLACK_BOT_TOKEN`

### 7. Configure Salesforce Integration

1. Create a Connected App in Salesforce:
   - Setup → App Manager → New Connected App
   - Enable OAuth Settings
   - Select OAuth scopes: `api`, `refresh_token`
   - Note the Consumer Key and Consumer Secret

2. Get your security token (if required):
   - User Settings → Reset Security Token

3. Add credentials to `.env`

## Usage

### In Tableau Desktop/Cloud

1. Open your dashboard
2. Add the InsightFlow extension:
   - Objects → Extension → Choose Extension
   - Browse to your `manifest.trex` file
   - Allow data access when prompted

3. The extension will:
   - Connect to your dashboard
   - Display calculated semantic metrics
   - Show active insights
   - Allow you to take actions

### Taking Actions

#### From the Extension
- **Acknowledge**: Mark insight as seen/reviewed
- **Post to Slack**: Send insight to your team channel
- **Create Task**: Generate Salesforce task with context

#### From Slack
When an insight is posted to Slack, users can:
- Click "Acknowledge" to mark as reviewed
- Click "Assign" to assign to a team member
- Click "View Dashboard" to open the Tableau dashboard

### Monitoring Actions
The "Recent Actions" section shows:
- All actions taken on insights
- Status (completed, pending, assigned)
- Timestamp and platform (Slack/Salesforce)

## Customization

### Adding New Metrics

1. Edit `tableau-extension/main.js`
2. Add a new metric definition in `extractSemanticMetrics()`:

```javascript
{
    id: 'your_metric_id',
    name: 'Your Metric Name',
    description: 'What this metric measures',
    calculation: (data) => calculateYourMetric(data),
    threshold: { warning: 0.15, critical: 0.25 }
}
```

3. Implement the calculation function
4. Document in `backend/config/metrics.md`

### Adjusting Thresholds

Modify threshold values in the metric definitions to match your business needs:
- `warning`: Yellow alert level
- `critical`: Red alert level

### Customizing Slack Messages

Edit `backend/slackService.js` → `buildSlackMessage()` to customize:
- Message format and blocks
- Button labels and actions
- Color coding
- Emoji indicators

### Customizing Salesforce Objects

Edit `backend/salesforceService.js` to customize:
- Task/Case fields
- Priority mapping
- Assignment logic
- Custom field values

## Deployment

### Extension Hosting
For production use:
1. Host on HTTPS server (required by Tableau Cloud)
2. Use CDN for static assets
3. Enable CORS headers
4. Sign the manifest file

### Backend Service
Recommended platforms:
- AWS Elastic Beanstalk
- Heroku
- Google Cloud Run
- Azure App Service

Environment:
- Set all environment variables
- Use secrets management
- Enable HTTPS
- Set up monitoring

## Security Considerations

- **Never commit secrets**: Use `.env` files (in `.gitignore`)
- **Use HTTPS**: Required for Tableau Cloud extensions
- **Validate input**: Sanitize data from Tableau API
- **Secure tokens**: Use environment variables for all API keys
- **CORS policy**: Restrict origins in production
- **OAuth flows**: Use secure authentication for Salesforce

## Troubleshooting

### Extension Won't Load
- Check that `manifest.trex` URL is accessible
- Verify HTTPS is enabled (for Tableau Cloud)
- Check browser console for errors

### Backend Connection Failed
- Verify backend is running (`http://localhost:3000/health`)
- Check CORS settings in `server.js`
- Ensure firewall allows connections

### Slack Messages Not Sending
- Verify webhook URL or bot token is correct
- Check channel permissions
- Review Slack app OAuth scopes

### Salesforce Task Creation Fails
- Verify credentials in `.env`
- Check Salesforce API limits
- Review connected app permissions
- Ensure security token is included with password

## Contributing

This is a production-grade enterprise extension. Contributions should maintain:
- Clean, readable code
- Clear comments explaining WHY, not just WHAT
- Professional UI/UX
- Security best practices
- No AI/ML buzzwords

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/ravigohel142996/insightflow-tableau-actionable-analytics/issues)
- Documentation: See `docs/` folder

---

**Built for enterprise analytics teams who need to turn insights into action.**
