import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Dev-only plugin: save scene JSON from editor
function sceneSaverPlugin() {
  return {
    name: 'scene-saver',
    configureServer(server) {
      server.middlewares.use('/api/save-scene', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const { filename, content } = JSON.parse(body);
            const safeName = path.basename(filename);
            const filePath = path.resolve('src/data/dufu/scenes', safeName);
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
  plugins: [react(), sceneSaverPlugin()],
})
