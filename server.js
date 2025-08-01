const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const http = require('http');
const winston = require('winston');
const helmet = require('helmet');

const app = express();

// Configurações
const PORT = process.env.PORT || 3000;
const TARGET_URL = process.env.TARGET_URL || 'https://7802125d6073.ngrok-free.app';
const AUTO_PING_INTERVAL = process.env.AUTO_PING_INTERVAL || 300000; // 5 minutos em ms
const LOCAL_PING_URL = `http://localhost:${PORT}/health-check`;

// Configuração de logs
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'proxy.log' })
  ]
});

// Middlewares de segurança
app.use(helmet());
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
  logProvider: () => logger,
  onProxyReq: (proxyReq) => {
    proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
  },
  onError: (err, req, res) => {
    logger.error(`Erro no proxy: ${err.message}`);
    res.status(500).send('Erro no servidor de proxy');
  }
};

app.use('/', createProxyMiddleware(proxyOptions));

// Tratamento global de erros
app.use((err, req, res, next) => {
  logger.error(`Erro não tratado: ${err.stack}`);
  res.status(500).send('Ocorreu um erro interno');
});

// Inicia o servidor
const server = app.listen(PORT, () => {
  logger.info(`Proxy iniciado na porta ${PORT}`);
  logger.info(`Redirecionando para: ${TARGET_URL}`);
});

// Auto-ping para evitar hibernação
const pingInterval = setInterval(() => {
  http.get(LOCAL_PING_URL, (res) => {
    logger.info(`Auto-ping bem-sucedido. Status: ${res.statusCode}`);
  }).on('error', (err) => {
    logger.error(`Falha no auto-ping: ${err.message}`);
  });
}, AUTO_PING_INTERVAL);

// Gerenciamento de encerramento
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

function gracefulShutdown() {
  logger.info('Recebido sinal de desligamento');
  
  clearInterval(pingInterval);
  logger.info('Auto-ping interrompido');

  server.close(() => {
    logger.info('Servidor proxy encerrado');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Desligamento forçado devido ao tempo limite');
    process.exit(1);
  }, 5000);
}
