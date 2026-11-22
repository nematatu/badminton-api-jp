import { expect, it } from 'vitest'
import { deploymentUrl } from '../scripts/deployment-url.mjs'

it('selects the most recent deployment URL from structured Wrangler output', () => {
  const output = [
    { type: 'build', targets: ['https://wrong.workers.dev'] },
    { type: 'deploy', targets: ['https://old.workers.dev'] },
    { type: 'deploy', targets: ['schedule: * * * * *', 'https://badminton-api-jp.example.workers.dev'] },
  ].map((entry) => JSON.stringify(entry)).join('\n')
  expect(deploymentUrl(output)).toBe('https://badminton-api-jp.example.workers.dev')
})

it.each(['https://example.com', 'http://test.workers.dev', 'https://user:secret@test.workers.dev', 'https://test.workers.dev/?token=secret'])('does not publish an unexpected deployment target %s', (target) => {
  expect(() => deploymentUrl(JSON.stringify({ type: 'deploy', targets: [target] }))).toThrow('public workers.dev URL')
})
