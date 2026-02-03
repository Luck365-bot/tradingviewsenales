// server.js - Servidor WebSocket para Luck365 Trading Bot
const WebSocket = require('ws');
const http = require('http');

// Configuración
const PORT = 8080;
const BOT_PORT = 8081; // Puerto para recibir alertas del bot MT5

// Servidor WebSocket principal (para navegadores)
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Servidor WebSocket para el bot MT5
const botServer = http.createServer();
const botWss = new WebSocket.Server({ server: botServer });

// Clientes conectados
const clients = new Set();
let botConnection = null;

// ==============================================
// SERVIDOR PARA NAVEGADORES (CLIENTES WEB)
// ==============================================

wss.on('connection', (ws) => {
    console.log('✅ Nuevo cliente web conectado');
    clients.add(ws);
    
    ws.on('message', (message) => {
        console.log('📨 Mensaje de cliente:', message.toString());
    });
    
    ws.on('close', () => {
        console.log('❌ Cliente web desconectado');
        clients.delete(ws);
    });
    
    // Enviar estado actual
    ws.send(JSON.stringify({
        type: 'status',
        message: 'Conectado al servidor Luck365',
        botConnected: botConnection !== null,
        timestamp: new Date().toISOString()
    }));
});

// ==============================================
// SERVIDOR PARA EL BOT MT5
// ==============================================

botWss.on('connection', (ws) => {
    console.log('🤖 Bot MT5 conectado');
    botConnection = ws;
    
    // Notificar a todos los clientes
    broadcastToClients({
        type: 'bot_status',
        status: 'connected',
        message: 'Bot MT5 conectado',
        timestamp: new Date().toISOString()
    });
    
    ws.on('message', (message) => {
        const rawMessage = message.toString();
        console.log('📨 Alerta del bot MT5:', rawMessage);
        
        // Procesar la alerta del bot
        const processedAlert = processBotAlert(rawMessage);
        
        // Enviar a todos los clientes web
        broadcastToClients(processedAlert);
        
        // Confirmación al bot
        if (botConnection) {
            botConnection.send(JSON.stringify({
                type: 'ack',
                message: 'Alerta recibida',
                timestamp: new Date().toISOString(),
                alertId: processedAlert.id
            }));
        }
    });
    
    ws.on('close', () => {
        console.log('🤖 Bot MT5 desconectado');
        botConnection = null;
        
        // Notificar a todos los clientes
        broadcastToClients({
            type: 'bot_status',
            status: 'disconnected',
            message: 'Bot MT5 desconectado',
            timestamp: new Date().toISOString()
        });
    });
    
    ws.on('error', (error) => {
        console.error('❌ Error en conexión del bot:', error);
    });
});

// ==============================================
// FUNCIÓN PARA PROCESAR ALERTAS DEL BOT MT5
// ==============================================

function processBotAlert(rawAlert) {
    console.log('🔧 Procesando alerta del bot:', rawAlert);
    
    const timestamp = new Date().toISOString();
    const alertId = Date.now();
    
    // Detectar tipo de alerta
    if (rawAlert.startsWith('CIERRE,')) {
        return processCierreAlert(rawAlert, alertId, timestamp);
    } else if (rawAlert.includes('Lot:') || rawAlert.includes('Lote:')) {
        return processAperturaAlert(rawAlert, alertId, timestamp);
    } else {
        // Formato desconocido, enviar tal cual
        return {
            type: 'raw_alert',
            id: alertId,
            raw: rawAlert,
            timestamp: timestamp,
            processed: false
        };
    }
}

function processAperturaAlert(rawAlert, alertId, timestamp) {
    // Formato: ALZA, Nivel A0, Lot: 0.01, Pr: 1.23456, TP: 1.23556, SL: 1.23356
    // O: BOLLINGER_ALZA, Nivel C2, Lot: 0.10, Pr: 1.23456, TP: 0.00000, SL: 1.23556
    
    const parts = rawAlert.split(',').map(p => p.trim());
    
    let tipo = 'apertura';
    let direction = 'ALZA';
    let esBollinger = false;
    
    if (parts[0].includes('ALZA')) {
        direction = 'ALZA';
        esBollinger = parts[0].includes('BOLLINGER');
    } else if (parts[0].includes('BAJA')) {
        direction = 'BAJA';
        esBollinger = parts[0].includes('BOLLINGER');
    }
    
    // Extraer datos
    const nivel = parts[1] || '';
    const lotStr = parts[2] ? parts[2].replace('Lot:', '').trim() : '0.01';
    const precioStr = parts[3] ? parts[3].replace('Pr:', '').trim() : '0.0';
    const tpStr = parts[4] ? parts[4].replace('TP:', '').trim() : '0.0';
    const slStr = parts[5] ? parts[5].replace('SL:', '').trim() : '0.0';
    
    // Extraer slot del nivel
    const slot = nivel.replace('Nivel ', '').charAt(0) || 'A';
    
    return {
        type: 'alert',
        id: alertId,
        alertType: 'apertura',
        symbol: 'EURUSD', // Se puede mejorar para detectar símbolo
        direction: direction,
        price: parseFloat(precioStr) || 0,
        lotaje: parseFloat(lotStr) || 0.01,
        codigo: slot + '1',
        temporalidad: "5 Min.",
        timestamp: timestamp,
        nivel: nivel,
        esBollinger: esBollinger,
        tp: parseFloat(tpStr) || 0,
        sl: parseFloat(slStr) || 0,
        raw: rawAlert
    };
}

function processCierreAlert(rawAlert, alertId, timestamp) {
    // Formato: CIERRE, Ganancia, $15.25, ALZA, Nivel A0, Lote: 0.01, Razón: texto, Trade #123456
    const parts = rawAlert.split(',').map(p => p.trim());
    
    const resultado = parts[1] || '';
    const montoStr = parts[2] ? parts[2].replace('$', '').trim() : '0';
    const direccion = parts[3] || '';
    const nivel = parts[4] || '';
    const lotStr = parts[5] ? parts[5].replace('Lote:', '').trim() : '0.01';
    const razon = parts[6] ? parts[6].replace('Razón:', '').trim() : '';
    const ticketStr = parts[7] ? parts[7].replace('Trade #', '').trim() : '0';
    
    // Extraer slot
    const slot = nivel.replace('Nivel ', '').charAt(0) || 'A';
    
    return {
        type: 'alert',
        id: alertId,
        alertType: 'cierre',
        symbol: 'EURUSD',
        resultado: resultado,
        ganancia: parseFloat(montoStr) || 0,
        direccion: direccion,
        nivel: nivel,
        lotaje: parseFloat(lotStr) || 0.01,
        razon: razon,
        ticket: parseInt(ticketStr) || 0,
        codigo: slot + '1',
        temporalidad: "5 Min.",
        timestamp: timestamp,
        raw: rawAlert
    };
}

// ==============================================
// FUNCIÓN PARA ENVIAR A TODOS LOS CLIENTES
// ==============================================

function broadcastToClients(message) {
    const messageStr = JSON.stringify(message);
    
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
        }
    });
}

// ==============================================
// INICIAR SERVIDORES
// ==============================================

server.listen(PORT, () => {
    console.log(`🚀 Servidor WebSocket principal en puerto ${PORT}`);
    console.log(`📡 Los navegadores se conectan a: ws://localhost:${PORT}`);
});

botServer.listen(BOT_PORT, () => {
    console.log(`🤖 Servidor para bot MT5 en puerto ${BOT_PORT}`);
    console.log(`📨 El bot MT5 debe conectarse a: ws://localhost:${BOT_PORT}`);
});

console.log('=========================================');
console.log('SERVIDOR LUCK365 TRADING INICIADO');
console.log('=========================================');
console.log('📊 Para instalar dependencias:');
console.log('   npm install ws');
console.log('📊 Para ejecutar:');
console.log('   node server.js');
console.log('=========================================');