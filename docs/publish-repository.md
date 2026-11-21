# Publicリポジトリを作成する

この作業環境のGitHub連携では `createRepository` が `Resource not accessible by integration` となったため、GitHub上のPublicリポジトリはまだ作成されていません。実装・テスト・Workers dry-run build・ローカルHTTP検証は完了しています。

GitHub CLIで自分のアカウントに認証済みの環境から実行してください。ZIPを展開した場合は、先に初回コミットを作ります。

```sh
cd badminton-api-jp
# ZIPには.gitが含まれないので、初期化します。
git init -b main
git add .
git commit -m "Build Japan badminton venue API for Cloudflare Workers"
# gh auth statusでアカウントとリポジトリ作成権限を確認してから実行
gh repo create nematatu/badminton-api-jp --public --source . --remote origin --push
```

既存リポジトリがある場合には作成コマンドを繰り返さず、そのリポジトリを使ってください。公開後、[Cloudflare公開手順](deploy.md)に進めます。
