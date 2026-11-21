const $ = (id) => document.getElementById(id)
let currentPage = 1, pageInfo, requestVersion = 0, controller
let filters = {prefecture:'', q:''}
let currentPath = '/venues?perPage=3&page=1'
function showRequest(path) {
  currentPath = path
  $('request').textContent = `fetch(${JSON.stringify(location.origin + path)})\n  .then(res => res.json())\n  .then(data => console.log(data))`
}
async function load(path, isList = true) {
  const version = ++requestVersion
  controller?.abort(); controller = new AbortController()
  showRequest(path); $('status').textContent = 'Loading…'
  try {
    const res = await fetch(path,{signal:controller.signal})
    const data = await res.json()
    if (version !== requestVersion) return
    $('status').textContent = `${res.status} ${res.ok ? 'OK' : 'Error'}`
    $('result-label').textContent = isList ? 'RESPONSE / LIST' : 'RESPONSE / DETAIL'
    $('response').textContent = JSON.stringify(data,null,2)
    if (!res.ok) throw new Error(data.error?.message || 'リクエストに失敗しました')
    if (isList) {
      pageInfo = data.pageInfo
      $('count').textContent = `${data.totalCount} venues`
      $('venues').replaceChildren()
      if (!data.venues.length) $('venues').textContent = '該当する会場がありません。条件を変えて試してください。'
      for (const venue of data.venues) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'venue'
        button.append(document.createTextNode(venue.name + ' ↗'))
        const sub = document.createElement('small'); sub.textContent = `${venue.prefecture} / ${venue.city} / ${venue.courtCount ?? '未確認'} 面`
        button.append(sub); button.addEventListener('click', () => load(`/venues/${encodeURIComponent(venue.id)}`,false))
        $('venues').append(button)
      }
      $('page').textContent = `${pageInfo.currentPage} / ${pageInfo.lastPage}`
      $('prev').disabled = pageInfo.prevPage === null; $('next').disabled = pageInfo.nextPage === null
    }
  } catch (error) {
    if (error.name === 'AbortError' || version !== requestVersion) return
    $('status').textContent = 'Error: ' + error.message
  }
}
function list() {
  const params = new URLSearchParams({perPage:'3',page:String(currentPage)})
  if (filters.prefecture) params.set('prefecture',filters.prefecture)
  if (filters.q) params.set('q',filters.q)
  load('/venues?' + params)
}
$('query-form').addEventListener('submit', (event) => {event.preventDefault();filters={prefecture:$('prefecture').value,q:$('query').value.trim()};currentPage=1;list()})
$('prev').addEventListener('click', () => {if (pageInfo?.prevPage) {currentPage=pageInfo.prevPage;list()}})
$('next').addEventListener('click', () => {if (pageInfo?.nextPage) {currentPage=pageInfo.nextPage;list()}})
$('copy').addEventListener('click',async () => {
  try {await navigator.clipboard.writeText($('request').textContent);$('status').textContent='fetchをコピーしました'}
  catch {$('status').textContent='コピーできませんでした。REQUESTのコードを選択してください。'}
})
async function init() {
  try {
    const res = await fetch('/prefectures');if (!res.ok) throw new Error('都道府県の取得に失敗しました')
    const data = await res.json()
    for (const {name,venueCount} of data.prefectures) {const option=document.createElement('option');option.value=name;option.textContent=`${name} (${venueCount})`;$('prefecture').append(option)}
  } catch (error) {$('status').textContent=error.message}
  list()
}
init()
