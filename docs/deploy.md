# Cloudflare Workersデプロイ

## ローカルから

1. Node.js 22以上で `npm ci` と `npm run check` を実行します。
2. `npx wrangler login` で公開先のCloudflareアカウントにログインします。
3. 同アカウントに `badminton-api-jp` という別Workerが既にある場合、上書きを避けるため `wrangler.jsonc` の `name` を変更します。
4. `npm run deploy` を実行します。API・画面・画像が一緒に公開されます。
5. 表示されたURLで `/health`、`/venues?perPage=2`、`/openapi.json` とトップ画面を確認します。

`wrangler.jsonc` に秘密情報やアカウントIDを記録する必要はありません。デプロイ後の実URLはREADMEや利用側アプリに設定してください。画像URLはリクエスト元のoriginを使うため、独自ドメインにも追従します。

## Workers Builds

Cloudflare Dashboard → Workers & Pages → Worker作成 → Gitリポジトリの接続から、このPublicリポジトリを選びます。

- プロジェクトルート: `/`
- 本番ブランチ: `main`
- ビルド: `npm run check`
- デプロイ: `npm run deploy`

この方法では接続したブランチへのpushが公開を引き起こします。GitHub Actionsの手動デプロイとどちらを利用するか選んでください。

## GitHub Actionsの手動デプロイ

GitHub Settings → Environmentsで `production` を作成し、次のsecretsを登録します。

- `CLOUDFLARE_API_TOKEN`: 対象アカウントのWorkers編集とアカウント読み取りを許可したトークン。CloudflareのEdit Cloudflare Workersテンプレートを利用し、対象を絞ります。
- `CLOUDFLARE_ACCOUNT_ID`: 公開先アカウントID。

Actions → Deploy to Cloudflare → Run workflow。先に型検査・テスト・dry-run buildが通った場合のみデプロイします。secretsはファイルに書かず、ログへ出力しないでください。

公開後はCloudflare DashboardのObservabilityでエラーを確認できます。プランのリクエスト・CPU上限が適用されます。カスタムドメインやレート制御は利用状況に合わせて設定してください。

## 公開後のスモークテスト

```sh
npm run smoke -- https://YOUR-WORKER.workers.dev
```

静的アセット・CORS・API・GraphQL・404を実際のHTTPで確認します。URL引数を省略するとローカルの8787番ポートを対象にします。
