const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Substitua abaixo pelo link correto do ngrok ativo
const NGROK_URL = 'https://adc5-2804-1b3-6147-29cd-6036-d2ee-793b-f28b.ngrok-free.app';

// Proxy reverso
app.use('/', createProxyMiddleware({
  target: NGROK_URL,
  changeOrigin: true,
  secure: false,
  ws: true, // suporte para WebSocket, se necessário
  onError(err, req, res) {
    console.error('Erro no proxy:', err.message);
    res.status(502).send('Bad Gateway - erro no proxy reverso');
  }
}));

app.listen(PORT, () => {
  console.log(`Proxy reverso rodando em http://localhost:${PORT}, redirecionando para ${NGROK_URL}`);
});