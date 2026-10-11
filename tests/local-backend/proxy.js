// Mimics Supabase's gateway for local testing: forwards /rest/v1/* to PostgREST.
const http = require('http');
const [, , listenPort, targetPort] = process.argv;
http.createServer((req, res) => {
  if (!req.url.startsWith('/rest/v1')) { res.writeHead(404); return res.end(); }
  const path = req.url.slice('/rest/v1'.length) || '/';
  const fwd = http.request({ host: '127.0.0.1', port: targetPort, path, method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${targetPort}` } }, (r) => {
    res.writeHead(r.statusCode, r.headers); r.pipe(res);
  });
  fwd.on('error', (e) => { res.writeHead(502); res.end(String(e)); });
  req.pipe(fwd);
}).listen(listenPort, () => console.log(`proxy :${listenPort} -> postgrest :${targetPort}`));
