/**
 * Salesforce Integration Service
 * 
 * Handles creating tasks and cases in Salesforce based on insights
 * Uses Salesforce REST API with OAuth authentication
 */

const https = require('https');

// Cache for Salesforce access token
let accessToken = null;
let tokenExpiry = null;

/**
 * Create a Salesforce task from an insight
 * @param {Object} insight - The insight object
 * @param {string} dashboardName - Name of the dashboard
 * @returns {Object} Result object with success status
 */
async function createTask(insight, dashboardName) {
    const salesforceUrl = process.env.SALESFORCE_INSTANCE_URL;
    const clientId = process.env.SALESFORCE_CLIENT_ID;
    const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
    const username = process.env.SALESFORCE_USERNAME;
    const password = process.env.SALESFORCE_PASSWORD;
    
    // Check if Salesforce is configured
    if (!salesforceUrl || !clientId || !clientSecret) {
        console.warn('Salesforce integration not configured. Set SALESFORCE_* variables in .env');
        return { 
            success: false, 
            error: 'Salesforce not configured',
            message: 'Would have created Salesforce task if configured'
        };
    }
    
    try {
        // Get access token (authenticate)
        const token = await getAccessToken();
        
        // Build task object
        const task = buildSalesforceTask(insight, dashboardName);
        
        // Create task via Salesforce API
        const result = await createSalesforceObject('Task', task, token);
        
        console.log(`Created Salesforce task: ${result.id}`);
        return { 
            success: true, 
            taskId: result.id,
            message: 'Salesforce task created successfully'
        };
        
    } catch (error) {
        console.error('Error creating Salesforce task:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

/**
 * Create a Salesforce case from an insight (for high severity issues)
 * @param {Object} insight - The insight object
 * @param {string} dashboardName - Name of the dashboard
 * @returns {Object} Result object with success status
 */
async function createCase(insight, dashboardName) {
    const salesforceUrl = process.env.SALESFORCE_INSTANCE_URL;
    
    if (!salesforceUrl) {
        console.warn('Salesforce integration not configured');
        return { 
            success: false, 
            error: 'Salesforce not configured' 
        };
    }
    
    try {
        // Get access token
        const token = await getAccessToken();
        
        // Build case object
        const caseObj = buildSalesforceCase(insight, dashboardName);
        
        // Create case via Salesforce API
        const result = await createSalesforceObject('Case', caseObj, token);
        
        console.log(`Created Salesforce case: ${result.id}`);
        return { 
            success: true, 
            caseId: result.id,
            message: 'Salesforce case created successfully'
        };
        
    } catch (error) {
        console.error('Error creating Salesforce case:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

/**
 * Get Salesforce access token via OAuth 2.0 password flow
 * @returns {string} Access token
 */
async function getAccessToken() {
    // Return cached token if still valid
    if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
        return accessToken;
    }
    
    const clientId = process.env.SALESFORCE_CLIENT_ID;
    const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
    const username = process.env.SALESFORCE_USERNAME;
    const password = process.env.SALESFORCE_PASSWORD;
    const securityToken = process.env.SALESFORCE_SECURITY_TOKEN || '';
    
    return new Promise((resolve, reject) => {
        const data = new URLSearchParams({
            grant_type: 'password',
            client_id: clientId,
            client_secret: clientSecret,
            username: username,
            password: password + securityToken
        }).toString();
        
        const options = {
            hostname: 'login.salesforce.com',
            port: 443,
            path: '/services/oauth2/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
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
                    
                    if (response.access_token) {
                        accessToken = response.access_token;
                        // Cache token for 1 hour
                        tokenExpiry = Date.now() + (60 * 60 * 1000);
                        resolve(accessToken);
                    } else {
                        reject(new Error(`Salesforce authentication failed: ${body}`));
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse Salesforce response: ${body}`));
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
 * Build Salesforce task object from insight
 * @param {Object} insight - Insight data
 * @param {string} dashboardName - Dashboard name
 * @returns {Object} Salesforce task object
 */
function buildSalesforceTask(insight, dashboardName) {
    // Map severity to priority
    const priorityMap = {
        high: 'High',
        medium: 'Normal',
        low: 'Low'
    };
    
    const priority = priorityMap[insight.severity] || 'Normal';
    
    // Build description with context
    const description = `
Insight from Tableau Dashboard: ${dashboardName}

Metric: ${insight.metricName}
Severity: ${insight.severity.toUpperCase()}
Detected: ${formatTimestamp(insight.timestamp)}

${insight.description}

This task was automatically created by InsightFlow based on analytics insights.
Please review the dashboard and take appropriate action.

Dashboard Link: ${process.env.TABLEAU_DASHBOARD_URL || 'Not configured'}
    `.trim();
    
    return {
        Subject: `[InsightFlow] ${insight.title}`,
        Description: description,
        Priority: priority,
        Status: 'Not Started',
        ActivityDate: new Date().toISOString().split('T')[0], // Today's date
        // OwnerId would be set based on assignment logic
        // WhatId could link to relevant Salesforce records
    };
}

/**
 * Build Salesforce case object from insight
 * @param {Object} insight - Insight data
 * @param {string} dashboardName - Dashboard name
 * @returns {Object} Salesforce case object
 */
function buildSalesforceCase(insight, dashboardName) {
    // Map severity to priority
    const priorityMap = {
        high: 'High',
        medium: 'Medium',
        low: 'Low'
    };
    
    const priority = priorityMap[insight.severity] || 'Medium';
    
    const description = `
Insight from Tableau Dashboard: ${dashboardName}

Metric: ${insight.metricName}
Severity: ${insight.severity.toUpperCase()}
Detected: ${formatTimestamp(insight.timestamp)}

${insight.description}

This case was automatically created by InsightFlow based on critical analytics insights.

Dashboard Link: ${process.env.TABLEAU_DASHBOARD_URL || 'Not configured'}
    `.trim();
    
    return {
        Subject: `[InsightFlow Alert] ${insight.title}`,
        Description: description,
        Priority: priority,
        Status: 'New',
        Origin: 'Web',
        Type: 'Problem'
    };
}

/**
 * Create a Salesforce object via REST API
 * @param {string} objectType - Type of object (Task, Case, etc.)
 * @param {Object} objectData - Object data
 * @param {string} token - Access token
 * @returns {Object} Created object with ID
 */
function createSalesforceObject(objectType, objectData, token) {
    return new Promise((resolve, reject) => {
        const instanceUrl = new URL(process.env.SALESFORCE_INSTANCE_URL);
        const data = JSON.stringify(objectData);
        
        const options = {
            hostname: instanceUrl.hostname,
            port: 443,
            path: `/services/data/v57.0/sobjects/${objectType}`,
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
                    
                    if (response.success !== false && response.id) {
                        resolve(response);
                    } else {
                        reject(new Error(`Salesforce API error: ${JSON.stringify(response)}`));
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse Salesforce response: ${body}`));
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
 * Format timestamp for Salesforce
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
 * Query Salesforce to get task/case status
 * @param {string} objectType - Object type (Task or Case)
 * @param {string} objectId - Object ID
 * @returns {Object} Object data
 */
async function getObjectStatus(objectType, objectId) {
    try {
        const token = await getAccessToken();
        const instanceUrl = new URL(process.env.SALESFORCE_INSTANCE_URL);
        
        return new Promise((resolve, reject) => {
            const options = {
                hostname: instanceUrl.hostname,
                port: 443,
                path: `/services/data/v57.0/sobjects/${objectType}/${objectId}`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
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
                        resolve(response);
                    } catch (error) {
                        reject(error);
                    }
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.end();
        });
    } catch (error) {
        console.error('Error getting Salesforce object status:', error);
        throw error;
    }
}

module.exports = {
    createTask,
    createCase,
    getObjectStatus
};
