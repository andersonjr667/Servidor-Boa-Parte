// proxy-server.js
const express = require('express');
const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');
const axios = require('axios');

const app = express();

// URL do destino
const TARGET_URL = 'https://5c4f1af60b08.ngrok-free.app';

// Configurações de retry e cache
const RETRY_INTERVAL = 5000; // 5 segundos entre tentativas
const MAX_RETRIES = 5;
let isTargetOnline = false;
let lastValidResponse = null; // Armazena a última resposta válida (HTML)

// Função para testar se o destino está no ar
async function checkTarget() {
  try {
    await axios.get(TARGET_URL, { timeout: 3000 });
    if (!isTargetOnline) {
      console.log(`[Proxy] Destino voltou online: ${TARGET_URL}`);
    }
    isTargetOnline = true;
  } catch (err) {
    if (isTargetOnline) {
      console.error(`[Proxy] Destino caiu: ${err.message}`);
    }
    isTargetOnline = false;
  }
}
setInterval(checkTarget, RETRY_INTERVAL);
checkTarget();

// Middleware para headers padrão
app.use((req, res, next) => {
  res.setHeader('X-Proxy-Server', 'Render-Proxy');
  next();
});

// Proxy reverso com cache
app.use('/', createProxyMiddleware({
  target: TARGET_URL,
  changeOrigin: true,
  selfHandleResponse: true, // Necessário para interceptar e salvar cache
  onProxyReq: (proxyReq, req) => {
    console.log(`[Proxy] ${req.method} ${req.originalUrl}`);
  },
  onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
    try {
      const contentType = proxyRes.headers['content-type'] || '';
      const body = responseBuffer.toString('utf8');

      // Só guarda no cache se for HTML/texto
      if (contentType.includes('text/html') || contentType.includes('application/json')) {
        lastValidResponse = { body, contentType };
      }

      return body;
    } catch (err) {
      console.error('[Cache Error]', err.message);
      return responseBuffer;
    }
  }),
  onError: async (err, req, res) => {
    console.error('[Proxy Error]', err.message);

    // Retry automático
    let attempts = 0;
    const tryReconnect = setInterval(async () => {
      attempts++;
      await checkTarget();
      if (isTargetOnline || attempts >= MAX_RETRIES) {
        clearInterval(tryReconnect);
      }
    }, RETRY_INTERVAL);

    // Se houver cache, serve o último conteúdo válido
    if (lastValidResponse) {
      console.warn('[Proxy] Servindo conteúdo do cache...');
      res.setHeader('Content-Type', lastValidResponse.contentType);
      return res.status(200).send(lastValidResponse.body);
    }

    // Se não tiver cache, mostra fallback
    res.status(200).send(`
      <html>
        <head><title>Serviço temporariamente indisponível</title></head>
        <body style="font-family:sans-serif;text-align:center;margin-top:50px;">
          <h1>⚠ Serviço temporariamente indisponível</h1>
          <p>Tentando reconexão... (${attempts}/${MAX_RETRIES})</p>
          <p>Por favor, tente novamente em alguns instantes.</p>
        </body>
      </html>
    `);
  },
  proxyTimeout: 10000,
  timeout: 12000,
}));

// Tratamento global de erros
app.use((err, req, res, next) => {
  console.error('[App Error]', err.message);
  if (lastValidResponse) {
    console.warn('[App] Servindo cache por falha global...');
    res.setHeader('Content-Type', lastValidResponse.contentType);
    return res.status(200).send(lastValidResponse.body);
  }
  res.status(200).send('Ocorreu um problema temporário. Tente novamente mais tarde.');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Proxy com retry + cache ativo na porta ${port} → ${TARGET_URL}`);
});
