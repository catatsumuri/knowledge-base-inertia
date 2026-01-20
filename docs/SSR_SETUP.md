# Inertia.js SSR セットアップガイド

## 概要

このドキュメントは、Inertia.js で SSR（Server-Side Rendering）を有効化し、OGP/Twitter Card メタタグを出力するための設定手順をまとめたものです。

## 目的

- SNS（Twitter、Facebook、LINE など）でリンクをシェアした際に、タイトル・説明・画像を含むリッチプレビューを表示する
- SEO 対策として、初回ロード時に完全な HTML を返す

## 前提条件

- Laravel 12 + Inertia.js v2
- Node.js がインストールされていること
- プロダクション環境で systemd が利用可能であること

## 環境変数の設定

`.env` ファイルに以下を追加：

```bash
# Inertia SSR Configuration
INERTIA_SSR_ENABLED=true
INERTIA_SSR_URL=http://127.0.0.1:13714
```

`.env.example` にも同様に追加して、他の開発者が設定できるようにする。

## ビルド設定

`vite.config.ts` に SSR エントリーポイントを設定（既に設定済み）：

```typescript
laravel({
    input: ['resources/css/app.css', 'resources/js/app.tsx'],
    ssr: 'resources/js/ssr.tsx',
    refresh: true,
}),
```

## ビルドコマンド

### ローカル開発環境

```bash
# SSR + クライアントビルド
./vendor/bin/sail npm run build:ssr

# SSR サーバーを起動（開発用）
./vendor/bin/sail node bootstrap/ssr/ssr.js
```

### プロダクション環境

**推奨**: メモリが限られたサーバー（1GB 以下）では、ローカルでビルドして rsync で転送する。

```bash
# ローカルでビルド
./vendor/bin/sail npm run build:ssr

# プロダクションに転送
rsync -avz --delete bootstrap/ssr/ user@server:/var/www/app/bootstrap/ssr/
rsync -avz --delete public/build/ user@server:/var/www/app/public/build/

# プロダクションサーバーで権限を修正
sudo chown -R www-data:www-data bootstrap/ssr/
sudo chown -R www-data:www-data public/build/
```

プロダクションサーバーで直接ビルドする場合（非推奨）：

```bash
npm run build:ssr
```

## systemd サービス設定（プロダクション）

`/etc/systemd/system/inertia-ssr.service` を作成：

```ini
[Unit]
Description=Inertia SSR Server
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/inertia-docs-ja
ExecStart=/usr/bin/node /var/www/inertia-docs-ja/bootstrap/ssr/ssr.js
Restart=always
RestartSec=3
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

サービスの有効化と起動：

```bash
sudo systemctl daemon-reload
sudo systemctl enable inertia-ssr
sudo systemctl start inertia-ssr
sudo systemctl status inertia-ssr
```

## デプロイ手順

1. **コード変更をコミット**
   ```bash
   git add .
   git commit -m "変更内容"
   git push
   ```

2. **ローカルでビルド**
   ```bash
   ./vendor/bin/sail npm run build:ssr
   ```

3. **プロダクションサーバーでコードを更新**
   ```bash
   cd /var/www/inertia-docs-ja
   git pull
   ```

4. **ビルド成果物を転送**（ローカルから）
   ```bash
   rsync -avz --delete bootstrap/ssr/ user@server:/var/www/inertia-docs-ja/bootstrap/ssr/
   rsync -avz --delete public/build/ user@server:/var/www/inertia-docs-ja/public/build/
   ```

5. **プロダクションサーバーで設定**
   ```bash
   # 権限修正
   sudo chown -R www-data:www-data bootstrap/ssr/
   sudo chown -R www-data:www-data public/build/

   # Laravel キャッシュクリア
   php artisan config:clear
   php artisan cache:clear
   php artisan config:cache

   # SSR サービス再起動
   sudo systemctl restart inertia-ssr

   # Apache 再起動（必要に応じて）
   sudo systemctl restart apache2
   ```

6. **確認**
   ```bash
   # SSR サービスの状態確認
   sudo systemctl status inertia-ssr

   # OGP メタタグの出力確認
   curl -s http://localhost/pages/inertia-ja-docs/getting-started/index | grep -E '<meta (property="og:|name="twitter:)'
   ```

## トラブルシューティング

### OGP メタタグが出力されない

**原因**: Laravel キャッシュが古い、または SSR サーバーが起動していない

**解決策**:
```bash
php artisan config:clear
php artisan cache:clear
php artisan config:cache
sudo systemctl restart inertia-ssr
sudo systemctl restart apache2
```

### SSR サーバーのエラーログ確認

```bash
sudo journalctl -u inertia-ssr -n 100 --no-pager
sudo journalctl -u inertia-ssr -f  # リアルタイム監視
```

### メモリ不足エラー

**原因**: プロダクションサーバーのメモリが不足している

**解決策**: ローカルでビルドして rsync で転送する（推奨方法）

### モジュール解決エラー

**例**: `Cannot find module 'react-syntax-highlighter'`

**原因**: SSR で利用できないパッケージを使用している

**解決策**:
- パッケージを SSR 互換のものに置き換える
- 動的インポート (`React.lazy`) でクライアント側でのみ読み込む

### CSS インポートエラー

**例**: `Unknown file extension ".css"`

**原因**: Node.js の ESM モードで CSS ファイルを直接インポートできない

**解決策**: パッケージを動的インポートに変更するか、CSS を含まないバージョンを使用

## SSR 互換性の注意点

### 避けるべきパターン

1. **SSR で実行できないブラウザ API の使用**
   - `window`, `document`, `localStorage` など
   - 解決: `typeof window !== 'undefined'` でガード

2. **CSS ファイルを直接インポートする外部パッケージ**
   - 例: `react-tweet`
   - 解決: 動的インポートに変更

3. **巨大なバンドルサイズ**
   - SSR サーバーのメモリを圧迫する
   - 解決: コード分割、dynamic import の活用

### 推奨パターン

1. **クライアント専用コンポーネントの作成**
   ```tsx
   const ClientOnlyComponent = React.lazy(() => import('./ClientComponent'));

   function MyComponent() {
       const [isClient, setIsClient] = useState(false);

       useEffect(() => {
           setIsClient(true);
       }, []);

       if (!isClient) {
           return <div>Loading...</div>;
       }

       return (
           <Suspense fallback={<div>Loading...</div>}>
               <ClientOnlyComponent />
           </Suspense>
       );
   }
   ```

2. **環境判定**
   ```tsx
   if (typeof window === 'undefined') {
       // SSR 環境
   } else {
       // クライアント環境
   }
   ```

## 参考リンク

- [Inertia.js SSR Documentation](https://inertiajs.com/server-side-rendering)
- [Laravel Vite Plugin](https://laravel.com/docs/vite)
- [React Server Components (参考)](https://react.dev/reference/react/use-server)

## 変更履歴

- 2026-01-20: 初版作成
  - SSR 有効化
  - react-syntax-highlighter を PrismJS に置き換え
  - react-tweet を動的インポートに変更
  - ESLint/TypeScript エラー修正
