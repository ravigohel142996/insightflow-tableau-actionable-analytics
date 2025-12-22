/**
 * Slack Integration Service
 * 
 * Handles posting insights to Slack channels with action buttons
 * Uses Slack Web API and Block Kit for rich messaging
 */

const https = require('https');

/**
 * Post an insight to Slack channel
 * @param {Object} insight - The insight object to post
 * @param {string} dashboardName - Name of the dashboard
 * @returns {Object} Result object with success status
 */
async function postInsight(insight, dashboardName) {
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    const slackToken = process.env.SLACK_BOT_TOKEN;
    const slackChannel = process.env.SLACK_CHANNEL || '#analytics-insights';
    
    // Check if Slack is configured
    if (!slackWebhookUrl && !slackToken) {
        console.warn('Slack integration not configured. Set SLACK_WEBHOOK_URL or SLACK_BOT_TOKEN in .env');
        return { 
            success: false, 
            error: 'Slack not configured',
            message: 'Would have posted to Slack if configured'
        };
    }
    
    // Build Slack message using Block Kit
    const message = buildSlackMessage(insight, dashboardName);
    
    try {
        if (slackWebhookUrl) {
            // Use webhook URL (simpler method)
            await postViaWebhook(slackWebhookUrl, message);
        } else {
            // Use Bot Token with chat.postMessage API
            await postViaAPI(slackToken, slackChannel, message);
        }
        
        console.log(`Posted insight to Slack: ${insight.title}`);
        return { 
            success: true, 
            message: 'Posted to Slack successfully',
            channel: slackChannel
        };
        
    } catch (error) {
        console.error('Error posting to Slack:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

/**
 * Build Slack message with Block Kit formatting
 * @param {Object} insight - The insight to format
 * @param {string} dashboardName - Dashboard name for context
 * @returns {Object} Slack message payload
 */
function buildSlackMessage(insight, dashboardName) {
    // Color coding based on severity
    const colors = {
        high: '#EA4335',
        medium: '#FBBC04',
        low: '#1A73E8'
    };
    
    // Emoji indicators
    const emojis = {
        high: '🚨',
        medium: '⚠️',
        low: 'ℹ️'
    };
    
    const color = colors[insight.severity] || colors.low;
    const emoji = emojis[insight.severity] || emojis.low;
    
    // Build message blocks for rich formatting
    const blocks = [
        {
            type: 'header',
            text: {
                type: 'plain_text',
                text: `${emoji} ${insight.title}`,
                emoji: true
            }
        },
        {
            type: 'section',
            fields: [
                {
                    type: 'mrkdwn',
                    text: `*Dashboard:*\n${dashboardName}`
                },
                {
                    type: 'mrkdwn',
                    text: `*Severity:*\n${insight.severity.toUpperCase()}`
                },
                {
                    type: 'mrkdwn',
                    text: `*Metric:*\n${insight.metricName}`
                },
                {
                    type: 'mrkdwn',
                    text: `*Detected:*\n${formatTimestamp(insight.timestamp)}`
                }
            ]
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*Details:*\n${insight.description}`
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'actions',
            elements: [
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: '✓ Acknowledge',
                        emoji: true
                    },
                    style: 'primary',
                    value: `acknowledge_${insight.id}`,
                    action_id: 'acknowledge_insight'
                },
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: '👤 Assign',
                        emoji: true
                    },
                    value: `assign_${insight.id}`,
                    action_id: 'assign_insight'
                },
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: '📊 View Dashboard',
                        emoji: true
                    },
                    url: process.env.TABLEAU_DASHBOARD_URL || 'https://tableau.com',
                    value: `view_${insight.id}`,
                    action_id: 'view_dashboard'
                }
            ]
        }
    ];
    
    return {
        text: `${emoji} ${insight.title}`, // Fallback text for notifications
        attachments: [
            {
                color: color,
                blocks: blocks
            }
        ]
    };
}

/**
 * Post message via Slack Webhook URL
 * @param {string} webhookUrl - Slack webhook URL
 * @param {Object} message - Message payload
 */
function postViaWebhook(webhookUrl, message) {
    return new Promise((resolve, reject) => {
        const url = new URL(webhookUrl);
        const data = JSON.stringify(message);
        
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };
        
        const req = https.request(options, (res) => {
            let body = '';
            
            res.on('data', (chunk) => {
                body += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve({ success: true });
                } else {
                    reject(new Error(`Slack API returned status ${res.statusCode}: ${body}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.write(data);
        req.end();
    });
}

/**
 * Post message via Slack API with bot token
 * @param {string} token - Slack bot token
 * @param {string} channel - Channel to post to
 * @param {Object} message - Message payload
 */
function postViaAPI(token, channel, message) {
    return new Promise((resolve, reject) => {
        const payload = {
            channel: channel,
            ...message
        };
        
        const data = JSON.stringify(payload);
        
        const options = {
            hostname: 'slack.com',
            port: 443,
            path: '/api/chat.postMessage',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Content-Length': data.length
            }
        };
        
        const req = https.request(options, (res) => {
            let body = '';
            
            res.on('data', (chunk) => {
                body += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    if (response.ok) {
                        resolve({ success: true, ts: response.ts });
                    } else {
                        reject(new Error(`Slack API error: ${response.error}`));
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse Slack response: ${body}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.write(data);
        req.end();
    });
}

/**
 * Format timestamp for Slack display
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Handle Slack interactive actions (button clicks)
 * This would be called from a webhook endpoint in production
 * @param {Object} payload - Slack interaction payload
 * @returns {Object} Response
 */
async function handleInteraction(payload) {
    const action = payload.actions[0];
    const actionId = action.action_id;
    const value = action.value;
    
    console.log(`Slack interaction: ${actionId} with value ${value}`);
    
    // Parse the insight ID from the value
    const insightId = value.split('_')[1];
    
    // Handle different actions
    switch (actionId) {
        case 'acknowledge_insight':
            // Mark insight as acknowledged
            // This would update the database in production
            return { 
                success: true, 
                message: 'Insight acknowledged',
                insightId: insightId
            };
            
        case 'assign_insight':
            // Open dialog to assign insight to team member
            // This would trigger a Slack modal in production
            return { 
                success: true, 
                message: 'Assignment dialog opened',
                insightId: insightId
            };
            
        default:
            return { 
                success: false, 
                message: 'Unknown action' 
            };
    }
}

module.exports = {
    postInsight,
    handleInteraction
};
