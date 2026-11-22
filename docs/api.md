# APIの利用例

以下のURLはローカル用です。公開後は `http://localhost:8787` を自分のWorkers URLに置き換えてください。

## 一覧とページング

```sh
curl --get http://localhost:8787/venues \
  --data-urlencode 'prefecture=東京都' \
  --data-urlencode 'perPage=1' \
  --data-urlencode 'pretty='
```

初期データでのレスポンス:

```json
{
  "venues": [
    {
      "id": "tokyo-metropolitan-main",
      "name": "東京体育館 メインアリーナ",
      "prefecture": "東京都",
      "city": "渋谷区",
      "courtCount": 16,
      "officialUrl": "https://tef.or.jp/tmg/arena/",
      "sources": [
        {
          "title": "東京体育館 メインアリーナ",
          "url": "https://tef.or.jp/tmg/arena/",
          "checkedAt": "2026-11-21"
        }
      ],
      "photos": [],
      "notes": "面数は施設の設置可能数です。個人利用・利用日・予約条件は公式サイトをご確認ください。"
    }
  ],
  "totalCount": 2,
  "pageInfo": {
    "currentPage": 1,
    "perPage": 1,
    "lastPage": 2,
    "prevPage": null,
    "nextPage": 2
  }
}
```

次のページは、同じ条件で `page=2` を付けて取得します。`nextPage: null` なら最後です。検索条件を変えたら `page=1` に戻してください。`totalCount` は絞り込み後の件数です。

| パラメータ | 指定方法 |
| --- | --- |
| `page` | 半角数字のみ。1〜100000、既定1 |
| `perPage` | 半角数字のみ。1〜100、既定10 |
| `prefecture` | 47都道府県の正式名称。例: `東京都`。未登録の都道府県は0件 |
| `q` | 名前・市区・都道府県・IDの部分一致。前後の空白を除去後100文字まで |
| `pretty` | 指定するとJSONを整形 |

同じパラメータを複数回指定すると400になります。数値の `1e2`、`0x10`、`2.0` は受け付けません。検索語はNFKCで正規化し、全角英数字・大文字小文字を区別しません。

0件なら `venues: []`、`lastPage: 1`。範囲外のページは空配列で、`prevPage` は存在する直前のページを指します。

## 詳細と投稿者

```sh
curl http://localhost:8787/venues/tokyo-metropolitan-main
curl http://localhost:8787/authors/badminton-api
```

それぞれ `{ "venue": { ... } }` と `{ "author": { ... } }` で返します。写真の `authorId` は投稿者詳細のIDに対応します。

## エラー

`/venues?page=1&page=2` はHTTP 400です。

```json
{
  "error": "Invalid query parameter.",
  "details": [
    { "field": "page", "message": "Provide this parameter only once." }
  ]
}
```

`details[].field` で入力項目を特定できます。`message` は表示用の説明です。存在しない会場・投稿者・パスには404と `{ "error": "…" }` を返します。クライアントではJSONを読む前に `response.ok` またはステータスコードを確認してください。

## キャッシュ

成功したGETは `Cache-Control: public, max-age=300` と `ETag` を返します。ブラウザなどのキャッシュで5分間再利用できます。`If-None-Match` にETagを送ると、同じ内容なら本文なしの304です。手動で304を扱う場合はJSONを読まず、保持しているデータを使います。

400・404などのエラーには `Cache-Control: no-store` を付けます。`?pretty` の有無で本文が異なるため、ETagも異なります。CORS対応で、ブラウザからETagを取得できます。
