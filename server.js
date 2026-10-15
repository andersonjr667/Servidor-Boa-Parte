
'use strict';

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

const PORT = Number(process.env.PORT) || 3000;

const TARGET = (
  process.env.PROXY_TARGET ||
  'https://strictly-predict-plug-associate.trycloudflare.com'
).replace(/\/+$/, '');

const proxy = createProxyMiddleware({
  target: TARGET,
  changeOrigin: true,
  secure: true,
  xfwd: true,
  proxyTimeout: 30000,
  timeout: 35000,

  on: {
    proxyReq(proxyReq) {
      // Cabeçalho usado por alguns destinos ngrok.
      // Não remove automaticamente avisos do Cloudflare.
      proxyReq.setHeader(
        'ngrok-skip-browser-warning',
        'true'
      );
    },

    proxyRes(proxyRes, req) {
      console.log(
        `[PROXY] ${req.method} ${req.originalUrl} -> ${proxyRes.statusCode}`
      );
    },

    error(err, req, res) {
      console.error(
        `[PROXY ERROR] ${req.method} ${req.originalUrl}: ${err.message}`
      );

      if (res.headersSent || res.destroyed) {
        return;
      }

      res.writeHead(502, {
        'Content-Type': 'application/json; charset=utf-8'
      });

      res.end(JSON.stringify({
        error: 'Bad Gateway',
        message: 'Não foi possível conectar ao servidor de destino.',
        timestamp: new Date().toISOString()
      }));
    }
  }
});

// Rota de saúde: não depende do túnel remoto.
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'reverse-proxy',
    timestamp: new Date().toISOString()
  });
});

// Encaminha as demais requisições ao destino.
app.use('/', proxy);

// Tratamento básico de erros do Express.
app.use((err, req, res, next) => {
  console.error('[EXPRESS ERROR]', err.message);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Ocorreu um erro interno no proxy.'
  });
});

// Inicializa o servidor.
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('================================');
  console.log('       PROXY REVERSO ONLINE');
  console.log('================================');
  console.log(`Porta: ${PORT}`);
  console.log(`Destino: ${TARGET}`);
  console.log(`Saúde: /health`);
});

// Encerramento organizado do processo.
function shutdown(signal) {
  console.log(`Recebido ${signal}. Encerrando servidor...`);

  server.close((err) => {
    if (err) {
      console.error('Erro ao encerrar:', err.message);
      process.exitCode = 1;
    }

    process.exit();
  });

  // Evita aguardar indefinidamente conexões abertas.
  setTimeout(() => {
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
