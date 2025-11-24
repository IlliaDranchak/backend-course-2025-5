#!/usr/bin/env node

// ===== ІМПОРТИ =====
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { Command } = require('commander');

// ===== НАЛАШТУВАННЯ COMMANDER =====
const program = new Command();

program
  .requiredOption('-h, --host <host>', 'server host')
  .requiredOption('-p, --port <port>', 'server port', parseInt)
  .requiredOption('-c, --cache <path>', 'cache directory path')
  .parse(process.argv);

const options = program.opts();

// ===== ШЛЯХ ДО КЕШУ =====
const cacheDir = path.resolve(process.cwd(), options.cache);

// створюємо кеш директорію, якщо немає
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
  console.log(`Створено директорію кешу: ${cacheDir}`);
} else {
  console.log(`Директорія кешу існує: ${cacheDir}`);
}

// ===== ДОПОМОЖНА ФУНКЦІЯ =====================================================
function getFilePath(code) {
  // зберігаємо кожен код як: 200.jpg, 404.jpg і тд
  return path.join(cacheDir, `${code}.jpg`);
}

// ===== СТВОРЕННЯ СЕРВЕРА =====================================================
const server = http.createServer(async (req, res) => {
  const url = req.url;  // /200
  const code = url.slice(1); // "200"

  // Перевірка — шлях повинен бути типу /200
  if (!/^\d{3}$/.test(code)) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end('Invalid URL. Use form /200, /404 etc.');
  }

  const filePath = getFilePath(code);

  // ======================================================================
  //                                GET
  // ======================================================================
  if (req.method === 'GET') {
    try {
      const data = await fsp.readFile(filePath);
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      return res.end(data);
    } catch (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not Found');
    }
  }

  // ======================================================================
  //                                PUT
  // ======================================================================
  if (req.method === 'PUT') {
    try {
      const sourceImagePath = path.join(process.cwd(), 'test_images', 'cat.jpg');

      // читаємо локальний файл
      const data = await fsp.readFile(sourceImagePath);

      // записуємо в кеш під кодом (наприклад PUT /200 → cache/200.jpg)
      await fsp.writeFile(filePath, data);

      res.writeHead(201, { 'Content-Type': 'text/plain' });
      return res.end('Created (copied from test_images/cat.jpg)');
    } catch (err) {
      console.error(err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('Error writing image');
    }
  }

  // ======================================================================
  //                               DELETE
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
  //                     METHOD NOT ALLOWED for others
  // ======================================================================
  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method Not Allowed');
});

// ===== ЗАПУСК СЕРВЕРА =========================================================
server.listen(options.port, options.host, () => {
  console.log(`Server listening at http://${options.host}:${options.port}`);
  console.log(`Cache directory: ${cacheDir}`);
});



