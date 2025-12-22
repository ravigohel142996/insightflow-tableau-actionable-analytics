/**
 * InsightFlow Backend Server
 * 
 * Express server that handles:
 * - Metric storage and insight detection
 * - Slack integration for posting insights
 * - Salesforce integration for creating tasks/cases
 * - Action tracking and feedback loop
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const slackService = require('./slackService');
const salesforceService = require('./salesforceService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// In-memory storage for demo purposes
// In production, this would be a database
const storage = {
    metrics: [],
    insights: [],
    actions: []
};

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'InsightFlow Backend'
    });
});

/**
 * POST /api/metrics
 * Receive metrics from Tableau extension and detect insights
 */
app.post('/api/metrics', async (req, res) => {
    try {
        const { dashboardName, timestamp, metrics } = req.body;
        
        // Store metrics
        storage.metrics.push({
            dashboardName,
            timestamp,
            metrics
        });
        
        // Keep only last 100 metric snapshots
        if (storage.metrics.length > 100) {
            storage.metrics = storage.metrics.slice(-100);
        }
        
        // Detect insights based on metrics
        const newInsights = detectInsights(metrics, dashboardName);
        
        // Store new insights
        newInsights.forEach(insight => {
            // Avoid duplicates
            const exists = storage.insights.some(i => 
                i.metricId === insight.metricId && 
                i.severity === insight.severity &&
                (Date.now() - new Date(i.timestamp).getTime()) < 300000 // 5 minutes
            );
            
            if (!exists) {
                storage.insights.push(insight);
            }
        });
        
        // Keep only last 50 insights
        if (storage.insights.length > 50) {
            storage.insights = storage.insights.slice(-50);
        }
        
        res.json({ 
            success: true, 
            insightsDetected: newInsights.length 
        });
        
    } catch (error) {
        console.error('Error processing metrics:', error);
        res.status(500).json({ error: 'Failed to process metrics' });
    }
});

/**
 * GET /api/insights
 * Retrieve active insights
 */
app.get('/api/insights', (req, res) => {
    try {
        // Return only insights from the last 24 hours
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const activeInsights = storage.insights.filter(insight => 
            new Date(insight.timestamp).getTime() > oneDayAgo &&
            !insight.acknowledged
        );
        
        res.json(activeInsights);
    } catch (error) {
        console.error('Error retrieving insights:', error);
        res.status(500).json({ error: 'Failed to retrieve insights' });
    }
});

/**
 * POST /api/insights/:id/acknowledge
 * Mark an insight as acknowledged
 */
app.post('/api/insights/:id/acknowledge', (req, res) => {
    try {
        const { id } = req.params;
        const insight = storage.insights.find(i => i.id === id);
        
        if (insight) {
            insight.acknowledged = true;
            insight.acknowledgedAt = new Date().toISOString();
            
            // Record action
            storage.actions.push({
                id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'acknowledge',
                insightId: id,
                insightTitle: insight.title,
                platform: 'extension',
                status: 'completed',
                timestamp: new Date().toISOString()
            });
            
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Insight not found' });
        }
    } catch (error) {
        console.error('Error acknowledging insight:', error);
        res.status(500).json({ error: 'Failed to acknowledge insight' });
    }
});

/**
 * POST /api/actions/slack
 * Post an insight to Slack
 */
app.post('/api/actions/slack', async (req, res) => {
    try {
        const { insightId, insight, dashboardName } = req.body;
        
        // Post to Slack using the Slack service
        const result = await slackService.postInsight(insight, dashboardName);
        
        // Record action
        const action = {
            id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'slack_post',
            insightId: insightId,
            insightTitle: insight.title,
            platform: 'slack',
            status: result.success ? 'completed' : 'failed',
            timestamp: new Date().toISOString(),
            details: result
        };
        
        storage.actions.push(action);
        
        // Keep only last 100 actions
        if (storage.actions.length > 100) {
            storage.actions = storage.actions.slice(-100);
        }
        
        res.json({ success: result.success, actionId: action.id });
        
    } catch (error) {
        console.error('Error posting to Slack:', error);
        res.status(500).json({ error: 'Failed to post to Slack' });
    }
});

/**
 * POST /api/actions/salesforce
 * Create a Salesforce task from an insight
 */
app.post('/api/actions/salesforce', async (req, res) => {
    try {
        const { insightId, insight, dashboardName } = req.body;
        
        // Create Salesforce task using the Salesforce service
        const result = await salesforceService.createTask(insight, dashboardName);
        
        // Record action
        const action = {
            id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'salesforce_task',
            insightId: insightId,
            insightTitle: insight.title,
            platform: 'salesforce',
            status: result.success ? 'completed' : 'failed',
            timestamp: new Date().toISOString(),
            details: result
        };
        
        storage.actions.push(action);
        
        // Keep only last 100 actions
        if (storage.actions.length > 100) {
            storage.actions = storage.actions.slice(-100);
        }
        
        res.json({ success: result.success, actionId: action.id });
        
    } catch (error) {
        console.error('Error creating Salesforce task:', error);
        res.status(500).json({ error: 'Failed to create Salesforce task' });
    }
});

/**
 * GET /api/actions
 * Retrieve recent actions
 */
app.get('/api/actions', (req, res) => {
    try {
        // Return actions from the last 7 days, sorted by most recent
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const recentActions = storage.actions
            .filter(action => new Date(action.timestamp).getTime() > sevenDaysAgo)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        res.json(recentActions);
    } catch (error) {
        console.error('Error retrieving actions:', error);
        res.status(500).json({ error: 'Failed to retrieve actions' });
    }
});

/**
 * Detect insights based on metric analysis
 * This implements the insight detection logic layer
 */
function detectInsights(metrics, dashboardName) {
    const insights = [];
    
    metrics.forEach(metric => {
        // Threshold breach detection
        if (metric.breached) {
            insights.push({
                id: `insight_${metric.id}_${Date.now()}`,
                metricId: metric.id,
                metricName: metric.name,
                severity: metric.breached === 'critical' ? 'high' : 'medium',
                title: `${metric.name} ${metric.breached === 'critical' ? 'Critical' : 'Warning'} Threshold Breached`,
                description: `${metric.name} has reached ${formatMetricValue(metric.value, metric.id)}, exceeding the ${metric.breached} threshold. Immediate attention recommended.`,
                timestamp: new Date().toISOString(),
                actions: metric.breached === 'critical' ? ['slack', 'salesforce'] : ['slack'],
                dashboardName: dashboardName,
                acknowledged: false
            });
        }
        
        // Trend change detection - significant changes even if not breached
        if (Math.abs(metric.change) > 0.05 && !metric.breached) {
            insights.push({
                id: `trend_${metric.id}_${Date.now()}`,
                metricId: metric.id,
                metricName: metric.name,
                severity: 'low',
                title: `${metric.name} Significant Trend Change`,
                description: `${metric.name} is ${metric.trend} by ${formatChange(metric.change, metric.id)}. This represents a notable shift that should be monitored.`,
                timestamp: new Date().toISOString(),
                actions: ['slack'],
                dashboardName: dashboardName,
                acknowledged: false
            });
        }
    });
    
    return insights;
}

/**
 * Format metric value for display
 */
function formatMetricValue(value, metricId) {
    if (metricId === 'customer_health') {
        return Math.round(value);
    }
    if (metricId.includes('risk') || metricId.includes('delay')) {
        return `${(value * 100).toFixed(1)}%`;
    }
    return value.toFixed(2);
}

/**
 * Format change value for display
 */
function formatChange(change, metricId) {
    const absChange = Math.abs(change);
    let formatted;
    
    if (metricId === 'customer_health') {
        formatted = Math.round(absChange);
    } else if (metricId.includes('risk') || metricId.includes('delay')) {
        formatted = `${(absChange * 100).toFixed(1)}%`;
    } else {
        formatted = absChange.toFixed(2);
    }
    
    return `${change > 0 ? '▲' : '▼'} ${formatted}`;
}

// Start server
app.listen(PORT, () => {
    console.log(`InsightFlow backend server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
