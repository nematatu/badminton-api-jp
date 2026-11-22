# GitHubで公開する

既存のGitHubリポジトリにpushする場合は、リモートURLを設定します。

```sh
git remote add origin https://github.com/nematatu/badminton-api-jp.git
git push -u origin main
```

既にoriginが設定されている場合は `git remote -v` で接続先を確認してください。

新規リポジトリ作成権限のあるGitHub CLIから作成する場合:

```sh
gh repo create nematatu/badminton-api-jp --public --source . --remote origin --push
```

Cloudflareへの公開は[デプロイ手順](deploy.md)を参照してください。
