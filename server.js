const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const http = require('http');

const app = express();

const PORT = process.env.PORT || 3000;

// Middleware do proxy
app.use('/', createProxyMiddleware({
  target: 'https://adc5-2804-1b3-6147-29cd-6036-d2ee-793b-f28b.ngrok-free.app', // seu link do ngrok aqui
  changeOrigin: true,
  secure: false,
}));

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Proxy online na porta ${PORT}`);
});

// Auto-ping a cada 5 minutos para evitar hibernação no Render
setInterval(() => {
  http.get(`http://localhost:${PORT}`, (res) => {
    console.log(`Auto-ping executado. Status: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error('Erro no auto-ping:', err.message);
  });
}, 5 * 60 * 1000); // 5 minutos












