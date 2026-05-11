import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Dev-only plugin: save scene JSON & timeline.json from the in-app editor.
function dataSaverPlugin() {
  return {
    name: 'data-saver',
    configureServer(server) {
      // POST /api/save-event  { eventId, content } -> writes src/data/dufu/events/<eventId>/event.json
      server.middlewares.use('/api/save-event', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405; res.end('Method not allowed'); return;
        }
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const { eventId, content } = JSON.parse(body);
            if (!eventId || !/^[A-Za-z0-9_\-]+$/.test(eventId)) {
              throw new Error('invalid eventId');
            }
            const dir = path.resolve('src/data/dufu/events', eventId);
            fs.mkdirSync(dir, { recursive: true });
            const filePath = path.join(dir, 'event.json');
            fs.writeFileSync(filePath, content, 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, path: filePath }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: err.message }));
          }
        });
      });

      // POST /api/save-timeline  { content } -> writes src/data/dufu/timeline.json
      server.middlewares.use('/api/save-timeline', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405; res.end('Method not allowed'); return;
        }
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const { content } = JSON.parse(body);
            const filePath = path.resolve('src/data/dufu/timeline.json');
            fs.writeFileSync(filePath, content, 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, path: filePath }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: err.message }));
          }
        });
      });

      // Legacy endpoint kept for backward compat — writes to events/<id>/ if filename matches.
      server.middlewares.use('/api/save-scene', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405; res.end('Method not allowed'); return;
        }
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const { filename, content } = JSON.parse(body);
            const safe = path.basename(filename);
            // try to map "747_exam.json" -> events/747_exam/event.json
            const id = safe.replace(/\.json$/, '');
            const dir = path.resolve('src/data/dufu/events', id);
            fs.mkdirSync(dir, { recursive: true });
            const filePath = path.join(dir, 'event.json');
            fs.writeFileSync(filePath, content, 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, path: filePath }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: err.message }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), dataSaverPlugin()],
})
