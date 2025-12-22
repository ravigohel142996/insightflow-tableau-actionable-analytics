/**
 * InsightFlow - Tableau Extension Main Script
 * 
 * This extension monitors Tableau dashboard metrics and generates actionable insights
 * that can be pushed to Slack and Salesforce for workflow automation.
 */

'use strict';

// Configuration
const BACKEND_URL = 'http://localhost:3000';
const REFRESH_INTERVAL = 30000; // 30 seconds

// State management
let dashboardState = {
    connected: false,
    dashboardName: null,
    worksheets: [],
    currentMetrics: {},
    insights: [],
    actions: []
};

// Initialize the extension when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    tableau.extensions.initializeAsync().then(
        initializeExtension,
        handleInitializationError
    );
});

/**
 * Initialize the extension after Tableau API is ready
 */
function initializeExtension() {
    const dashboard = tableau.extensions.dashboardContent.dashboard;
    
    dashboardState.connected = true;
    dashboardState.dashboardName = dashboard.name;
    dashboardState.worksheets = dashboard.worksheets;
    
    updateConnectionStatus();
    setupEventListeners();
    loadMetrics();
    loadInsights();
    loadActions();
    
    // Set up auto-refresh for insights
    setInterval(loadInsights, REFRESH_INTERVAL);
    
    console.log('InsightFlow extension initialized successfully');
}

/**
 * Handle initialization errors
 */
function handleInitializationError(error) {
    console.error('Error initializing extension:', error);
    updateConnectionStatus(false, error.message);
}

/**
 * Update connection status UI
 */
function updateConnectionStatus(connected = true, errorMessage = null) {
    const connectionMessage = document.getElementById('connection-message');
    const dashboardInfo = document.getElementById('dashboard-info');
    
    if (connected && dashboardState.connected) {
        connectionMessage.textContent = `Connected to: ${dashboardState.dashboardName}`;
        dashboardInfo.classList.add('status-connected');
        dashboardInfo.classList.remove('status-error');
    } else {
        connectionMessage.textContent = errorMessage || 'Connection failed';
        dashboardInfo.classList.add('status-error');
        dashboardInfo.classList.remove('status-connected');
    }
}

/**
 * Set up event listeners for user interactions
 */
function setupEventListeners() {
    // Refresh insights button
    document.getElementById('refresh-insights').addEventListener('click', function() {
        this.disabled = true;
        this.textContent = 'Refreshing...';
        loadInsights().finally(() => {
            this.disabled = false;
            this.textContent = 'Refresh Insights';
        });
    });
    
    // Listen to parameter changes in the dashboard
    tableau.extensions.dashboardContent.dashboard.getParametersAsync().then(parameters => {
        parameters.forEach(parameter => {
            parameter.addEventListener(tableau.TableauEventType.ParameterChanged, onParameterChange);
        });
    });
    
    // Listen to filter changes
    dashboardState.worksheets.forEach(worksheet => {
        worksheet.addEventListener(tableau.TableauEventType.FilterChanged, onFilterChange);
    });
}

/**
 * Handle parameter changes in the dashboard
 */
function onParameterChange(event) {
    console.log('Parameter changed:', event.getParameterAsync().then(p => p.name));
    // Reload metrics when parameters change as they might affect calculations
    loadMetrics();
    loadInsights();
}

/**
 * Handle filter changes in worksheets
 */
function onFilterChange(event) {
    console.log('Filter changed in worksheet:', event.worksheet.name);
    // Reload metrics when filters change
    loadMetrics();
    loadInsights();
}

/**
 * Load and display semantic metrics from the dashboard
 */
async function loadMetrics() {
    const metricsContainer = document.getElementById('metrics-list');
    
    try {
        // Get data from the first worksheet
        if (dashboardState.worksheets.length === 0) {
            metricsContainer.innerHTML = '<div class="empty-state"><p class="empty-state-text">No worksheets available</p></div>';
            return;
        }
        
        const worksheet = dashboardState.worksheets[0];
        const summaryData = await worksheet.getSummaryDataAsync();
        
        // Extract semantic metrics from the data
        const metrics = extractSemanticMetrics(summaryData);
        dashboardState.currentMetrics = metrics;
        
        // Render metrics
        renderMetrics(metrics);
        
        // Send metrics to backend for insight detection
        await sendMetricsToBackend(metrics);
        
    } catch (error) {
        console.error('Error loading metrics:', error);
        metricsContainer.innerHTML = '<div class="empty-state"><p class="empty-state-text">Error loading metrics</p></div>';
    }
}

/**
 * Extract semantic business metrics from raw Tableau data
 * This layer translates technical data into business-friendly metrics
 */
function extractSemanticMetrics(summaryData) {
    const metrics = [];
    
    // Define semantic metric calculations
    // These would typically come from a configuration file in production
    const metricDefinitions = [
        {
            id: 'revenue_risk',
            name: 'Revenue Risk Index',
            description: 'Measures revenue volatility and at-risk accounts',
            calculation: (data) => calculateRevenueRisk(data),
            threshold: { warning: 0.15, critical: 0.25 }
        },
        {
            id: 'delivery_delay',
            name: 'Delivery Delay Index',
            description: 'Tracks project delays and on-time delivery rate',
            calculation: (data) => calculateDeliveryDelay(data),
            threshold: { warning: 0.10, critical: 0.20 }
        },
        {
            id: 'customer_health',
            name: 'Customer Health Score',
            description: 'Composite score of customer satisfaction and engagement',
            calculation: (data) => calculateCustomerHealth(data),
            threshold: { warning: 70, critical: 60 }
        },
        {
            id: 'pipeline_velocity',
            name: 'Pipeline Velocity',
            description: 'Measures sales pipeline movement and conversion speed',
            calculation: (data) => calculatePipelineVelocity(data),
            threshold: { warning: 0.20, critical: 0.15 }
        }
    ];
    
    // Calculate each metric
    metricDefinitions.forEach(def => {
        try {
            const result = def.calculation(summaryData);
            metrics.push({
                id: def.id,
                name: def.name,
                description: def.description,
                value: result.value,
                change: result.change,
                trend: result.trend,
                threshold: def.threshold,
                breached: checkThresholdBreach(result.value, def.threshold)
            });
        } catch (error) {
            console.error(`Error calculating metric ${def.id}:`, error);
        }
    });
    
    return metrics;
}

/**
 * Calculate Revenue Risk Index
 * Simplified calculation for demonstration - would use actual data in production
 */
function calculateRevenueRisk(data) {
    // In production, this would analyze actual revenue data, churn indicators, etc.
    const baseRisk = 0.12;
    const variance = (Math.random() - 0.5) * 0.1;
    const currentValue = Math.max(0, Math.min(1, baseRisk + variance));
    
    return {
        value: currentValue,
        change: variance,
        trend: variance > 0 ? 'increasing' : 'decreasing'
    };
}

/**
 * Calculate Delivery Delay Index
 */
function calculateDeliveryDelay(data) {
    const baseDelay = 0.08;
    const variance = (Math.random() - 0.5) * 0.08;
    const currentValue = Math.max(0, Math.min(1, baseDelay + variance));
    
    return {
        value: currentValue,
        change: variance,
        trend: variance > 0 ? 'increasing' : 'decreasing'
    };
}

/**
 * Calculate Customer Health Score (0-100)
 */
function calculateCustomerHealth(data) {
    const baseScore = 75;
    const variance = (Math.random() - 0.5) * 10;
    const currentValue = Math.max(0, Math.min(100, baseScore + variance));
    
    return {
        value: currentValue,
        change: variance,
        trend: variance > 0 ? 'improving' : 'declining'
    };
}

/**
 * Calculate Pipeline Velocity
 */
function calculatePipelineVelocity(data) {
    const baseVelocity = 0.25;
    const variance = (Math.random() - 0.5) * 0.1;
    const currentValue = Math.max(0, baseVelocity + variance);
    
    return {
        value: currentValue,
        change: variance,
        trend: variance > 0 ? 'accelerating' : 'decelerating'
    };
}

/**
 * Check if a metric value breaches defined thresholds
 */
function checkThresholdBreach(value, threshold) {
    if (value >= threshold.critical) {
        return 'critical';
    } else if (value >= threshold.warning) {
        return 'warning';
    }
    return null;
}

/**
 * Render metrics in the UI
 */
function renderMetrics(metrics) {
    const container = document.getElementById('metrics-list');
    
    if (metrics.length === 0) {
        container.innerHTML = '<div class="empty-state"><p class="empty-state-text">No metrics available</p></div>';
        return;
    }
    
    container.innerHTML = metrics.map(metric => `
        <div class="metric-card">
            <div class="metric-name">${metric.name}</div>
            <div class="metric-value">${formatMetricValue(metric.value, metric.id)}</div>
            <div class="metric-change ${getChangeClass(metric.change)}">${formatChange(metric.change, metric.id)} ${metric.trend}</div>
        </div>
    `).join('');
}

/**
 * Format metric value based on metric type
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
 * Format change value
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

/**
 * Get CSS class for change indicator
 */
function getChangeClass(change) {
    if (Math.abs(change) < 0.01) return 'neutral';
    return change > 0 ? 'negative' : 'positive';
}

/**
 * Send metrics to backend for insight detection
 */
async function sendMetricsToBackend(metrics) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/metrics`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dashboardName: dashboardState.dashboardName,
                timestamp: new Date().toISOString(),
                metrics: metrics
            })
        });
        
        if (!response.ok) {
            console.warn('Failed to send metrics to backend:', response.status);
        }
    } catch (error) {
        console.warn('Backend not available:', error.message);
        // Continue operation even if backend is unavailable
    }
}

/**
 * Load insights from backend or generate locally
 */
async function loadInsights() {
    const insightsContainer = document.getElementById('insights-list');
    
    try {
        // Try to fetch insights from backend
        const response = await fetch(`${BACKEND_URL}/api/insights`);
        
        if (response.ok) {
            const insights = await response.json();
            dashboardState.insights = insights;
            renderInsights(insights);
        } else {
            // Generate insights locally if backend is unavailable
            const localInsights = generateLocalInsights();
            renderInsights(localInsights);
        }
    } catch (error) {
        console.warn('Using local insight generation:', error.message);
        // Generate insights locally if backend is unavailable
        const localInsights = generateLocalInsights();
        renderInsights(localInsights);
    }
}

/**
 * Generate insights locally based on current metrics
 */
function generateLocalInsights() {
    const insights = [];
    
    Object.values(dashboardState.currentMetrics).forEach(metric => {
        if (metric.breached) {
            insights.push({
                id: `insight_${metric.id}_${Date.now()}`,
                metricId: metric.id,
                metricName: metric.name,
                severity: metric.breached === 'critical' ? 'high' : 'medium',
                title: `${metric.name} ${metric.breached === 'critical' ? 'Critical' : 'Warning'} Threshold Breached`,
                description: `${metric.name} is currently at ${formatMetricValue(metric.value, metric.id)}, which exceeds the ${metric.breached} threshold. ${getInsightRecommendation(metric)}`,
                timestamp: new Date().toISOString(),
                actions: ['slack', 'salesforce']
            });
        }
    });
    
    // Add trend-based insights
    Object.values(dashboardState.currentMetrics).forEach(metric => {
        if (Math.abs(metric.change) > 0.05 && !metric.breached) {
            insights.push({
                id: `trend_${metric.id}_${Date.now()}`,
                metricId: metric.id,
                metricName: metric.name,
                severity: 'low',
                title: `${metric.name} Trend Change Detected`,
                description: `${metric.name} is ${metric.trend} by ${formatChange(metric.change, metric.id)}. Monitor this metric for continued movement.`,
                timestamp: new Date().toISOString(),
                actions: ['slack']
            });
        }
    });
    
    return insights;
}

/**
 * Get contextual recommendation for an insight
 */
function getInsightRecommendation(metric) {
    const recommendations = {
        revenue_risk: 'Review at-risk accounts and engage with account managers to develop retention strategies.',
        delivery_delay: 'Assess project timelines and resource allocation. Consider escalating delayed deliveries.',
        customer_health: 'Reach out to customers with declining health scores. Schedule check-in calls or success reviews.',
        pipeline_velocity: 'Review pipeline stages for bottlenecks. Consider additional lead nurturing activities.'
    };
    
    return recommendations[metric.id] || 'Review this metric and take appropriate action.';
}

/**
 * Render insights in the UI
 */
function renderInsights(insights) {
    const container = document.getElementById('insights-list');
    
    if (insights.length === 0) {
        container.innerHTML = '<div class="empty-state"><p class="empty-state-text">No active insights. All metrics are within normal ranges.</p></div>';
        return;
    }
    
    container.innerHTML = insights.map(insight => `
        <div class="insight-item severity-${insight.severity}">
            <div class="insight-header">
                <span class="insight-title">${insight.title}</span>
                <span class="insight-timestamp">${formatTimestamp(insight.timestamp)}</span>
            </div>
            <div class="insight-description">${insight.description}</div>
            <div class="insight-actions">
                ${insight.actions.includes('slack') ? `<button class="btn btn-secondary btn-small" onclick="postToSlack('${insight.id}')">Post to Slack</button>` : ''}
                ${insight.actions.includes('salesforce') ? `<button class="btn btn-secondary btn-small" onclick="createSalesforceTask('${insight.id}')">Create Task</button>` : ''}
                <button class="btn btn-secondary btn-small" onclick="acknowledgeInsight('${insight.id}')">Acknowledge</button>
            </div>
        </div>
    `).join('');
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
}

/**
 * Post insight to Slack
 */
async function postToSlack(insightId) {
    const insight = dashboardState.insights.find(i => i.id === insightId);
    if (!insight) return;
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/actions/slack`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                insightId: insightId,
                insight: insight,
                dashboardName: dashboardState.dashboardName
            })
        });
        
        if (response.ok) {
            alert('Insight posted to Slack successfully');
            loadActions();
        } else {
            alert('Failed to post to Slack. Check backend connection.');
        }
    } catch (error) {
        alert('Backend service unavailable. Please check configuration.');
        console.error('Slack integration error:', error);
    }
}

/**
 * Create Salesforce task from insight
 */
async function createSalesforceTask(insightId) {
    const insight = dashboardState.insights.find(i => i.id === insightId);
    if (!insight) return;
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/actions/salesforce`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                insightId: insightId,
                insight: insight,
                dashboardName: dashboardState.dashboardName
            })
        });
        
        if (response.ok) {
            alert('Salesforce task created successfully');
            loadActions();
        } else {
            alert('Failed to create Salesforce task. Check backend connection.');
        }
    } catch (error) {
        alert('Backend service unavailable. Please check configuration.');
        console.error('Salesforce integration error:', error);
    }
}

/**
 * Acknowledge an insight
 */
async function acknowledgeInsight(insightId) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/insights/${insightId}/acknowledge`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok || true) { // Allow local acknowledgment even if backend is down
            // Remove acknowledged insight from display
            dashboardState.insights = dashboardState.insights.filter(i => i.id !== insightId);
            renderInsights(dashboardState.insights);
            loadActions();
        }
    } catch (error) {
        // Still acknowledge locally
        dashboardState.insights = dashboardState.insights.filter(i => i.id !== insightId);
        renderInsights(dashboardState.insights);
        console.warn('Backend unavailable, acknowledged locally');
    }
}

/**
 * Load recent actions
 */
async function loadActions() {
    const actionsContainer = document.getElementById('actions-list');
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/actions`);
        
        if (response.ok) {
            const actions = await response.json();
            dashboardState.actions = actions;
            renderActions(actions);
        } else {
            renderActions([]);
        }
    } catch (error) {
        console.warn('Actions unavailable:', error.message);
        renderActions([]);
    }
}

/**
 * Render actions in the UI
 */
function renderActions(actions) {
    const container = document.getElementById('actions-list');
    
    if (actions.length === 0) {
        container.innerHTML = '<div class="empty-state"><p class="empty-state-text">No recent actions</p></div>';
        return;
    }
    
    container.innerHTML = actions.slice(0, 10).map(action => `
        <div class="action-item">
            <div class="action-info">
                <div class="action-title">${action.type}: ${action.insightTitle}</div>
                <div class="action-meta">${formatTimestamp(action.timestamp)} • ${action.platform}</div>
            </div>
            <div class="action-status status-${action.status}">${action.status}</div>
        </div>
    `).join('');
}
