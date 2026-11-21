# 会場・写真を追加する

国内のバドミントン会場情報と、権利を確認できる実写真を歓迎します。

## 会場

1. `content/venues.json` に既存形式でレコードを追加します。
2. `id` は一意な英小文字・数字・ハイフンにします。施設内でアリーナが異なる場合は別IDにできます。
3. `name / prefecture / city` を記録し、公式施設サイトや自治体サイトでバドミントン利用が確認できる出典を `sources` に追加します。`checkedAt` は実際に確認した日付です。
4. `courtCount` は設置可能面数。わからなければ `null`。料金・個人開放・空き状況は推測しません。
5. 写真がなければ `photos: []`、`illustrationId: "badminton-court"` を使います。
6. `npm ci && npm run check` を実行し、出典と変更理由を添えてPRを送ります。

## 写真

`public/images/<venue-id>/` にJPEG / PNG / WebPを置き、会場の `photos` に以下を追加します。

```json
{
  "name": "court-001.jpg",
  "path": "/images/venue-id/court-001.jpg",
  "width": 1200,
  "height": 800,
  "authorId": "your-id",
  "license": "CC-BY-4.0"
}
```

`content/authors.json` に `id / name / url` を追加してください。写真は目安として長辺1600px以下、1枚1MB程度までに最適化し、GPSなどのExif情報を除去します。`width / height` は実寸を指定します。

PRに、自分が撮影した写真であり、施設の撮影・公開条件を満たし、写っている人物の公開許諾を取得したこと、CC BY 4.0での配布を許諾することを明記してください。第三者の画像の無断転載は受け付けません。

データ・自作図の投稿はCC0 1.0、写真はCC BY 4.0、コードはMITで提供されるものとします。APIを使うアプリでは写真ごとの `authorId` を `/authors/:id` で引き、作者名・作者URL・CC BY 4.0ライセンスへのリンクを表示し、写真を変更した場合はその旨を明示してください。
