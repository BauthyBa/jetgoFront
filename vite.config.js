import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import fs from 'node:fs'
import url from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'tripadvisor-dev-proxy',
      configureServer(server) {
        server.middlewares.use('/api/tripadvisor', async (req, res) => {
          try {
            const filePath = path.resolve(__dirname, 'api', 'tripadvisor.js')
            const objectUrl = url.pathToFileURL(filePath).href
            const mod = await import(objectUrl + `?t=${Date.now()}`)
            if (typeof mod.default === 'function') {
              return mod.default(req, res)
            }
            res.statusCode = 500
            res.end('Invalid handler export')
          } catch (err) {
            res.statusCode = 500
            res.end('Dev proxy error: ' + (err?.message || String(err)))
          }
        })
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    middlewareMode: false,
    setupMiddlewares(middlewares) {
      middlewares.use('/api/tripadvisor', async (req, res) => {
        try {
          const filePath = path.resolve(__dirname, 'api', 'tripadvisor.js')
          const code = fs.readFileSync(filePath, 'utf8')
          const blob = new Blob([code], { type: 'text/javascript' })
          const objectUrl = url.pathToFileURL(filePath).href
          const mod = await import(objectUrl + `?t=${Date.now()}`)
          if (typeof mod.default === 'function') {
            // Emular handler Next/Vercel (req/res estilo Node)
            return mod.default(req, res)
          }
          res.statusCode = 500
          res.end('Invalid handler export')
        } catch (err) {
          res.statusCode = 500
          res.end('Dev proxy error: ' + (err?.message || String(err)))
        }
      })
      return middlewares
    },
  },
})
