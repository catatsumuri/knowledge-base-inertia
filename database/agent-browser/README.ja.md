# agent-browser

AIエージェント向けのヘッドレスブラウザ自動化CLI。高速なRust製CLIで、Node.jsフォールバック付き。

## インストール

### グローバルインストール（推奨）

ネイティブRustバイナリをインストールして最大のパフォーマンスを実現：

```bash
npm install -g agent-browser
agent-browser install  # Chromium をダウンロード
```

これは最速のオプションです — コマンドはネイティブRust CLIを通じて直接実行され、サブミリ秒レベルのパースオーバーヘッドで動作します。

### クイックスタート（インストール不要）

グローバルインストールせずに試したい場合は `npx` で直接実行：

```bash
npx agent-browser install   # Chromium をダウンロード（初回のみ）
npx agent-browser open example.com
```

> **注意:** `npx` はRust CLIに到達する前にNode.jsを経由するため、グローバルインストールよりも体感的に遅くなります。日常的に使う場合はグローバルインストールを推奨します。

### プロジェクトインストール（ローカル依存）

`package.json` にバージョンを固定したいプロジェクト向け：

```bash
npm install agent-browser
npx agent-browser install
```

その後は `npx` または `package.json` のスクリプト経由で使用：

```bash
npx agent-browser open example.com
```

### Homebrew（macOS）

```bash
brew install agent-browser
agent-browser install  # Chromium をダウンロード
```

### ソースから

```bash
git clone https://github.com/vercel-labs/agent-browser
cd agent-browser
pnpm install
pnpm build
pnpm build:native   # Rust が必要 (https://rustup.rs)
pnpm link --global  # agent-browser をグローバルで利用可能にする
agent-browser install
```

### Linux の依存関係

Linuxではシステム依存関係をインストール：

```bash
agent-browser install --with-deps
# または手動: npx playwright install-deps chromium
```

## クイックスタート

```bash
agent-browser open example.com
agent-browser snapshot                    # 参照付きアクセシビリティツリーを取得
agent-browser click @e2                   # snapshot の参照でクリック
agent-browser fill @e3 "test@example.com" # 参照で入力
agent-browser get text @e1                # 参照でテキスト取得
agent-browser screenshot page.png
agent-browser close
```

### 従来のセレクタ（こちらもサポート）

```bash
agent-browser click "#submit"
agent-browser fill "#email" "test@example.com"
agent-browser find role button click --name "Submit"
```

## コマンド

### コアコマンド

```bash
agent-browser open <url>              # URLへ移動（別名: goto, navigate）
agent-browser click <sel>             # 要素をクリック（新しいタブで開くには --new-tab）
agent-browser dblclick <sel>          # 要素をダブルクリック
agent-browser focus <sel>             # 要素にフォーカス
agent-browser type <sel> <text>       # 要素に入力
agent-browser fill <sel> <text>       # クリアして入力
agent-browser press <key>             # キーを押す（Enter, Tab, Control+a）（別名: key）
agent-browser keyboard type <text>    # 実際のキーストロークで入力（セレクタなし、現在のフォーカス）
agent-browser keyboard inserttext <text>  # キーイベントなしでテキスト挿入（セレクタなし）
agent-browser keydown <key>           # キーを押し続ける
agent-browser keyup <key>             # キーを離す
agent-browser hover <sel>             # 要素にホバー
agent-browser select <sel> <val>      # ドロップダウンの項目を選択
agent-browser check <sel>             # チェックボックスをオン
agent-browser uncheck <sel>           # チェックボックスをオフ
agent-browser scroll <dir> [px]       # スクロール（up/down/left/right）
agent-browser scrollintoview <sel>    # 要素が見える位置までスクロール（別名: scrollinto）
agent-browser drag <src> <tgt>        # ドラッグ＆ドロップ
agent-browser upload <sel> <files>    # ファイルをアップロード
agent-browser screenshot [path]       # スクリーンショット取得（全ページは --full、パス未指定なら一時ディレクトリに保存）
agent-browser screenshot --annotate   # 番号付き要素ラベル付き注釈スクリーンショット
agent-browser pdf <path>              # PDFとして保存
agent-browser snapshot                # 参照付きアクセシビリティツリー（AI向けに最適）
agent-browser eval <js>               # JavaScript実行（base64は -b、パイプ入力は --stdin）
agent-browser connect <port>          # CDP経由でブラウザ接続
agent-browser close                   # ブラウザを閉じる（別名: quit, exit）
```

### 情報取得

```bash
agent-browser get text <sel>          # テキスト内容を取得
agent-browser get html <sel>          # innerHTMLを取得
agent-browser get value <sel>         # 入力値を取得
agent-browser get attr <sel> <attr>   # 属性を取得
agent-browser get title               # ページタイトルを取得
agent-browser get url                 # 現在のURLを取得
agent-browser get count <sel>         # 一致する要素数を取得
agent-browser get box <sel>           # バウンディングボックスを取得
agent-browser get styles <sel>        # 計算済みスタイルを取得
```

### 状態確認

```bash
agent-browser is visible <sel>        # 表示されているか確認
agent-browser is enabled <sel>        # 有効か確認
agent-browser is checked <sel>        # チェックされているか確認
```

### 要素検索（セマンティックロケータ）

```bash
agent-browser find role <role> <action> [value]       # ARIAロールで検索
agent-browser find text <text> <action>               # テキスト内容で検索
agent-browser find label <label> <action> [value]     # ラベルで検索
agent-browser find placeholder <ph> <action> [value]  # プレースホルダで検索
agent-browser find alt <text> <action>                # altテキストで検索
agent-browser find title <text> <action>              # title属性で検索
agent-browser find testid <id> <action> [value]       # data-testidで検索
agent-browser find first <sel> <action> [value]       # 最初の一致
agent-browser find last <sel> <action> [value]        # 最後の一致
agent-browser find nth <n> <sel> <action> [value]     # N番目の一致
```

**アクション:** `click`, `fill`, `type`, `hover`, `focus`, `check`, `uncheck`, `text`

**オプション:** `--name <name>`（アクセシブル名でロールを絞り込み）、`--exact`（完全一致を要求）

**例:**
```bash
agent-browser find role button click --name "Submit"
agent-browser find text "Sign In" click
agent-browser find label "Email" fill "test@test.com"
agent-browser find first ".item" click
agent-browser find nth 2 "a" text
```

### 待機

```bash
agent-browser wait <selector>         # 要素が表示されるまで待機
agent-browser wait <ms>               # 指定時間待機（ミリ秒）
agent-browser wait --text "Welcome"   # テキスト出現まで待機
agent-browser wait --url "**/dash"    # URLパターン一致まで待機
agent-browser wait --load networkidle # 読み込み状態まで待機
agent-browser wait --fn "window.ready === true"  # JS条件成立まで待機
```

**読み込み状態:** `load`, `domcontentloaded`, `networkidle`

### マウス操作

```bash
agent-browser mouse move <x> <y>      # マウス移動
agent-browser mouse down [button]     # ボタン押下（left/right/middle）
agent-browser mouse up [button]       # ボタン解放
agent-browser mouse wheel <dy> [dx]   # ホイールスクロール
```

### ブラウザ設定

```bash
agent-browser set viewport <w> <h>    # ビューポートサイズ設定
agent-browser set device <name>       # デバイスエミュレーション（"iPhone 14"）
agent-browser set geo <lat> <lng>     # 位置情報設定
agent-browser set offline [on|off]    # オフラインモード切替
agent-browser set headers <json>      # 追加HTTPヘッダー
agent-browser set credentials <u> <p> # HTTPベーシック認証
agent-browser set media [dark|light]  # カラースキームエミュレーション
```

### Cookie とストレージ

```bash
agent-browser cookies                 # すべてのCookieを取得
agent-browser cookies set <name> <val> # Cookieを設定
agent-browser cookies clear           # Cookieを削除

agent-browser storage local           # すべてのlocalStorage取得
agent-browser storage local <key>     # 特定キー取得
agent-browser storage local set <k> <v>  # 値を設定
agent-browser storage local clear     # すべて削除

agent-browser storage session         # sessionStorageも同様
```

### ネットワーク

```bash
agent-browser network route <url>              # リクエストをインターセプト
agent-browser network route <url> --abort      # リクエストをブロック
agent-browser network route <url> --body <json>  # モックレスポンス
agent-browser network unroute [url]            # ルートを削除
agent-browser network requests                 # 追跡されたリクエストを表示
agent-browser network requests --filter api    # リクエストをフィルタ
```

### タブとウィンドウ

```bash
agent-browser tab                     # タブ一覧
agent-browser tab new [url]           # 新しいタブ（URLを指定可）
agent-browser tab <n>                 # タブnに切り替え
agent-browser tab close [n]           # タブを閉じる
agent-browser window new              # 新しいウィンドウ
```

### フレーム

```bash
agent-browser frame <sel>             # iframeに切り替え
agent-browser frame main              # メインフレームに戻る
```

### ダイアログ

```bash
agent-browser dialog accept [text]    # 承認（任意でプロンプトテキスト付き）
agent-browser dialog dismiss          # キャンセル
```

### 差分

```bash
agent-browser diff snapshot                              # 現在と前回のスナップショットを比較
agent-browser diff snapshot --baseline before.txt        # 現在と保存済みスナップショットファイルを比較
agent-browser diff snapshot --selector "#main" --compact # 指定範囲のスナップショット差分
agent-browser diff screenshot --baseline before.png      # ベースラインとのピクセル単位の視覚差分
agent-browser diff screenshot --baseline b.png -o d.png  # 差分画像を指定パスに保存
agent-browser diff screenshot --baseline b.png -t 0.2    # 色のしきい値を調整（0-1）
agent-browser diff url https://v1.com https://v2.com     # 2つのURLを比較（スナップショット差分）
agent-browser diff url https://v1.com https://v2.com --screenshot  # 視覚差分も実行
agent-browser diff url https://v1.com https://v2.com --wait-until networkidle  # カスタム待機戦略
agent-browser diff url https://v1.com https://v2.com --selector "#main"  # 要素に限定
```

### デバッグ

```bash
agent-browser trace start [path]      # トレース記録を開始
agent-browser trace stop [path]       # 停止してトレースを保存
agent-browser profiler start          # Chrome DevToolsのプロファイリングを開始
agent-browser profiler stop [path]    # 停止してプロファイルを保存（.json）
agent-browser console                 # コンソールメッセージを表示（log, error, warn, info）
agent-browser console --clear         # コンソールをクリア
agent-browser errors                  # ページエラーを表示（未捕捉のJavaScript例外）
agent-browser errors --clear          # エラーをクリア
agent-browser highlight <sel>         # 要素をハイライト
agent-browser state save <path>       # 認証状態を保存
agent-browser state load <path>       # 認証状態を読み込み
agent-browser state list              # 保存された状態ファイル一覧
agent-browser state show <file>       # 状態の概要を表示
agent-browser state rename <old> <new> # 状態ファイル名を変更
agent-browser state clear [name]      # セッションの状態をクリア
agent-browser state clear --all       # すべての保存状態をクリア
agent-browser state clean --older-than <days>  # 古い状態を削除
```

### ナビゲーション

```bash
agent-browser back                    # 戻る
agent-browser forward                 # 進む
agent-browser reload                  # ページを再読み込み
```

### セットアップ

```bash
agent-browser install                 # Chromiumブラウザをダウンロード
agent-browser install --with-deps     # システム依存関係もインストール（Linux）
```

## セッション

複数の分離されたブラウザインスタンスを実行します：

```bash
# Different sessions
agent-browser --session agent1 open site-a.com
agent-browser --session agent2 open site-b.com

# Or via environment variable
AGENT_BROWSER_SESSION=agent1 agent-browser click "#btn"

# List active sessions
agent-browser session list
# Output:
# Active sessions:
# -> default
#    agent1

# Show current session
agent-browser session
```

各セッションはそれぞれ独自のものを持ちます：
- ブラウザインスタンス  
- Cookie とストレージ  
- ナビゲーション履歴  
- 認証状態  

## 永続プロファイル

デフォルトでは、ブラウザの状態（Cookie、localStorage、ログインセッション）は一時的で、ブラウザを閉じると失われます。`--profile` を使用すると、ブラウザ再起動後も状態を保持できます：

```bash
# Use a persistent profile directory
agent-browser --profile ~/.myapp-profile open myapp.com

# Login once, then reuse the authenticated session
agent-browser --profile ~/.myapp-profile open myapp.com/dashboard

# Or via environment variable
AGENT_BROWSER_PROFILE=~/.myapp-profile agent-browser open myapp.com
```

プロファイルディレクトリには次が保存されます：
- Cookie と localStorage  
- IndexedDB データ  
- Service Worker  
- ブラウザキャッシュ  
- ログインセッション  

**ヒント**：プロジェクトごとに異なるプロファイルパスを使用すると、ブラウザ状態を分離して保てます。

## セッション永続化

または、`--session-name` を使用して、ブラウザ再起動後も Cookie と localStorage を自動的に保存・復元できます：

```bash
# Auto-save/load state for "twitter" session
agent-browser --session-name twitter open twitter.com

# Login once, then state persists automatically
# State files stored in ~/.agent-browser/sessions/

# Or via environment variable
export AGENT_BROWSER_SESSION_NAME=twitter
agent-browser open twitter.com
```

### 状態の暗号化

保存されたセッションデータを AES-256-GCM で保存時に暗号化できます：

```bash
# Generate key: openssl rand -hex 32
export AGENT_BROWSER_ENCRYPTION_KEY=<64-char-hex-key>

# State files are now encrypted automatically
agent-browser --session-name secure open example.com
```

| 変数 | 説明 |
|------|------|
| `AGENT_BROWSER_SESSION_NAME` | 自動保存／読み込みされる状態の永続化名 |
| `AGENT_BROWSER_ENCRYPTION_KEY` | AES-256-GCM 暗号化用の 64 文字の hex キー |
| `AGENT_BROWSER_STATE_EXPIRE_DAYS` | N 日より古い状態を自動削除（デフォルト: 30） |

## スナップショットオプション

`snapshot` コマンドは、出力サイズを減らすためのフィルタリングをサポートしています：

```bash
agent-browser snapshot                    # Full accessibility tree
agent-browser snapshot -i                 # Interactive elements only (buttons, inputs, links)
agent-browser snapshot -i -C              # Include cursor-interactive elements (divs with onclick, etc.)
agent-browser snapshot -c                 # Compact (remove empty structural elements)
agent-browser snapshot -d 3               # Limit depth to 3 levels
agent-browser snapshot -s "#main"         # Scope to CSS selector
agent-browser snapshot -i -c -d 5         # Combine options
```

| オプション | 説明 |
|------------|------|
| `-i, --interactive` | インタラクティブ要素のみ表示（ボタン、リンク、入力欄） |
| `-C, --cursor` | カーソル操作可能要素を含める（cursor:pointer、onclick、tabindex） |
| `-c, --compact` | 空の構造要素を削除 |
| `-d, --depth <n>` | ツリーの深さを制限 |
| `-s, --selector <sel>` | CSS セレクタにスコープを限定 |

`-C` フラグは、標準のボタン／リンクの代わりにカスタムクリック要素（div、span）を使うモダンな Web アプリで有用です。

## 注釈付きスクリーンショット

`--annotate` フラグは、スクリーンショット上のインタラクティブ要素に番号付きラベルを重ねます。各ラベル `[N]` は ref `@eN` に対応するため、視覚ベースとテキストベースのワークフローの両方で同じ参照が使えます。

```bash
agent-browser screenshot --annotate
# -> Screenshot saved to /tmp/screenshot-2026-02-17T12-00-00-abc123.png
#    [1] @e1 button "Submit"
#    [2] @e2 link "Home"
#    [3] @e3 textbox "Email"
```

注釈付きスクリーンショットの後は参照がキャッシュされるため、すぐに要素へ操作できます：

```bash
agent-browser screenshot --annotate ./page.png
agent-browser click @e2     # Click the "Home" link labeled [2]
```

これは、視覚レイアウト、ラベルのないアイコンボタン、canvas 要素、あるいはテキストのアクセシビリティツリーでは取得できない視覚状態について推論できるマルチモーダル AI モデルに有用です。

## オプション

| オプション | 説明 |
|--------|-------------|
| `--session <name>` | 分離されたセッションを使用（または `AGENT_BROWSER_SESSION` 環境変数） |
| `--session-name <name>` | セッション状態を自動保存／復元（または `AGENT_BROWSER_SESSION_NAME` 環境変数） |
| `--profile <path>` | 永続的なブラウザープロファイルディレクトリ（または `AGENT_BROWSER_PROFILE` 環境変数） |
| `--state <path>` | JSON ファイルからストレージ状態を読み込み（または `AGENT_BROWSER_STATE` 環境変数） |
| `--headers <json>` | URL のオリジンにスコープされた HTTP ヘッダーを設定 |
| `--executable-path <path>` | カスタムブラウザー実行ファイル（または `AGENT_BROWSER_EXECUTABLE_PATH` 環境変数） |
| `--extension <path>` | ブラウザー拡張を読み込み（繰り返し指定可；または `AGENT_BROWSER_EXTENSIONS` 環境変数） |
| `--args <args>` | ブラウザー起動引数（カンマまたは改行区切り；または `AGENT_BROWSER_ARGS` 環境変数） |
| `--user-agent <ua>` | カスタム User-Agent 文字列（または `AGENT_BROWSER_USER_AGENT` 環境変数） |
| `--proxy <url>` | 認証付きも指定可能なプロキシサーバー URL（または `AGENT_BROWSER_PROXY` 環境変数） |
| `--proxy-bypass <hosts>` | プロキシをバイパスするホスト（または `AGENT_BROWSER_PROXY_BYPASS` 環境変数） |
| `--ignore-https-errors` | HTTPS 証明書エラーを無視（自己署名証明書に有用） |
| `--allow-file-access` | file:// URL からローカルファイルへのアクセスを許可（Chromium のみ） |
| `-p, --provider <name>` | クラウドブラウザープロバイダー（または `AGENT_BROWSER_PROVIDER` 環境変数） |
| `--device <name>` | iOS デバイス名（例: "iPhone 15 Pro"）（または `AGENT_BROWSER_IOS_DEVICE` 環境変数） |
| `--json` | JSON 出力（エージェント向け） |
| `--full, -f` | ページ全体のスクリーンショット |
| `--annotate` | 番号付き要素ラベル付きの注釈スクリーンショット（または `AGENT_BROWSER_ANNOTATE` 環境変数） |
| `--headed` | ブラウザーウィンドウを表示（ヘッドレスではない） |
| `--cdp <port\|url>` | Chrome DevTools Protocol 経由で接続（ポートまたは WebSocket URL） |
| `--auto-connect` | 実行中の Chrome を自動検出して接続（または `AGENT_BROWSER_AUTO_CONNECT` 環境変数） |
| `--color-scheme <scheme>` | カラースキーム: `dark`, `light`, `no-preference`（または `AGENT_BROWSER_COLOR_SCHEME` 環境変数） |
| `--config <path>` | カスタム設定ファイルを使用（または `AGENT_BROWSER_CONFIG` 環境変数） |
| `--debug` | デバッグ出力 |

## 設定

毎回フラグを繰り返し指定する代わりに、永続的なデフォルトを設定するため `agent-browser.json` ファイルを作成します。

**場所（優先度の低い順から高い順）：**

1. `~/.agent-browser/config.json` -- ユーザーレベルのデフォルト  
2. `./agent-browser.json` -- プロジェクトレベルの上書き（作業ディレクトリ内）  
3. `AGENT_BROWSER_*` 環境変数が設定ファイルの値を上書き  
4. CLI フラグがすべてを上書き  

**`agent-browser.json` の例：**

```json
{
  "headed": true,
  "proxy": "http://localhost:8080",
  "profile": "./browser-data",
  "userAgent": "my-agent/1.0",
  "ignoreHttpsErrors": true
}
```

デフォルトの代わりに特定の設定ファイルを読み込むには、`--config <path>` または `AGENT_BROWSER_CONFIG` を使用します:

```bash
agent-browser --config ./ci-config.json open example.com
AGENT_BROWSER_CONFIG=./ci-config.json agent-browser open example.com
```

上記の表にあるすべてのオプションは、設定ファイル内でキャメルケースのキーとして指定できます（例: `--executable-path` は `"executablePath"`、`--proxy-bypass` は `"proxyBypass"` になります）。将来の互換性のため、未知のキーは無視されます。

ブールフラグは、設定を上書きするために任意で `true`/`false` 値を受け付けます。たとえば `--headed false` は設定の `"headed": true` を無効にします。単独の `--headed` は `--headed true` と同じ意味です。

自動検出された設定ファイルが存在しない場合は静かに無視されます。`--config <path>` が存在しない、または無効なファイルを指している場合、agent-browser はエラーで終了します。ユーザー設定とプロジェクト設定の拡張機能は置き換えではなくマージ（連結）されます。

> **ヒント:** プロジェクトレベルの `agent-browser.json` に環境依存の値（パス、プロキシなど）が含まれている場合は、`.gitignore` に追加することを検討してください。

## デフォルトタイムアウト

標準操作（クリック、待機、入力など）の Playwright のデフォルトタイムアウトは 25 秒です。これは CLI の 30 秒 IPC 読み取りタイムアウトより短く設定されており、CLI が EAGAIN でタイムアウトする代わりに Playwright が適切なエラーを返すようにするためです。

環境変数でデフォルトタイムアウトを上書きできます:

```bash
# 遅いページ用に長めのタイムアウトを設定（ミリ秒）
export AGENT_BROWSER_DEFAULT_TIMEOUT=45000
```

> **注意:** これを 30000（30 秒）より大きく設定すると、遅い操作で CLI の読み取りタイムアウトが先に切れるため、EAGAIN エラーが発生する可能性があります。CLI は一時的なエラーを自動再試行しますが、応答時間は長くなります。

| 変数 | 説明 |
|----------|-------------|
| `AGENT_BROWSER_DEFAULT_TIMEOUT` | デフォルトの Playwright タイムアウト（ミリ秒）（既定: 25000） |

## セレクター

### Refs（AI向け・推奨）

Refs はスナップショットから決定的に要素を選択します：

```bash
# 1. refs付きスナップショットを取得
agent-browser snapshot
# 出力:
# - 見出し "Example Domain" [ref=e1] [level=1]
# - ボタン "Submit" [ref=e2]
# - テキストボックス "Email" [ref=e3]
# - リンク "Learn more" [ref=e4]

# 2. refs を使って操作
agent-browser click @e2                   # ボタンをクリック
agent-browser fill @e3 "test@example.com" # テキストボックスに入力
agent-browser get text @e1                # 見出しテキストを取得
agent-browser hover @e4                   # リンクにホバー
```

**なぜ refs を使うのか？**
- **決定的**: ref はスナップショット内の正確な要素を指す
- **高速**: DOM の再クエリが不要
- **AIフレンドリー**: スナップショット＋ref のワークフローは LLM に最適

### CSS セレクター

```bash
agent-browser click "#id"
agent-browser click ".class"
agent-browser click "div > button"
```

### テキスト & XPath

```bash
agent-browser click "text=Submit"
agent-browser click "xpath=//button"
```

### セマンティックロケーター

```bash
agent-browser find role button click --name "Submit"
agent-browser find label "Email" fill "test@test.com"
```

## エージェントモード

機械可読な出力には `--json` を使用：

```bash
agent-browser snapshot --json
# 戻り値: {"success":true,"data":{"snapshot":"...","refs":{"e1":{"role":"heading","name":"Title"},...}}}

agent-browser get text @e1 --json
agent-browser is visible @e2 --json
```

### 最適なAIワークフロー

```bash
# 1. ナビゲートしてスナップショット取得
agent-browser open example.com
agent-browser snapshot -i --json   # AI がツリーと refs を解析

# 2. AI がスナップショットから対象 ref を特定
# 3. refs を使って操作を実行
agent-browser click @e2
agent-browser fill @e3 "input text"

# 4. ページが変わった場合は新しいスナップショット取得
agent-browser snapshot -i --json
```

### コマンド連結

コマンドは単一のシェル呼び出しで `&&` を使って連結できます。ブラウザはバックグラウンドデーモンで維持されるため、連結は安全でより効率的です：

```bash
# 開く→ロード待機→スナップショットを1回で実行
agent-browser open example.com && agent-browser wait --load networkidle && agent-browser snapshot -i

# 複数操作を連結
agent-browser fill @e1 "user@example.com" && agent-browser fill @e2 "pass" && agent-browser click @e3

# ナビゲートしてスクリーンショット
agent-browser open example.com && agent-browser wait --load networkidle && agent-browser screenshot page.png
```

中間出力が不要な場合は `&&` を使用します。出力を先に解析する必要がある場合（例：操作前に refs を見つけるためのスナップショット取得）は別々に実行します。

## ヘッデッドモード

デバッグのためブラウザウィンドウを表示：

```bash
agent-browser open example.com --headed
```

これによりヘッドレスではなく可視ブラウザウィンドウが開きます。

## 認証済みセッション

特定オリジンに HTTP ヘッダーを設定するには `--headers` を使用し、ログインフローなしで認証を有効化できます：

```bash
# ヘッダーは api.example.com のみに適用される
agent-browser open api.example.com --headers '{"Authorization": "Bearer <token>"}'

# api.example.com へのリクエストには認証ヘッダーが含まれる
agent-browser snapshot -i --json
agent-browser click @e2

# 別ドメインへ移動 - ヘッダーは送信されない（安全！）
agent-browser open other-site.com
```

これは次の用途に便利です：
- **ログインフローのスキップ** - UI ではなくヘッダーで認証
- **ユーザー切り替え** - 異なる認証トークンで新規セッション開始
- **API テスト** - 保護されたエンドポイントへ直接アクセス
- **セキュリティ** - ヘッダーはオリジンに限定され、他ドメインへ漏れない

複数オリジンにヘッダーを設定する場合は、それぞれの `open` コマンドで `--headers` を使用します：

```bash
agent-browser open api.example.com --headers '{"Authorization": "Bearer token1"}'
agent-browser open api.acme.com --headers '{"Authorization": "Bearer token2"}'
```

グローバルヘッダー（全ドメイン）には `set headers` を使用：

```bash
agent-browser set headers '{"X-Custom-Header": "value"}'
```

## カスタムブラウザ実行ファイル

バンドルされた Chromium の代わりにカスタムのブラウザ実行ファイルを使用します。これは次のような場合に便利です:
- **サーバーレスデプロイ**: `@sparticuz/chromium` のような軽量 Chromium ビルドを使用（約50MB vs 約684MB）
- **システムブラウザ**: 既存の Chrome / Chromium インストールを使用
- **カスタムビルド**: 変更されたブラウザビルドを使用

### CLI 使用方法

```bash
# Via flag
agent-browser --executable-path /path/to/chromium open example.com

# Via environment variable
AGENT_BROWSER_EXECUTABLE_PATH=/path/to/chromium agent-browser open example.com
```

### サーバーレス例（Vercel / AWS Lambda）

```typescript
import chromium from '@sparticuz/chromium';
import { BrowserManager } from 'agent-browser';

export async function handler() {
  const browser = new BrowserManager();
  await browser.launch({
    executablePath: await chromium.executablePath(),
    headless: true,
  });
  // ... use browser
}
```

## ローカルファイル

`file://` URL を使用してローカルファイル（PDF、HTML など）を開いて操作できます:

```bash
# Enable file access (required for JavaScript to access local files)
agent-browser --allow-file-access open file:///path/to/document.pdf
agent-browser --allow-file-access open file:///path/to/page.html

# Take screenshot of a local PDF
agent-browser --allow-file-access open file:///Users/me/report.pdf
agent-browser screenshot report.png
```

`--allow-file-access` フラグは、`file://` URL に次のことを許可する Chromium フラグ（`--allow-file-access-from-files`, `--allow-file-access`）を追加します:
- ローカルファイルの読み込みとレンダリング
- JavaScript（XHR、fetch）経由で他のローカルファイルへアクセス
- ローカルリソース（画像、スクリプト、スタイルシート）の読み込み

**注意:** このフラグは Chromium でのみ動作します。セキュリティ上の理由から、デフォルトでは無効です。

## CDP モード

Chrome DevTools Protocol を通じて既存のブラウザに接続します:

```bash
# Start Chrome with: google-chrome --remote-debugging-port=9222

# Connect once, then run commands without --cdp
agent-browser connect 9222
agent-browser snapshot
agent-browser tab
agent-browser close

# Or pass --cdp on each command
agent-browser --cdp 9222 snapshot

# Connect to remote browser via WebSocket URL
agent-browser --cdp "wss://your-browser-service.com/cdp?token=..." snapshot
```

`--cdp` フラグは次のいずれかを受け付けます:
- ポート番号（例: `9222`）— `http://localhost:{port}` 経由のローカル接続用
- 完全な WebSocket URL（例: `wss://...` または `ws://...`）— リモートブラウザサービス用

これにより次の制御が可能になります:
- Electron アプリ
- リモートデバッグ有効な Chrome / Chromium インスタンス
- WebView2 アプリケーション
- CDP エンドポイントを公開している任意のブラウザ

### 自動接続

ポートを指定せず、実行中の Chrome インスタンスを自動検出して接続するには `--auto-connect` を使用します:

```bash
# Auto-discover running Chrome with remote debugging
agent-browser --auto-connect open example.com
agent-browser --auto-connect snapshot

# Or via environment variable
AGENT_BROWSER_AUTO_CONNECT=1 agent-browser snapshot
```

自動接続は次の方法で Chrome を検出します:
1. デフォルトのユーザーデータディレクトリから Chrome の `DevToolsActivePort` ファイルを読み取る  
2. 一般的なデバッグポート（9222、9229）を順に試す

これは次のような場合に便利です:
- Chrome 144+ で `chrome://inspect/#remote-debugging` によりリモートデバッグが有効（動的ポート使用）
- 既存ブラウザへゼロ設定で接続したい
- Chrome が使用しているポートを追跡したくない

## ストリーミング（ブラウザプレビュー）

WebSocket 経由でブラウザのビューポートをストリーミングし、ライブプレビューや「ペアブラウジング」（人間が AI エージェントと並行して閲覧・操作）を実現します。

### ストリーミングを有効化

`AGENT_BROWSER_STREAM_PORT` 環境変数を設定します:

```bash
AGENT_BROWSER_STREAM_PORT=9223 agent-browser open example.com
```

これにより、指定ポートで WebSocket サーバーが起動し、ブラウザのビューポートを配信し入力イベントを受け付けます。

### WebSocket プロトコル

`ws://localhost:9223` に接続してフレーム受信および入力送信を行います:

**フレーム受信:**
```json
{
  "type": "frame",
  "data": "<base64-encoded-jpeg>",
  "metadata": {
    "deviceWidth": 1280,
    "deviceHeight": 720,
    "pageScaleFactor": 1,
    "offsetTop": 0,
    "scrollOffsetX": 0,
    "scrollOffsetY": 0
  }
}
```

**マウスイベント送信:**
```json
{
  "type": "input_mouse",
  "eventType": "mousePressed",
  "x": 100,
  "y": 200,
  "button": "left",
  "clickCount": 1
}
```

**キーボードイベント送信:**
```json
{
  "type": "input_keyboard",
  "eventType": "keyDown",
  "key": "Enter",
  "code": "Enter"
}
```

**タッチイベント送信:**
```json
{
  "type": "input_touch",
  "eventType": "touchStart",
  "touchPoints": [{ "x": 100, "y": 200 }]
}
```

### プログラム API

高度な用途では、プロトコル経由でストリーミングを直接制御できます:

```typescript
import { BrowserManager } from 'agent-browser';

const browser = new BrowserManager();
await browser.launch({ headless: true });
await browser.navigate('https://example.com');

// Start screencast
await browser.startScreencast((frame) => {
  // frame.data is base64-encoded image
  // frame.metadata contains viewport info
  console.log('Frame received:', frame.metadata.deviceWidth, 'x', frame.metadata.deviceHeight);
}, {
  format: 'jpeg',
  quality: 80,
  maxWidth: 1280,
  maxHeight: 720,
});

// Inject mouse events
await browser.injectMouseEvent({
  type: 'mousePressed',
  x: 100,
  y: 200,
  button: 'left',
});

// Inject keyboard events
await browser.injectKeyboardEvent({
  type: 'keyDown',
  key: 'Enter',
  code: 'Enter',
});

// Stop when done
await browser.stopScreencast();
```

## アーキテクチャ

agent-browser はクライアント・デーモン構成を使用します:

1. **Rust CLI**（高速なネイティブバイナリ） - コマンドを解析し、デーモンと通信  
2. **Node.js デーモン** - Playwright のブラウザインスタンスを管理  
3. **フォールバック** - ネイティブバイナリが利用できない場合、Node.js を直接使用  

デーモンは最初のコマンド実行時に自動で起動し、その後もコマンド間で維持されるため、次回以降の操作は高速です。

**ブラウザエンジン:** デフォルトでは Chromium を使用します。デーモンは Playwright プロトコル経由で Firefox と WebKit もサポートしています。

## プラットフォーム

| プラットフォーム | バイナリ | フォールバック |
|----------|--------|----------|
| macOS ARM64 | ネイティブ Rust | Node.js |
| macOS x64 | ネイティブ Rust | Node.js |
| Linux ARM64 | ネイティブ Rust | Node.js |
| Linux x64 | ネイティブ Rust | Node.js |
| Windows x64 | ネイティブ Rust | Node.js |

## AI エージェントでの使用

### エージェントに頼むだけ

最もシンプルな方法 ― エージェントに使うよう伝えるだけです:

```
ログインフローをテストするために agent-browser を使用してください。利用可能なコマンドを確認するには、agent-browser --help を実行してください。
```

`--help` の出力は網羅的で、多くのエージェントはそこから使い方を理解できます。

### AI コーディングアシスタント（推奨）

より豊富なコンテキストのために、AI コーディングアシスタントへスキルを追加します:

```bash
npx skills add vercel-labs/agent-browser
```

これは Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot、Goose、OpenCode、Windsurf で動作します。スキルはリポジトリから取得されるため自動的に最新状態が保たれます ― `node_modules` から `SKILL.md` をコピーしないでください。古くなります。

### Claude Code

Claude Code のスキルとしてインストール:

```bash
npx skills add vercel-labs/agent-browser
```

これにより、プロジェクト内の `.claude/skills/agent-browser/SKILL.md` にスキルが追加されます。このスキルは、snapshot-ref のインタラクションパターン、セッション管理、タイムアウト処理などを含む agent-browser の完全なワークフローを Claude Code に教えます。

### AGENTS.md / CLAUDE.md

より安定した結果のために、プロジェクトまたはグローバル指示ファイルへ追加してください:

```markdown
## ブラウザ自動化

Web自動化には `agent-browser` を使用します。すべてのコマンドは `agent-browser --help` を実行して確認してください。

基本的なワークフロー:

1. `agent-browser open <url>` - ページに移動
2. `agent-browser snapshot -i` - 参照（@e1、@e2）付きのインタラクティブ要素を取得
3. `agent-browser click @e1` / `fill @e2 "text"` - 参照を使って操作
4. ページ変更後に再度スナップショットを取得
```

## 連携

### iOS シミュレータ

iOS シミュレータ内の実際の Mobile Safari を操作して、本物のモバイル Web テストを行えます。macOS と Xcode が必要です。

**セットアップ:**

```bash
# Appium と XCUITest ドライバをインストール
npm install -g appium
appium driver install xcuitest
```

**使用方法:**

```bash
# 利用可能な iOS シミュレータを一覧表示
agent-browser device list

# 特定デバイスで Safari を起動
agent-browser -p ios --device "iPhone 16 Pro" open https://example.com

# デスクトップと同じコマンド
agent-browser -p ios snapshot -i
agent-browser -p ios tap @e1
agent-browser -p ios fill @e2 "text"
agent-browser -p ios screenshot mobile.png

# モバイル専用コマンド
agent-browser -p ios swipe up
agent-browser -p ios swipe down 500

# セッションを閉じる
agent-browser -p ios close
```

または環境変数を使用:

```bash
export AGENT_BROWSER_PROVIDER=ios
export AGENT_BROWSER_IOS_DEVICE="iPhone 16 Pro"
agent-browser open https://example.com
```

| 変数 | 説明 |
|----------|-------------|
| `AGENT_BROWSER_PROVIDER` | `ios` に設定すると iOS モードを有効化 |
| `AGENT_BROWSER_IOS_DEVICE` | デバイス名（例: "iPhone 16 Pro", "iPad Pro"） |
| `AGENT_BROWSER_IOS_UDID` | デバイス UDID（デバイス名の代替） |

**対応デバイス:** Xcode で利用可能なすべての iOS シミュレータ（iPhone、iPad）および実機 iOS デバイス。

**注意:** iOS プロバイダはシミュレータの起動、Appium の開始、Safari の制御を行います。初回起動は約 30〜60 秒かかりますが、その後のコマンドは高速です。

#### 実機デバイス対応

Appium は USB 接続された実機 iOS デバイスもサポートしています。これには追加の一度だけのセットアップが必要です:

**1. デバイスの UDID を取得:**
```bash
xcrun xctrace list devices
# または
system_profiler SPUSBDataType | grep -A 5 "iPhone\|iPad"
```

**2. WebDriverAgent に署名（一度だけ）:**
```bash
# WebDriverAgent の Xcode プロジェクトを開く
cd ~/.appium/node_modules/appium-xcuitest-driver/node_modules/appium-webdriveragent
open WebDriverAgent.xcodeproj
```

Xcode 内で:
- `WebDriverAgentRunner` ターゲットを選択  
- Signing & Capabilities を開く  
- Team を選択（Apple Developer アカウントが必要、無料枠で可）  
- Xcode に署名を自動管理させる  

**3. agent-browser で使用:**
```bash
# USB でデバイス接続後:
agent-browser -p ios --device "<DEVICE_UDID>" open https://example.com

# 一意ならデバイス名でも可
agent-browser -p ios --device "John's iPhone" open https://example.com
```

**実機デバイスに関する注意:**
- 初回実行時に WebDriverAgent がデバイスへインストールされる（Trust の確認が必要な場合あり）
- デバイスはロック解除され USB 接続されている必要あり
- 初回接続はシミュレータよりやや遅い
- 実際の Safari のパフォーマンスと挙動でテスト可能

### Browserbase

[Browserbase](https://browserbase.com) は、エージェント型ブラウジングエージェントのデプロイを容易にするためのリモートブラウザインフラを提供します。ローカルブラウザが利用できない環境で agent-browser CLI を実行する場合に使用してください。

Browserbase を有効にするには、`-p` フラグを使用します:

```bash
export BROWSERBASE_API_KEY="your-api-key"
export BROWSERBASE_PROJECT_ID="your-project-id"
agent-browser -p browserbase open https://example.com
```

または、CI/スクリプト用に環境変数を使用します:

```bash
export AGENT_BROWSER_PROVIDER=browserbase
export BROWSERBASE_API_KEY="your-api-key"
export BROWSERBASE_PROJECT_ID="your-project-id"
agent-browser open https://example.com
```

有効化すると、agent-browser はローカルブラウザを起動する代わりに Browserbase セッションへ接続します。すべてのコマンドは同一に動作します。

API キーとプロジェクト ID は [Browserbase Dashboard](https://browserbase.com/overview) から取得してください。

### Browser Use

[Browser Use](https://browser-use.com) は、AI エージェント向けのクラウドブラウザインフラを提供します。ローカルブラウザが利用できない環境（serverless、CI/CD など）で agent-browser を実行する場合に使用してください。

Browser Use を有効にするには、`-p` フラグを使用します:

```bash
export BROWSER_USE_API_KEY="your-api-key"
agent-browser -p browseruse open https://example.com
```

または、CI/スクリプト用に環境変数を使用します:

```bash
export AGENT_BROWSER_PROVIDER=browseruse
export BROWSER_USE_API_KEY="your-api-key"
agent-browser open https://example.com
```

有効化すると、agent-browser はローカルブラウザを起動する代わりに Browser Use のクラウドセッションへ接続します。すべてのコマンドは同一に動作します。

API キーは [Browser Use Cloud Dashboard](https://cloud.browser-use.com/settings?tab=api-keys) から取得してください。開始用の無料クレジットが提供されており、その後は従量課金制となります。

### Kernel

[Kernel](https://www.kernel.sh) は、ステルスモードや永続プロファイルなどの機能を備えた、AI エージェント向けクラウドブラウザインフラを提供します。

Kernel を有効にするには、`-p` フラグを使用します:

```bash
export KERNEL_API_KEY="your-api-key"
agent-browser -p kernel open https://example.com
```

または、CI/スクリプト用に環境変数を使用します:

```bash
export AGENT_BROWSER_PROVIDER=kernel
export KERNEL_API_KEY="your-api-key"
agent-browser open https://example.com
```

環境変数によるオプション設定:

| 変数 | 説明 | デフォルト |
|----------|-------------|---------|
| `KERNEL_HEADLESS` | ヘッドレスモードでブラウザを実行（`true`/`false`） | `false` |
| `KERNEL_STEALTH` | ボット検知を回避するためステルスモードを有効化（`true`/`false`） | `true` |
| `KERNEL_TIMEOUT_SECONDS` | セッションのタイムアウト（秒） | `300` |
| `KERNEL_PROFILE_NAME` | 永続的な Cookie/ログイン用のブラウザプロファイル名（存在しない場合は作成） | （なし） |

有効化すると、agent-browser はローカルブラウザを起動する代わりに Kernel のクラウドセッションへ接続します。すべてのコマンドは同一に動作します。

**プロファイルの永続化:** `KERNEL_PROFILE_NAME` が設定されている場合、まだ存在しなければプロファイルが作成されます。Cookie、ログイン情報、セッションデータはブラウザセッション終了時に自動的にプロファイルへ保存され、今後のセッションで利用可能になります。

API キーは [Kernel Dashboard](https://dashboard.onkernel.com) から取得してください。

## ライセンス

Apache-2.0






