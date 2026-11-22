# Cloudflareに公開する

## ローカルから

```sh
npm ci
npm run check
npm run test:worker
npx wrangler login
npm run deploy
```

表示された `https://badminton-api-jp.<subdomain>.workers.dev` が公開URLです。DBや静的アセットの設定は不要です。同名の別Workerがある場合は `wrangler.jsonc` の `name` を変更してください。

## Workers Builds

Cloudflare DashboardからこのGitHubリポジトリをWorkerに接続します。

- 本番ブランチ: `main`
- ルート: `/`
- ビルドコマンド: `npm run check`
- デプロイコマンド: `npm run deploy`

## GitHub Actions

`production` environmentのsecretsに `CLOUDFLARE_API_TOKEN`（Workers編集権限）と `CLOUDFLARE_ACCOUNT_ID` を設定します。Actionsの「Deploy to Cloudflare」を手動実行すると、型・データ検証・テスト・ビルド・Workers起動確認が成功した後にデプロイします。

## 公開後の確認

```sh
npm run smoke -- https://YOUR-WORKER.workers.dev
```

Cloudflareのプラン上限が適用されます。独自ドメインやレート制御は必要に応じてCloudflare側で設定してください。
