const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const rootDir = __dirname;
const port = Number(process.env.PORT || 8000);

const mimeTypes = {
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
    '.mp3': 'audio/mpeg',
    '.glb': 'model/gltf-binary',
    '.hdr': 'application/octet-stream',
    '.bin': 'application/octet-stream'
};

function sendFile(filePath, res) {
    fs.readFile(filePath, (error, data) => {
        if (error) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
            'Content-Type': mimeTypes[ext] || 'application/octet-stream',
            'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
        });
        res.end(data);
    });
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    const safePath = decodeURIComponent(parsedUrl.pathname || '/');
    const normalizedPath = safePath === '/' ? '/index.html' : safePath;
    const resolvedPath = path.normalize(path.join(rootDir, normalizedPath));

    if (!resolvedPath.startsWith(rootDir)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('403 Forbidden');
        return;
    }

    fs.stat(resolvedPath, (error, stats) => {
        if (!error && stats.isDirectory()) {
            sendFile(path.join(resolvedPath, 'index.html'), res);
            return;
        }

        if (!error && stats.isFile()) {
            sendFile(resolvedPath, res);
            return;
        }

        if (!path.extname(resolvedPath)) {
            sendFile(path.join(rootDir, 'index.html'), res);
            return;
        }

        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
    });
});

server.listen(port, () => {
    console.log(`Static server running at http://localhost:${port}`);
});
