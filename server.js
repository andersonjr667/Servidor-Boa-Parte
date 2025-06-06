const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Rota proxy reverso
app.use('/ngrok', createProxyMiddleware({
  target: 'https://adc5-2804-1b3-6147-29cd-6036-d2ee-793b-f28b.ngrok-free.app',
  changeOrigin: true,
  pathRewrite: {
    '^/ngrok': '', // remove /ngrok do caminho
  },
}));

// Exemplo de rota principal
app.get('/', (req, res) => {
  res.send('Servidor rodando com proxy reverso!');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});