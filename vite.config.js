import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Dev-only plugin: save scene JSON & timeline.json from the in-app editor.
//
// Every endpoint takes a `line` (story line = directory under src/data/, e.g.
// "dufu" / "dante"). The line is whitelisted against directories that actually
// exist so a bad request can't write outside src/data/ or invent a new line.
// Before overwriting, the previous file version is copied to
// .editor-backups/<line>/<id>/<timestamp>.json (git-ignored, last 20 kept).

const MAX_BACKUPS = 20;

function resolveLineDir(line) {
  if (!line || !/^[A-Za-z0-9_\-]+$/.test(line)) {
    throw new Error('invalid line: ' + line);
  }
  const dir = path.resolve('src/data', line);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error('unknown line (no such dir under src/data/): ' + line);
  }
  return dir;
}

// Content must be valid JSON before it's allowed to replace a data file.
function assertValidJson(content) {
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('empty content');
  }
  try {
    JSON.parse(content);
  } catch (err) {
    throw new Error('content is not valid JSON: ' + err.message);
  }
}

function backupExisting(filePath, line, id) {
  if (!fs.existsSync(filePath)) return;
  const backupDir = path.resolve('.editor-backups', line, id);
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(filePath, path.join(backupDir, stamp + '.json'));
  const old = fs.readdirSync(backupDir).filter((f) => f.endsWith('.json')).sort();
  while (old.length > MAX_BACKUPS) {
    fs.unlinkSync(path.join(backupDir, old.shift()));
  }
}

function writeDataFile({ filePath, line, backupId, content }) {
  assertValidJson(content);
  backupExisting(filePath, line, backupId);
  // 数据文件统一以换行结尾（JSON.stringify 不带），避免每次保存都出现 no-newline diff
  const normalized = content.endsWith('\n') ? content : content + '\n';
  fs.writeFileSync(filePath, normalized, 'utf-8');
  return {
    ok: true,
    path: path.relative(process.cwd(), filePath),
    bytes: Buffer.byteLength(normalized, 'utf-8'),
  };
}

function jsonEndpoint(handler) {
  return (req, res) => {
    if (req.method !== 'POST') {
      res.statusCode = 405; res.end('Method not allowed'); return;
    }
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const result = handler(JSON.parse(body));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result));
      } catch (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
  };
}

function dataSaverPlugin() {
  return {
    name: 'data-saver',
    configureServer(server) {
      // POST /api/save-event  { line, eventId, content }
      //   -> writes src/data/<line>/events/<eventId>/event.json
      server.middlewares.use('/api/save-event', jsonEndpoint(({ line = 'dufu', eventId, content }) => {
        if (!eventId || !/^[A-Za-z0-9_\-]+$/.test(eventId)) {
          throw new Error('invalid eventId');
        }
        const lineDir = resolveLineDir(line);
        const dir = path.join(lineDir, 'events', eventId);
        fs.mkdirSync(dir, { recursive: true });
        return writeDataFile({
          filePath: path.join(dir, 'event.json'),
          line, backupId: eventId, content,
        });
      }));

      // POST /api/save-timeline  { line, content }
      //   -> writes src/data/<line>/timeline.json
      server.middlewares.use('/api/save-timeline', jsonEndpoint(({ line = 'dufu', content }) => {
        const lineDir = resolveLineDir(line);
        return writeDataFile({
          filePath: path.join(lineDir, 'timeline.json'),
          line, backupId: 'timeline', content,
        });
      }));

      // Legacy endpoint kept for backward compat — writes to events/<id>/ if filename matches.
      server.middlewares.use('/api/save-scene', jsonEndpoint(({ line = 'dufu', filename, content }) => {
        const safe = path.basename(filename);
        // try to map "747_exam.json" -> events/747_exam/event.json
        const id = safe.replace(/\.json$/, '');
        if (!/^[A-Za-z0-9_\-]+$/.test(id)) {
          throw new Error('invalid filename');
        }
        const lineDir = resolveLineDir(line);
        const dir = path.join(lineDir, 'events', id);
        fs.mkdirSync(dir, { recursive: true });
        return writeDataFile({
          filePath: path.join(dir, 'event.json'),
          line, backupId: id, content,
        });
      }));
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), dataSaverPlugin()],
})
