const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Proxy para o ngrok
app.use('/ngrok', createProxyMiddleware({
  target: 'https://adc5-2804-1b3-6147-29cd-6036-d2ee-793b-f28b.ngrok-free.app',
  changeOrigin: true,
  pathRewrite: {
    '^/ngrok': '', // Remove o prefixo "/ngrok" do caminho
  },
  logLevel: 'debug',
  onError: (err, req, res) => {
    console.error('Erro no proxy:', err);
    res.status(500).send('Erro ao acessar o servidor ngrok.');
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log('-> Proxy funcionando para:', req.url);
  }
}));

// Rota principal
app.get('/', (req, res) => {
  res.send(`
    <h1>Servidor rodando com proxy reverso!</h1>
    <p><a href="/ngrok" target="_blank">Clique aqui para acessar o conteúdo do ngrok</a></p>
  `);
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});