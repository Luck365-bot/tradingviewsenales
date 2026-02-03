// Luck365 Server - HTTP only, NO WebSocket needed
const http = require('http');

console.log('========================================');
console.log('   LUCK365 TRADING BOT SERVER');
console.log('========================================');
console.log('Starting HTTP server...');

// Store alerts
let tradingAlerts = [];
let alertCounter = 0;

// Create HTTP server
const server = http.createServer((request, response) => {
    // Enable CORS for all origins
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle OPTIONS request for CORS
    if (request.method === 'OPTIONS') {
        response.writeHead(200);
        response.end();
        return;
    }
    
    const url = request.url;
    const method = request.method;
    
    console.log(`[${new Date().toLocaleTimeString()}] ${method} ${url}`);
    
    // ROUTES
    if (url === '/' && method === 'GET') {
        // Home page - server status
        response.writeHead(200, {'Content-Type': 'text/plain'});
        response.end(`LUCK365 TRADING SERVER\nStatus: ACTIVE\nAlerts in memory: ${tradingAlerts.length}\n`);
        
    } else if (url === '/alert' && method === 'POST') {
        // Receive trading alert from MT5 bot
        let alertData = '';
        
        request.on('data', chunk => {
            alertData += chunk.toString();
        });
        
        request.on('end', () => {
            alertData = alertData.trim();
            
            if (alertData) {
                alertCounter++;
                
                // Create alert object
                const newAlert = {
                    id: alertCounter,
                    message: alertData,
                    timestamp: new Date().toISOString(),
                    time: new Date().toLocaleTimeString(),
                    date: new Date().toLocaleDateString()
                };
                
                console.log(`[ALERT #${alertCounter}] ${alertData}`);
                
                // Add to beginning of array (newest first)
                tradingAlerts.unshift(newAlert);
                
                // Keep only last 100 alerts
                if (tradingAlerts.length > 100) {
                    tradingAlerts = tradingAlerts.slice(0, 100);
                }
                
                response.writeHead(200, {'Content-Type': 'application/json'});
                response.end(JSON.stringify({
                    status: 'success',
                    alertId: alertCounter,
                    message: 'Alert received',
                    alert: newAlert
                }));
            } else {
                response.writeHead(400, {'Content-Type': 'application/json'});
                response.end(JSON.stringify({
                    status: 'error',
                    message: 'Empty alert received'
                }));
            }
        });
        
    } else if (url === '/alerts' && method === 'GET') {
        // Get all alerts (for your HTML page)
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({
            status: 'success',
            count: tradingAlerts.length,
            alerts: tradingAlerts
        }));
        
    } else if (url === '/latest' && method === 'GET') {
        // Get latest alert only
        const latestAlert = tradingAlerts[0] || null;
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({
            status: 'success',
            alert: latestAlert
        }));
        
    } else if (url === '/clear' && method === 'GET') {
        // Clear all alerts (for testing)
        tradingAlerts = [];
        alertCounter = 0;
        response.writeHead(200, {'Content-Type': 'text/plain'});
        response.end('All alerts cleared\n');
        
    } else if (url === '/test' && method === 'GET') {
        // Send test alert
        const testAlert = 'ALZA, Nivel A0, Lot: 0.01, Pr: 1.23456, TP: 1.23556, SL: 1.23356';
        
        alertCounter++;
        tradingAlerts.unshift({
            id: alertCounter,
            message: testAlert,
            timestamp: new Date().toISOString()
        });
        
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({
            status: 'success',
            message: 'Test alert created',
            alertId: alertCounter
        }));
        
    } else {
        // 404 - Not Found
        response.writeHead(404, {'Content-Type': 'text/plain'});
        response.end('404 - Route not found\n');
    }
});

// Start the server
const PORT = 8080;
server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log('');
    console.log('📡 AVAILABLE ENDPOINTS:');
    console.log('  GET  /              → Server status');
    console.log('  POST /alert         → Receive trading alert from MT5');
    console.log('  GET  /alerts        → Get all alerts (for HTML page)');
    console.log('  GET  /latest        → Get latest alert only');
    console.log('  GET  /clear         → Clear all alerts (testing)');
    console.log('  GET  /test          → Create test alert');
    console.log('');
    console.log('🤖 FOR MT5 BOT:');
    console.log('  Send POST request to: http://localhost:8080/alert');
    console.log('  Content-Type: text/plain');
    console.log('  Body: "ALZA, Nivel A0, Lot: 0.01, Pr: 1.23456, TP: 1.23556, SL: 1.23356"');
    console.log('');
    console.log('💻 FOR YOUR HTML PAGE:');
    console.log('  Fetch alerts from: http://localhost:8080/alerts');
    console.log('');
    console.log('⚠️  To stop server: Press CTRL + C');
    console.log('========================================');
});

// Handle server shutdown
process.on('SIGINT', () => {
    console.log('\n🔌 Shutting down server...');
    server.close();
    console.log('✅ Server stopped');
    process.exit(0);
});