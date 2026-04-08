const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8086;

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    
    let filePath = req.url === '/' ? 'index.html' : req.url.substring(1);
    
    // 防止目录遍历
    filePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
    
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'text/plain';
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error(`Error reading file: ${filePath}`, err.message);
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        } else {
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*'
            });
            res.end(data);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
