import { appendFileSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export function deploymentUrl(output) {
  const deployments = output.trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)).filter((entry) => entry.type === 'deploy')
  for (const target of deployments.at(-1)?.targets ?? []) {
    try {
      const url = new URL(target)
      if (url.protocol === 'https:' && url.hostname.endsWith('.workers.dev') && !url.username && !url.password && !url.search && !url.hash && url.pathname === '/') return url.origin
    } catch { /* Non-URL targets include schedules and queue bindings. */ }
  }
  throw new Error('Wrangler did not return a public workers.dev URL. Check workers_dev in wrangler.jsonc.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const url = deploymentUrl(readFileSync(process.argv[2], 'utf8'))
  console.log(url)
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `api_url=${url}\n`)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `Public API: ${url}\n\nOpenAPI: ${url}/openapi.json\n`)
}
