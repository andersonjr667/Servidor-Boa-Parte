const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_URL = 'https://b1dae2affde6.ngrok-free.app';

// Middleware para configurar cabeçalhos CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Configuração do proxy
const proxyOptions = {
  target: TARGET_URL,
  changeOrigin: true,
  pathRewrite: { '^/': '/' },
  onProxyReq: (proxyReq) => {
    // Adiciona cabeçalhos para compatibilidade com ngrok
    proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
  },
  secure: false // Desativa verificação SSL para ambientes de teste
};

// Redireciona todas as rotas
app.use('*', createProxyMiddleware(proxyOptions));

// Manipulador de erros
app.use((err, req, res, next) => {
  console.error('Proxy error:', err);
  res.status(500).send('Proxy error');
});

app.listen(PORT, () => {
  console.log(`Proxy reverso rodando na porta ${PORT}`);
  console.log(`Redirecionando para: ${TARGET_URL}`);
});
