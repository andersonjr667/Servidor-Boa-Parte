const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const axios = require('axios');
const dotenv = require('dotenv');

// Configuração de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_URL = process.env.TARGET_URL || 'https://dddecd547f03.ngrok-free.app';

// Variável global para status do serviço
let isServiceAvailable = true;
let lastErrorTimestamp = 0;

// Middleware de segurança
app.use((req, res, next) => {
  // Headers para evitar problemas com ngrok
  res.header('ngrok-skip-browser-warning', 'true');
  res.header('X-Proxy-Server', 'Render-Proxy');
  
  // Política de segurança básica
  res.header('Content-Security-Policy', "default-src 'self'");
  res.header('X-Content-Type-Options', 'nosniff');
  
  next();
});

// Verificador de saúde do backend
async function checkBackendHealth() {
  try {
    const response = await axios.get(TARGET_URL, {
      timeout: 3000,
      headers: { 'ngrok-skip-browser-warning': 'true' }
    });
    
    return response.status >= 200 && response.status < 500;
  } catch (error) {
    console.error(`[Health Check] Falha: ${error.message}`);
    return false;
  }
}

// Atualizador periódico de status
async function updateServiceStatus() {
  try {
    const isHealthy = await checkBackendHealth();
    isServiceAvailable = isHealthy;
    
    if (!isHealthy) {
      lastErrorTimestamp = Date.now();
      console.error(`[Critical] Backend offline desde: ${new Date(lastErrorTimestamp).toISOString()}`);
    }
    
    console.log(`[Health Update] Status: ${isHealthy ? 'ONLINE' : 'OFFLINE'}`);
    return isHealthy;
  } catch (error) {
    console.error(`[Status Update Error] ${error.message}`);
    return false;
  }
}

// Configuração avançada do proxy
const proxyOptions = {
  target: TARGET_URL,
  changeOrigin: true,
  secure: false,
  timeout: 10000, // 10 segundos
  proxyTimeout: 10000,
  onProxyReq: (proxyReq) => {
    proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
    proxyReq.setHeader('X-Forwarded-For', proxyReq.socket.remoteAddress);
  },
  onError: (err, req, res) => {
    console.error(`[Proxy Error] ${err.message} - Path: ${req.path}`);
    
    // Tentativa de recuperação automática
    if (!isServiceAvailable) {
      return res.status(503).json({
        status: 'maintenance',
        message: 'Estamos realizando manutenções. Por favor, tente novamente em alguns minutos.'
      });
    }
    
    res.status(502).json({
      status: 'temporary_error',
      message: 'Estamos enfrentando problemas técnicos momentâneos. Tente recarregar a página.'
    });
  },
  onProxyRes: (proxyRes) => {
    // Sanitização de headers
    delete proxyRes.headers['x-powered-by'];
    delete proxyRes.headers['server'];
    
    // Segurança adicional
    proxyRes.headers['X-Proxy-Server'] = 'Render-Proxy';
  }
};

// Middleware principal
app.use(async (req, res, next) => {
  // Rotas especiais para monitoramento
  if (req.path === '/proxy-health') {
    const status = isServiceAvailable ? 'online' : 'offline';
    return res.json({
      status,
      last_error: lastErrorTimestamp,
      backend: TARGET_URL
    });
  }
  
  // Bloqueia requisições se o serviço estiver offline
  if (!isServiceAvailable) {
    return res.status(503).json({
      code: 'service_unavailable',
      message: 'Serviço temporariamente indisponível. Estamos trabalhando para resolver.'
    });
  }
  
  // Proxy para requisições normais
  createProxyMiddleware(proxyOptions)(req, res, next);
});

// Inicialização segura
async function startServer() {
  try {
    // Verificação inicial
    await updateServiceStatus();
    
    app.listen(PORT, () => {
      console.log(`🚀 Proxy ativo na porta ${PORT}`);
      console.log(`🔗 Encaminhando para: ${TARGET_URL}`);
      console.log(`✅ Status inicial: ${isServiceAvailable ? 'CONECTADO' : 'OFFLINE'}`);
      
      // Monitoramento contínuo
      setInterval(updateServiceStatus, 15000); // 15 segundos
    });
  } catch (startupError) {
    console.error(`[Fatal] Falha na inicialização: ${startupError.message}`);
    process.exit(1);
  }
}

// Inicia o servidor com tratamento de erros
startServer().catch(err => {
  console.error(`[Critical Startup Failure] ${err}`);
  process.exit(1);
});