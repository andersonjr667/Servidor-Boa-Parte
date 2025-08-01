const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const http = require('http');

const app = express();

// Configurações
const PORT = process.env.PORT || 3000;
const TARGET_URL = process.env.TARGET_URL || 'https://7802125d6073.ngrok-free.app';
const AUTO_PING_INTERVAL = 5 * 60 * 1000; // 5 minutos
const LOCAL_PING_URL = `http://localhost:${PORT}/health-check`;

// Middleware de segurança básica
app.disable('x-powered-by');

// Rota de health check
app.get('/health-check', (req, res) => {
  res.status(200).send('Proxy operacional');
});

// Configuração do proxy
const proxyOptions = {
  target: TARGET_URL,
  changeOrigin: true,
  secure: false,
  onProxyReq: (proxyReq) => {
    proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
  },
  onError: (err, req, res) => {
    console.error(`[ERRO] Proxy: ${err.message}`);
    res.status(500).send('Erro no servidor de proxy');
  }
};

app.use('/', createProxyMiddleware(proxyOptions));

// Tratamento global de erros
app.use((err, req, res, next) => {
  console.error(`[ERRO] Não tratado: ${err.stack}`);
  res.status(500).send('Ocorreu um erro interno');
});

// Inicia o servidor
const server = app.listen(PORT, () => {
  console.log(`[INFO] Proxy iniciado na porta ${PORT}`);
  console.log(`[INFO] Redirecionando para: ${TARGET_URL}`);
});

// Auto-ping para evitar hibernação
const pingInterval = setInterval(() => {
  http.get(LOCAL_PING_URL, (res) => {
    console.log(`[INFO] Auto-ping bem-sucedido. Status: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error(`[ERRO] Falha no auto-ping: ${err.message}`);
  });
}, AUTO_PING_INTERVAL);

// Gerenciamento de encerramento
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

function gracefulShutdown() {
  console.log('[INFO] Recebido sinal de desligamento');
  
  clearInterval(pingInterval);
  console.log('[INFO] Auto-ping interrompido');

  server.close(() => {
    console.log('[INFO] Servidor proxy encerrado');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[ERRO] Desligamento forçado devido ao tempo limite');
    process.exit(1);
  }, 5000);
}
