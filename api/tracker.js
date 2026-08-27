const http = require('http');

const BACKEND_HOST = '152.53.158.5';
const BACKEND_PORT = 3700;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-access-code');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const url = new URL(req.url, 'http://localhost');
  const suffix = url.pathname.replace(/^\/api\/tracker/, '') || '';
  const targetPath = `/api/tracker${suffix}${url.search || ''}`;

  const headers = { 'Content-Type': 'application/json' };
  if (req.headers['x-access-code']) headers['x-access-code'] = req.headers['x-access-code'];

  let body = '';
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    body = await new Promise(resolve => {
      let raw = '';
      req.on('data', c => { raw += c; });
      req.on('end', () => resolve(raw));
    });
  }

  const proxyReq = http.request(
    { hostname: BACKEND_HOST, port: BACKEND_PORT, path: targetPath, method: req.method, headers },
    (proxyRes) => {
      let data = '';
      proxyRes.on('data', c => { data += c; });
      proxyRes.on('end', () => {
        try {
          res.status(proxyRes.statusCode).json(JSON.parse(data));
        } catch {
          res.status(proxyRes.statusCode).send(data);
        }
      });
    }
  );

  proxyReq.on('error', () => {
    res.status(503).json({ error: 'Backend unavailable' });
  });

  if (body) proxyReq.write(body);
  proxyReq.end();
};
