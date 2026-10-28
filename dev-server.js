#!/usr/bin/env node
/**
 * SHRI RAMJI ASTRO (SRA) — ZERO-DEPENDENCY LIVE HOT-RELOAD DEV SERVER
 * -------------------------------------------------------------------
 * Runs out-of-the-box on Node.js without any npm install!
 * - Serves all HTML, CSS, JS, Images, and Fonts with correct MIME types
 * - Injects a lightweight Server-Sent Events (SSE) live-reload script into HTML
 * - Watches all project files and triggers instant hot-reload on every save
 * - Binds to 0.0.0.0 so you can preview on Desktop, Mobile Emulator, and Real Phone (Wi-Fi)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8'
};

// SSE CLIENTS
const sseClients = new Set();

function broadcastReload(changedFile) {
  const rel = path.relative(ROOT_DIR, changedFile);
  console.log(`\x1b[36m[Hot-Reload]\x1b[0m \x1b[32m${rel}\x1b[0m changed — reloading connected devices...`);
  for (const client of sseClients) {
    try {
      client.write('data: reload\n\n');
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// LIVE RELOAD CLIENT SCRIPT (Injected into HTML responses)
const LIVE_RELOAD_SCRIPT = `
<!-- SRA HOT-RELOAD INJECTION -->
<script id="__sra_hot_reload">
(function() {
  if (window.__sraReloadActive) return;
  window.__sraReloadActive = true;
  let retryCount = 0;
  function connect() {
    const es = new EventSource('/__live_reload');
    es.onopen = function() {
      if (retryCount > 0) {
        console.log('%c[Hot-Reload] Reconnected to local dev server.', 'color: #10b981; font-weight: bold;');
        window.location.reload();
      } else {
        console.log('%c[Hot-Reload] Connected — Live preview active.', 'color: #c5a059; font-weight: bold;');
      }
      retryCount = 0;
    };
    es.onmessage = function(e) {
      if (e.data === 'reload') {
        console.log('%c[Hot-Reload] Update detected, refreshing view...', 'color: #3b82f6; font-weight: bold;');
        window.location.reload();
      }
    };
    es.onerror = function() {
      es.close();
      retryCount++;
      setTimeout(connect, 1500);
    };
  }
  connect();
})();
</script>
`;

// GET LOCAL WI-FI IP ADDRESS
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// HTTP REQUEST HANDLER
const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  // 1. SSE LIVE-RELOAD ENDPOINT
  if (urlPath === '/__live_reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('data: connected\n\n');
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // 1.5. REVERSE PROXY TO SRA PARASHARA CANONICAL ENGINE (FastAPI / Swiss Ephemeris on :8000)
  if (
    urlPath === '/calculate' ||
    urlPath.startsWith('/calculate/') ||
    urlPath.startsWith('/calculate?') ||
    urlPath === '/timezone' ||
    urlPath.startsWith('/timezone?') ||
    urlPath === '/transit' ||
    urlPath.startsWith('/transit?') ||
    urlPath.startsWith('/api/')
  ) {
    const proxyReq = http.request({
      host: '127.0.0.1',
      port: 8000,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: '127.0.0.1:8000'
      }
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        status: 'error',
        error: 'SRA Parashara Canonical Microservice (:8000) is offline or unreachable.',
        detail: err.message
      }));
    });

    req.pipe(proxyReq);
    return;
  }

  // 2. STATIC FILE RESOLUTION
  let safePath = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  let filePath = path.join(ROOT_DIR, safePath);

  // If path is directory, look for index.html inside it
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // If file doesn't have an extension and doesn't exist, try appending .html
  if (!fs.existsSync(filePath) && !path.extname(filePath)) {
    if (fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    }
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>404 Not Found — SRA Dev Server</title></head>
      <body style="font-family:sans-serif; background:#0f172a; color:#f8fafc; padding:40px; text-align:center;">
        <h1 style="color:#e2b04a;">404 — Page Not Found</h1>
        <p>File not found: <code>${urlPath}</code></p>
        <p><a href="/" style="color:#60a5fa;">← Return to Home</a> | <a href="/app.html" style="color:#60a5fa;">Mobile App Preview</a></p>
      </body>
      </html>
    `);
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  if (ext === '.html') {
    fs.readFile(filePath, 'utf8', (err, html) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error reading file: ' + err.message);
        return;
      }

      // Inject live reload script before </body> or </html> or at end
      let modifiedHtml = html;
      if (html.includes('</body>')) {
        modifiedHtml = html.replace('</body>', `${LIVE_RELOAD_SCRIPT}</body>`);
      } else if (html.includes('</html>')) {
        modifiedHtml = html.replace('</html>', `${LIVE_RELOAD_SCRIPT}</html>`);
      } else {
        modifiedHtml = html + LIVE_RELOAD_SCRIPT;
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(modifiedHtml);
    });
  } else {
    // Binary / Static Assets (Images, Fonts, CSS, JS)
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error streaming file: ' + err.message);
    });
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.js' || ext === '.css' ? 'no-cache' : 'max-age=3600'
    });
    stream.pipe(res);
  }
});

// RECURSIVE FILE WATCHER WITH DEBOUNCING
let debounceTimer = null;
const IGNORED_DIRS = new Set(['.git', 'node_modules', '.github']);

function watchDirectory(dir) {
  try {
    fs.watch(dir, { recursive: false }, (eventType, filename) => {
      if (!filename) return;
      if (filename.startsWith('.') || filename.endsWith('~') || filename.endsWith('.tmp')) return;

      const fullPath = path.join(dir, filename);
      const ext = path.extname(filename).toLowerCase();
      
      // Only reload on frontend relevant files
      if (['.html', '.js', '.css', '.json', '.svg', '.png', '.jpg', '.jpeg'].includes(ext)) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          broadcastReload(fullPath);
        }, 80);
      }
    });

    // Watch subdirectories
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !IGNORED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
        watchDirectory(path.join(dir, entry.name));
      }
    }
  } catch (e) {}
}

watchDirectory(ROOT_DIR);

// START SERVER
server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.clear();
  console.log('\x1b[1m\x1b[33m');
  console.log('╔════════════════════════════════════════════════════════════════════════╗');
  console.log('║       PATRIKA BY SHRI RAM JI ASTRO — LOCAL HOT-RELOAD DEV SERVER       ║');
  console.log('╚════════════════════════════════════════════════════════════════════════╝');
  console.log('\x1b[0m');
  console.log('  \x1b[1m\x1b[32m✓ Local Desktop Browser:\x1b[0m   http://localhost:' + PORT);
  console.log('  \x1b[1m\x1b[35m✓ Native Mobile App Shell:\x1b[0m http://localhost:' + PORT + '/app.html');
  console.log('  \x1b[1m\x1b[36m✓ Real Phone on Wi-Fi:\x1b[0m     http://' + localIp + ':' + PORT);
  console.log('  \x1b[1m\x1b[34m✓ Phone App Shell:\x1b[0m         http://' + localIp + ':' + PORT + '/app.html');
  console.log('\n  \x1b[90mWatching all .html, .js, .css files. Any save reloads instantly!\x1b[0m');
  console.log('  \x1b[90mPress Ctrl + C to stop the server.\x1b[0m\n');
});
