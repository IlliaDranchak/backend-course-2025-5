#!/usr/bin/env node

// ===== ІМПОРТИ =====
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { Command } = require('commander');
const superagent = require('superagent'); // <-- Частина 3

// ===== COMMANDER =====
const program = new Command();

program
  .requiredOption('-h, --host <host>', 'server host')
  .requiredOption('-p, --port <port>', 'server port', parseInt)
  .requiredOption('-c, --cache <path>', 'cache directory path')
  .parse(process.argv);

const options = program.opts();

// ===== КЕШ-ДИРЕКТОРІЯ =====
const cacheDir = path.resolve(process.cwd(), options.cache);

if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
  console.log(`Створено директорію кешу: ${cacheDir}`);
}

function getFilePath(code) {
  return path.join(cacheDir, `${code}.jpg`);
}

// =========================================================================
//                             HTTP SERVER
// =========================================================================

const server = http.createServer(async (req, res) => {
  const url = req.url;
  const code = url.slice(1);

  if (!/^\d{3}$/.test(code)) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end('Invalid URL. Use /200');
  }

  const filePath = getFilePath(code);

  // ======================================================================
  //                               GET
  // ======================================================================
  if (req.method === 'GET') {
    // 1. спочатку пробуємо зчитати з кешу
    try {
      const data = await fsp.readFile(filePath);
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      return res.end(data);
    } catch (err) {
      // 2. якщо в кеші нема → робимо запит на http.cat
      console.log(`Кеш не знайдено, робимо запит на http.cat/${code}...`);

      try {
        const response = await superagent.get(`https://http.cat/${code}`);

        // збережемо у кеш
        await fsp.writeFile(filePath, response.body);

        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        return res.end(response.body);
      } catch (err2) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Not Found on http.cat');
      }
    }
  }

  // ======================================================================
  //                               PUT
  // ======================================================================
  if (req.method === 'PUT') {
    try {
      const sourceImagePath = path.join(process.cwd(), 'test_images', 'cat.jpg');
      const data = await fsp.readFile(sourceImagePath);

      await fsp.writeFile(filePath, data);

      res.writeHead(201, { 'Content-Type': 'text/plain' });
      return res.end('Created (copied from test_images/cat.jpg)');
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('Error writing file');
    }
  }

  // ======================================================================
  //                              DELETE
  // ======================================================================
  if (req.method === 'DELETE') {
    try {
      await fsp.unlink(filePath);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end('Deleted');
    } catch (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not Found');
    }
  }

  // ======================================================================
  //                          METHOD NOT ALLOWED
  // ======================================================================
  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method Not Allowed');
});

// =========================================================================
//                               START SERVER
// =========================================================================

server.listen(options.port, options.host, () => {
  console.log(`Server running at http://${options.host}:${options.port}`);
});




