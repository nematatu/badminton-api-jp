# TypeScriptで呼び出す

この `client/` フォルダーを自分のTypeScriptプロジェクトへコピーします。実行時の外部依存はなく、ブラウザまたはNode.js 22以上の `fetch` で動きます。npmパッケージとしては公開していません。

```ts
import { ApiError, createClient } from './client'

// 公開後は、デプロイ時に表示されたWorkers URLへ置き換えます。
const api = createClient('http://localhost:8787')

try {
  const page = await api.listVenues(
    { prefecture: '東京都', perPage: 2 },
    { signal: AbortSignal.timeout(5000) },
  )
  console.log(page.venues.map(venue => venue.name))

  if (page.pageInfo.nextPage !== null) {
    const next = await api.listVenues({ prefecture: '東京都', perPage: 2, page: page.pageInfo.nextPage })
    console.log(next.venues)
  }
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.status, error.body.code, error.body.details)
  } else {
    // ネットワーク障害やタイムアウトも呼び出し側で処理します。
    throw error
  }
}
```

- `listVenues(query?, options?)` → `{ venues, totalCount, pageInfo }`
- `getVenue(id, options?)` → `{ venue }`
- `getAuthor(id, options?)` → `{ author }`

`options.signal` で中断・タイムアウトを指定できます。`Venue / Author / VenuePage / ApiErrorBody` の型もexportしています。APIエラーは `ApiError`、通信エラーや中断はfetch本来のエラーです。画像は実写真が投稿されるまで空配列です。
