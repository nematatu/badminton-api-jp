// Run against `npm run dev` or a deployed Worker.
import assert from 'node:assert/strict'
const base = process.argv[2] || 'http://127.0.0.1:8787'
for (const [path, type] of [['/','text/html'],['/app.js','javascript'],['/style.css','text/css'],['/images/badminton-court.svg','image/svg+xml'],['/health','application/json'],['/venues?perPage=2','application/json'],['/openapi.json','application/json']]) {
 const res = await fetch(base+path,{redirect:'error'})
 assert.equal(res.status,200,path)
 assert.ok(res.headers.get('content-type')?.includes(type),path)
 assert.equal(res.headers.get('Access-Control-Allow-Origin'),'*',path)
 const body=await res.text();assert.ok(body.length>0,path)
 if (path==='/') {assert.ok(body.includes('id="query-form"'));assert.ok(res.headers.get('Content-Security-Policy')?.includes("script-src 'self'"))}
 console.log('OK',path,res.status)
}
const gql=await fetch(base+'/graphql',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:'{venues(perPage:2){totalCount venues{id}}}'})})
const body=await gql.json();assert.equal(body.data.venues.venues.length,2);assert.equal(body.data.venues.totalCount,7)
console.log('OK /graphql',gql.status)
assert.equal((await fetch(base+'/missing')).status,404)
console.log('OK JSON 404')
