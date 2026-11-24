#!/usr/bin/env node
// Serves this folder at http://localhost:8000/ (npm start), so each tool opens the way it will on the web:
// http://localhost:8000/<id>/. Nothing to install. Another port: npm start -- 8080
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || process.env.PORT || 8000);
const TYPES = {
	'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
	'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif',
	'.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.webm': 'audio/webm',
	'.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
};

http.createServer((req, res) => {
	const url = new URL(req.url || '/', 'http://localhost');
	const rel = decodeURIComponent(url.pathname);
	let file = path.join(ROOT, path.normalize(rel));
	if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return void res.writeHead(403).end();
	if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
		if (!rel.endsWith('/')) return void res.writeHead(301, { location: `${rel}/${url.search}` }).end();
		file = path.join(file, 'index.html');
	}
	fs.readFile(file, (err, data) => {
		if (err) return void res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
		res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' }).end(data);
	});
}).listen(PORT, '127.0.0.1', () => {
	const skip = new Set(['shell', 'js', 'template', 'tests', 'scripts', 'node_modules']);
	const tools = fs.readdirSync(ROOT, { withFileTypes: true })
		.filter((e) => e.isDirectory() && !skip.has(e.name) && fs.existsSync(path.join(ROOT, e.name, 'index.html')))
		.map((e) => `  http://localhost:${PORT}/${e.name}/`);
	console.log(`Serving this folder at http://localhost:${PORT}/ (Ctrl+C to stop)`);
	console.log(tools.length ? tools.join('\n') : '  No tools yet: npm run new-tool -- <id> "<Name>" "<line>" "<your name>"');
});
