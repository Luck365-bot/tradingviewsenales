const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    message: '🚀 Luck365 Server funcionando!',
    endpoints: {
      check: 'GET /',
      postAlert: 'POST /alert',
      getAlerts: 'GET /alerts',
      health: 'GET /health'
    }
  });
});

// Array para almacenar alertas (máximo 44)
let alerts = [];

// Endpoint para recibir alertas del bot MT5
app.post('/alert', (req, res) => {
  try {
    const alert = req.body;
    alert.timestamp = new Date().toISOString();
    alert.id = Date.now();
    
    // Agregar al inicio
    alerts.unshift(alert);
    
    // Mantener solo las últimas 44 alertas
    if (alerts.length > 44) {
      alerts = alerts.slice(0, 44);
    }
    
    console.log('✅ Alerta recibida:', alert);
    res.json({ 
      status: 'success', 
      message: 'Alerta recibida', 
      alert: alert,
      totalAlerts: alerts.length 
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Endpoint para que Blogger obtenga alertas
app.get('/alerts', (req, res) => {
  res.json({
    status: 'success',
    count: alerts.length,
    alerts: alerts
  });
});

// Endpoint de verificación de servidor
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    alertCount: alerts.length 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`🚀 SERVVIDOR LUCK365 HTTP/REST INICIADO`);
  console.log(`=========================================`);
  console.log(`📊 Puerto: ${PORT}`);
  console.log(`🌐 URL: http://0.0.0.0:${PORT}`);
  console.log(`📡 Endpoints disponibles:`);
  console.log(`   • GET  /          → Verificar servidor`);
  console.log(`   • POST /alert     → Recibir alertas MT5`);
  console.log(`   • GET  /alerts    → Obtener alertas (Blogger)`);
  console.log(`   • GET  /health    → Estado del servidor`);
  console.log(`=========================================`);
});
