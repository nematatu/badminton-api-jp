# Badminton API 🏸 Japan

国内のバドミントン会場を題材に、Web APIを使うアプリの学習・試作を楽しむためのAPIです。認証不要のREST / GraphQL、検索・都道府県フィルタ・ページングを提供します。Cloudflare Workers + Hono + TypeScript。DB・外部APIキー不要で動作します。

**初期版: 5都道府県・7会場。全国を網羅していません。会場写真は未収録です。** 画像表示の試作には、写真と区別したオリジナルのコート図を返します。料金・予約・リアルタイムの空き状況・個人開放は提供しません。

## なぜ作るのか

[yusukebeさんのRamen API開発記事（2022-04-18）](https://yusukebe.com/posts/2022/ramen-api/)では、フロントエンドの学習やプロトタイピングで使うAPIとして、GitHub APIやJSONPlaceholder以外に、好きな題材を扱うAPIを作った背景が説明されています。自身で撮ったラーメン写真を使い、少ないエンドポイントでも一覧やページングを試せる構成です。

このプロジェクトでは、その発想を国内のバドミントン会場に応用します。会場をカード表示する、都道府県で絞る、検索する、次のページに進む。好きなスポーツを題材に、実際のアプリで必要になる処理を試せることが目的です。店舗を会場、写真投稿者をコンテンツ投稿者に置き換え、データ・画像もGitで管理してPRで育てます。

元APIの大事な特徴である実写真は、権利を確認できる投稿が集まってから追加します。第三者の公式サイトの写真をコピーしたり、図を実在会場の写真として扱ったりしません。

独立した非公式プロジェクトです。Ramen API、施設運営者、競技団体との提携・公認を示すものではありません。元プロジェクトのコード・写真はコピーしていません。[設計の詳細](docs/design.md)。

## 起動

Node.js 22以上を使います。

```sh
npm ci
npm run dev
# http://localhost:8787
```

ルートURLで検索付きのAPIプレイグラウンドが開きます。

```js
// 公開後は自身のWorkers URLに置き換えてください。
const base = 'http://localhost:8787'
const params = new URLSearchParams({ prefecture: '東京都', perPage: '2' })
const { venues, pageInfo } = await fetch(`${base}/venues?${params}`).then(r => r.json())
console.log(venues[0].name, pageInfo.nextPage)
```

## REST API

| Method | Path | 内容 |
| --- | --- | --- |
| GET | `/venues` | 一覧・フィルタ・検索・ページング |
| GET | `/venues/:id` | 会場詳細 |
| GET | `/prefectures` | 登録済みの都道府県と件数 |
| GET | `/authors` | 投稿者一覧 |
| GET | `/authors/:id` | 投稿者詳細 |
| GET | `/health` | 稼働確認・データ件数 |
| GET | `/openapi.json` | OpenAPI 3.0仕様 |
| POST | `/graphql` | 読み取り専用GraphQL |

`/venues` のパラメータ:

| 名前 | 既定値 | 内容 |
| --- | --- | --- |
| `page` | `1` | 1〜100000の整数 |
| `perPage` | `10` | 1〜100の整数 |
| `prefecture` | なし | `東京都` など正式名称の完全一致、1〜20文字 |
| `q` | なし | 会場名・都道府県・市区・IDの部分一致。NFKC正規化、大文字小文字を区別しない。100文字まで |
| `pretty` | なし | 指定するとJSONを整形。一覧・詳細で利用可能 |

```sh
curl 'http://localhost:8787/venues?perPage=2&page=1&pretty'
curl 'http://localhost:8787/venues/tokyo-metropolitan-main?pretty'
```

一覧は `{ venues, totalCount, pageInfo }`、詳細は `{ venue }`、投稿者詳細は `{ author }`。IDの昇順で返します。`totalCount` はフィルタ適用後の件数です。`pageInfo` は `currentPage / perPage / lastPage / nextPage / prevPage` を持ち、次・前ページがなければ `null`。0件でも `lastPage` は1。範囲外のページは空配列を返します。

不正なパラメータは400、存在しないID・パスは404。RESTのエラーは `{ "error": { "code": "…", "message": "…" } }`。全オリジン向けのCORS、成功したGETの5分キャッシュ、ETagを有効にしています。

`courtCount: null` は未確認で、0面という意味ではありません。面数は設置可能数で、現在利用可能な面数ではありません。`sources[].checkedAt` は情報の確認日です。会場名・面数・利用条件は変わるため、訪問前には `officialUrl` を確認してください。

`photos` は実写真専用の配列で初期版は空です。`illustration` は汎用図で、施設の配置や外観を示しません。実写真追加時は `authorId` と `license` を返します。

## GraphQL

```sh
curl http://localhost:8787/graphql \
  -H 'Content-Type: application/json' \
  --data '{"query":"query($pref: String!) { venues(prefecture: $pref, perPage: 2) { totalCount venues { id name courtCount } pageInfo { nextPage } } }","variables":{"pref":"東京都"}}'
```

`venue(id:)`、`author(id:)`、`authors` も取得できます。未存在の単体は `null`。スキーマは `src/graphql.ts` にあります。JSON POSTのみで、GraphiQL UIは含みません。

本文16KiB、クエリ8192文字、最大深さ10・100フィールド。名前付きfragment spreadは拒否し、inline fragmentは使用できます。入力・構文エラーは400、Content-Type不正は415、本文超過は413。実行時のフィールドエラーはGraphQL標準形式の `errors` を含む200です。RESTとGraphQLは同じデータ・フィルタ・ページングを使います。

## Cloudflareに公開

[詳細な手順](docs/deploy.md)。WorkersのStatic AssetsでAPIと画面・図を同じWorkerから配信します。D1 / KV / R2は不要です。

```sh
npm ci
npm run check
npx wrangler login
npm run deploy
```

Cloudflareが表示した `https://badminton-api-jp.<subdomain>.workers.dev` が公開URLです。これは形式例で、リポジトリ作成時点では未デプロイです。独自ドメインは公開後にWorkersのSettings → Domains & Routesから追加できます。

Workers BuildsでこのGitHubリポジトリを接続する場合、ルートディレクトリは `/`、ビルドコマンドは `npm run check`、デプロイコマンドは `npm run deploy` です。静的ファイルだけのPagesプロジェクトではAPIは動きません。

GitHub ActionsはCIを自動実行します。デプロイは `workflow_dispatch` の手動実行のみ。`production` environmentに `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を設定してください。

認証なしの公開APIですが、Cloudflareのプラン上限やサービス側の制限はあります。無制限・稼働保証はしません。必要に応じてCloudflare側でレート制御を設定してください。

## データ・貢献・ライセンス

- `content/venues.json`: 出典付き会場情報
- `content/authors.json`: コンテンツ投稿者
- `public/images/`: 許諾を確認した写真とオリジナル図
- [CONTRIBUTING.md](CONTRIBUTING.md): 会場・写真の追加方法
- コード: [MIT](LICENSE)
- このプロジェクトが作成した事実情報の編纂データ・コート図: [CC0 1.0](LICENSE-DATA.md)
- 写真投稿: 投稿者によるCC BY 4.0許諾が必要。写真ごとに投稿者をクレジットしてください。

出典サイトの文章・写真・ロゴの権利は各権利者に帰属します。このプロジェクトのライセンスは出典サイト全体には適用されません。
