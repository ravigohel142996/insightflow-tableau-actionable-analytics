# InsightFlow Architecture

## System Design

InsightFlow follows a modular architecture with clear separation of concerns:

### Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Tableau Cloud                           │
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐    │
│  │                    Dashboard                          │    │
│  │  • Data visualizations                                │    │
│  │  • Filters and parameters                             │    │
│  │  • Summary data                                       │    │
│  └───────────────────────────────────────────────────────┘    │
│                          │ Extensions API                      │
│                          ▼                                      │
│  ┌───────────────────────────────────────────────────────┐    │
│  │          InsightFlow Extension (Frontend)             │    │
│  │                                                        │    │
│  │  ┌──────────────────────────────────────────────┐   │    │
│  │  │  UI Layer (index.html, styles.css)           │   │    │
│  │  │  • Connection status                         │   │    │
│  │  │  • Metrics display                           │   │    │
│  │  │  • Insights list                             │   │    │
│  │  │  • Actions history                           │   │    │
│  │  └──────────────────────────────────────────────┘   │    │
│  │                          │                            │    │
│  │  ┌──────────────────────────────────────────────┐   │    │
│  │  │  Business Logic (main.js)                    │   │    │
│  │  │  • Tableau API integration                   │   │    │
│  │  │  • Semantic metrics calculation              │   │    │
│  │  │  • Local insight generation                  │   │    │
│  │  │  • Event handling                            │   │    │
│  │  └──────────────────────────────────────────────┘   │    │
│  └───────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API (HTTP/JSON)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend Service (Optional)                   │
│                         Node.js + Express                       │
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐    │
│  │  Core Server (server.js)                              │    │
│  │  • API endpoints                                      │    │
│  │  • Metrics storage                                    │    │
│  │  • Insight detection                                  │    │
│  │  • Action tracking                                    │    │
│  └───────────────────────────────────────────────────────┘    │
│                          │                                      │
│         ┌────────────────┴────────────────┐                   │
│         ▼                                  ▼                   │
│  ┌─────────────────┐              ┌──────────────────┐       │
│  │ Slack Service   │              │ Salesforce Svc   │       │
│  │ (slackService)  │              │ (salesforceSvc)  │       │
│  │ • Post messages │              │ • Create tasks   │       │
│  │ • Handle actions│              │ • Create cases   │       │
│  │ • Format blocks │              │ • OAuth auth     │       │
│  └─────────────────┘              └──────────────────┘       │
└──────────┬───────────────────────────────┬────────────────────┘
           │                               │
           ▼                               ▼
┌──────────────────────┐      ┌───────────────────────┐
│      Slack API       │      │   Salesforce API      │
│  • Web hooks         │      │   • REST API          │
│  • chat.postMessage  │      │   • OAuth 2.0         │
│  • Interactive msgs  │      │   • Task/Case objects │
└──────────────────────┘      └───────────────────────┘
```

## Data Flow

### 1. Metric Collection Flow

```
Tableau Dashboard → Extensions API → InsightFlow Extension
                                            │
                                            ▼
                                   Extract Raw Data
                                            │
                                            ▼
                                   Semantic Metrics Layer
                                   (Business Logic)
                                            │
                                            ▼
                                   Calculate Metrics:
                                   • Revenue Risk
                                   • Delivery Delay
                                   • Customer Health
                                   • Pipeline Velocity
                                            │
                                            ▼
                                   Display in UI + Send to Backend
```

### 2. Insight Detection Flow

```
Metrics Data → Backend Service
                     │
                     ▼
              Insight Detection Logic
                     │
      ┌──────────────┼──────────────┐
      ▼              ▼               ▼
 Threshold       Trend           Period-over-
  Breach       Analysis          Period Compare
      │              │               │
      └──────────────┴───────────────┘
                     │
                     ▼
            Generate Insights
            (with severity level)
                     │
                     ▼
            Store + Return to Extension
                     │
                     ▼
            Display in Insights Section
```

### 3. Action Execution Flow

```
User clicks action button in Extension UI
              │
              ▼
    POST to Backend Service
              │
    ┌─────────┴─────────┐
    ▼                   ▼
Post to Slack     Create Salesforce Task
    │                   │
    ▼                   ▼
Slack API         Salesforce API
    │                   │
    └─────────┬─────────┘
              ▼
    Record Action in Backend
              │
              ▼
    Return Success to Extension
              │
              ▼
    Update Actions List in UI
```

## Key Design Decisions

### 1. Semantic Metrics Layer
**Why**: Translates technical data into business-friendly metrics
- Separates raw data from business logic
- Makes thresholds and rules explicit
- Easy to configure and maintain
- No black-box calculations

**Implementation**: Pure JavaScript functions in `main.js`

### 2. Local-First with Optional Backend
**Why**: Extension works even if backend is unavailable
- Frontend can calculate metrics independently
- Backend enhances functionality (persistence, advanced detection)
- Graceful degradation when backend is down
- Simpler deployment for basic use cases

### 3. Rule-Based Insight Detection
**Why**: Transparent, auditable, and deterministic
- No "AI magic" - all logic is explicit
- Threshold-based (configurable)
- Trend analysis (statistical)
- Period comparison (business rules)
- Easy to debug and explain

**Alternative considered**: Machine learning was explicitly avoided per requirements

### 4. Stateless Backend API
**Why**: Simplicity and scalability
- In-memory storage for demo (would use DB in production)
- RESTful API design
- Easy to scale horizontally
- Clear API contracts

### 5. Direct API Integration (No Third-Party Services)
**Why**: Security, control, and enterprise requirements
- Direct HTTPS calls to Slack and Salesforce
- No external dependencies or services
- Full control over authentication
- Meets enterprise security standards

## Component Details

### Frontend Extension

**Technology**: Vanilla JavaScript + Tableau Extensions API
- No framework dependencies (faster load, smaller size)
- Direct DOM manipulation
- Event-driven architecture
- Responsive CSS Grid layout

**State Management**: Simple object-based state
```javascript
dashboardState = {
    connected: boolean,
    dashboardName: string,
    worksheets: array,
    currentMetrics: object,
    insights: array,
    actions: array
}
```

### Backend Service

**Technology**: Node.js + Express
- Lightweight and fast
- Native HTTPS support
- Easy deployment
- Large ecosystem

**API Endpoints**:
- `POST /api/metrics` - Receive metrics from extension
- `GET /api/insights` - Retrieve active insights
- `POST /api/insights/:id/acknowledge` - Mark insight as acknowledged
- `POST /api/actions/slack` - Post to Slack
- `POST /api/actions/salesforce` - Create Salesforce task
- `GET /api/actions` - Get action history

### Integration Services

#### Slack Service
**Authentication Options**:
1. Webhook URL (simple, one-way)
2. Bot Token (full API access, two-way)

**Message Format**: Slack Block Kit
- Rich formatting
- Action buttons
- Color coding by severity
- Contextual information

#### Salesforce Service
**Authentication**: OAuth 2.0 Password Flow
- Secure token-based auth
- Token caching (1 hour)
- Automatic refresh

**Object Creation**:
- Tasks (medium/low priority)
- Cases (high priority)
- Full context included
- Dashboard links attached

## Security Architecture

### 1. Extension Security
- Runs in sandboxed iframe in Tableau
- HTTPS required for Tableau Cloud
- Signed manifest file
- Limited permissions (full data access)

### 2. Backend Security
- Environment variables for all secrets
- No hardcoded credentials
- CORS restrictions
- Input validation
- HTTPS in production

### 3. API Integration Security
- OAuth 2.0 for Salesforce
- Token-based auth for Slack
- Secrets stored in environment
- No logging of credentials

## Scalability Considerations

### Current Implementation (Demo/Small Scale)
- In-memory storage
- Single server instance
- Synchronous processing

### Production Recommendations
- Add database (PostgreSQL, MongoDB)
- Use message queue (RabbitMQ, SQS)
- Implement caching (Redis)
- Horizontal scaling (load balancer)
- Background job processing

## Monitoring & Observability

**Recommended Additions for Production**:
1. Logging framework (Winston, Bunyan)
2. Error tracking (Sentry)
3. Metrics collection (Prometheus)
4. Health checks
5. Performance monitoring

## Extension Lifecycle

```
Extension Loads
      │
      ▼
Initialize Tableau API
      │
      ▼
Connect to Dashboard
      │
      ▼
Register Event Listeners
  • Parameter changes
  • Filter changes
  • Mark selection
      │
      ▼
Load Initial Data
  • Metrics
  • Insights
  • Actions
      │
      ▼
Start Auto-Refresh Timer (30s)
      │
      ▼
Wait for User Interactions
  • Click buttons
  • Dashboard changes
      │
      ▼
Update UI in Real-Time
```

## Error Handling Strategy

### Extension Errors
- Graceful degradation if backend unavailable
- User-friendly error messages
- Console logging for debugging
- Retry logic for network failures

### Backend Errors
- Try-catch around all API calls
- Structured error responses
- Fallback to local processing
- Error logging

### Integration Errors
- Catch Slack/Salesforce failures
- Return clear error messages
- Don't block other functionality
- Provide configuration guidance

## Future Enhancements

**Potential additions** (not in current scope):
1. Database persistence
2. Advanced analytics (more complex rules)
3. Email notifications
4. Microsoft Teams integration
5. Jira integration
6. Custom metric builder UI
7. Dashboard embedding
8. Mobile responsive design
9. Multi-language support
10. Role-based access control

---

This architecture balances simplicity with enterprise requirements, providing a solid foundation for actionable analytics in Tableau Cloud.
