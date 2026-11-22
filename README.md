# Badminton API 🏸

国内のバドミントン会場を返す、学習・試作用の小さなREST APIです。認証不要。Hono + Cloudflare Workersで動きます。

## 呼び出す

ローカルで起動するか、[Cloudflareに公開](docs/deploy.md)してベースURLを用意します。GitHubのURLはAPIのベースURLではありません。

```sh
curl 'http://localhost:8787/venues?perPage=2'
curl 'http://localhost:8787/venues/tokyo-metropolitan-main'
```

仕様は `GET /openapi.json`。Swagger UI・Postmanなどへ読み込めます。[TypeScriptクライアント](client/README.md)も使えます。

## 背景

[yusukebeさんのRamen API開発記事](https://yusukebe.com/posts/2022/ramen-api/)に着想を得ました。好きな題材のAPIを使って、一覧表示やページングを試す。その考え方をバドミントン会場に応用しています。コードとデータをGitHubで管理し、会場や写真をPRで追加できます。

初期データは5都道府県・7会場。各会場に公式情報の出典と確認日を付けています。写真は未収録です。全国の施設案内や予約サービスではありません。

## 起動・公開

Node.js 22以上を使います。

```sh
npm ci
npm run dev
# http://localhost:8787
```

Cloudflareに公開する場合:

```sh
npx wrangler login
npm run deploy
```

DBやAPIキーの設定は不要です。[Git連携で公開する方法](docs/deploy.md)も用意しています。

## API

| Method | Path | 内容 |
| --- | --- | --- |
| GET | `/venues` | 会場一覧 |
| GET | `/venues/:id` | 会場詳細 |
| GET | `/authors/:id` | 写真などの投稿者 |

```js
const params = new URLSearchParams({ prefecture: '東京都', perPage: '2' })
const response = await fetch(`http://localhost:8787/venues?${params}`)
if (!response.ok) throw new Error((await response.json()).error)
const { venues, pageInfo } = await response.json()
console.log(venues.map(venue => venue.name), pageInfo.nextPage)
```

`/venues` は `page`（既定1、最大100000）、`perPage`（既定10、最大100）、`prefecture`（完全一致）、`q`（会場名・市区・都道府県・IDの部分一致）で絞れます。`page`・`perPage` は半角数字のみ、同じパラメータの重複は不可です。`q` は前後の空白を除去後100文字まで、全角英数字・大文字小文字を区別しません。`?pretty` でJSONを整形できます。

一覧は `{ venues, totalCount, pageInfo }`、詳細は `{ venue }`、投稿者は `{ author }` を返します。IDの昇順。`pageInfo` は `currentPage / perPage / lastPage / prevPage / nextPage` を持ち、前後のページがなければ `null`。0件でも `lastPage` は1で、範囲外のページは空配列です。

不正なパラメータは400、存在しないIDは404、未対応メソッドは405。エラーは `{ "code": "…", "error": "…" }` 形式です。分岐には安定した `code` を使ってください。CORS対応で、ブラウザから利用できます。成功したGETは5分キャッシュ可能で、ETagによる304応答にも対応します。

一覧・詳細・投稿者の3つがデータ用APIです。`/` はバージョンと仕様URLの案内、`/openapi.json` は機械可読な仕様です。

[レスポンス・エラー・ページングの具体例](docs/api.md)。

`courtCount: null` は未確認を意味します。面数は設置可能数で、空き状況ではありません。利用条件・料金・最新情報は `officialUrl` を確認してください。`sources[].checkedAt` は情報の確認日です。

## 確認する

```sh
npm run check        # 型・API・データの検証とビルド
npm run test:worker  # Workersを起動してHTTPで検証し、自動停止
```

CIでも両方を実行します。

## データを追加する

`content/venues.json` に会場を追加し、`npm run check` を通してPRを送ってください。[投稿方法](CONTRIBUTING.md)。

コードは[MIT](LICENSE)、編纂データは[CC0](LICENSE-DATA.md)。写真を投稿する場合はCC BY 4.0の許諾と投稿者情報が必要です。出典サイトの文章・写真・ロゴに本プロジェクトのライセンスは適用されません。
