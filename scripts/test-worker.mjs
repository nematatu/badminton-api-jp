import { spawn } from 'node:child_process'
import { once } from 'node:events'

const worker = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'dev', '--local', '--ip', '127.0.0.1', '--port', '8791'], { stdio: ['ignore', 'pipe', 'pipe'] })
let log = ''
for (const stream of [worker.stdout, worker.stderr]) stream.on('data', (chunk) => { log = (log + chunk).slice(-100000) })
try {
  const smoke = spawn(process.execPath, ['scripts/smoke.mjs', 'http://127.0.0.1:8791', '--wait'], { stdio: 'inherit' })
  const [code] = await once(smoke, 'exit')
  process.exitCode = code ?? 1
  if (process.exitCode) console.error(log)
} finally {
  if (worker.exitCode === null && worker.signalCode === null) {
    const exited = once(worker, 'exit')
    worker.kill('SIGTERM')
    const force = setTimeout(() => worker.kill('SIGKILL'), 5000)
    await exited
    clearTimeout(force)
  }
}
