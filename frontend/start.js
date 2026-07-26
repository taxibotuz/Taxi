import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const port = process.env.PORT || '3000'
const servePath = resolve(__dirname, 'node_modules', 'serve', 'build', 'main.js')

const child = spawn('node', [servePath, '-s', 'dist', '-l', port], {
  stdio: 'inherit',
})

child.on('close', (code) => {
  process.exit(code ?? 0)
})
