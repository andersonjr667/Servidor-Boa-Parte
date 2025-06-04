const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use('/', createProxyMiddleware({
  target: 'https://674c-2804-1b3-6147-29cd-7415-df8c-eb77-c92b.ngrok-free.app', // seu link do ngrok aqui
  changeOrigin: true,
  secure: false,
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy online na porta ${PORT}`);
});
