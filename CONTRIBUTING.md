# データを追加する

1. `content/venues.json` に会場を追加します。`id` は一意な英小文字・数字・ハイフンにしてください。
2. 公式施設・自治体サイトで確認した情報だけを記録し、`sources` にURLと確認日（`YYYY-MM-DD`）を付けます。未来日はCIで拒否されます。都道府県は `東京都` など47都道府県の正式名称を使ってください。
3. 面数が未確認なら `courtCount: null`、写真がなければ `photos: []` にします。
4. `npm run check` を実行し、出典と変更理由を添えてPRを送ってください。

## 写真

自身が撮影し、施設の撮影条件や写っている人物の公開許諾を満たす写真だけを投稿してください。GPSなどのExif情報を除き、写真を配信できるHTTPS URLを用意します。`photos` の例:

```json
{
  "name": "court-001.jpg",
  "url": "https://example.com/court-001.jpg",
  "width": 1200,
  "height": 800,
  "authorId": "your-id",
  "license": "CC-BY-4.0"
}
```

`content/authors.json` に `id / name / url` を追加してください。PRにCC BY 4.0での配布を許諾する旨を明記します。第三者の写真の無断転載は受け付けません。

写真を利用するアプリは `/authors/:id` で投稿者を調べ、作者名・作者URL・CC BY 4.0へのリンクを表示してください。写真を変更した場合はその旨も明示します。投稿はコードがMIT、編纂データがCC0、写真がCC BY 4.0です。

不正なデータのエラーには `venues.0.prefecture` など、修正が必要な項目の位置が表示されます。ID重複、空の名前、存在しない写真投稿者も検出します。
