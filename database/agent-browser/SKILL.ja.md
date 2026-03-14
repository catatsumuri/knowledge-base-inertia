---
name: agent-browser
description: AIエージェント向けのブラウザ自動化CLI。ウェブサイト操作が必要な場合に使用します。ページ移動、フォーム入力、ボタンのクリック、スクリーンショット取得、データ抽出、ウェブアプリのテスト、ブラウザ操作の自動化などを行います。「ウェブサイトを開く」「フォームに入力する」「ボタンをクリックする」「スクリーンショットを撮る」「ページからデータをスクレイピングする」「このウェブアプリをテストする」「サイトにログインする」「ブラウザ操作を自動化する」などの要求がトリガーになります。
allowed-tools: Bash(npx agent-browser:*), Bash(agent-browser:*)
---

# agent-browser を使ったブラウザ自動化

## 基本ワークフロー

すべてのブラウザ自動化は次のパターンに従います：

1. **移動**: `agent-browser open <url>`
2. **スナップショット**: `agent-browser snapshot -i`（`@e1`, `@e2` のような要素参照を取得）
3. **操作**: 参照を使ってクリック・入力・選択
4. **再スナップショット**: ページ遷移やDOM変更後に新しい参照を取得

```bash
agent-browser open https://example.com/form
agent-browser snapshot -i
# 出力: @e1 [input type="email"], @e2 [input type="password"], @e3 [button] "Submit"

agent-browser fill @e1 "user@example.com"
agent-browser fill @e2 "password123"
agent-browser click @e3
agent-browser wait --load networkidle
agent-browser snapshot -i  # 結果を確認
```

## コマンド連結

コマンドは単一のシェル呼び出し内で `&&` を使って連結できます。ブラウザはバックグラウンドデーモンによってコマンド間で保持されるため、連結は安全で、個別呼び出しより効率的です。

```bash
# open + wait + snapshot を1回の呼び出しで連結
agent-browser open https://example.com && agent-browser wait --load networkidle && agent-browser snapshot -i

# 複数操作を連結
agent-browser fill @e1 "user@example.com" && agent-browser fill @e2 "password123" && agent-browser click @e3

# 移動してキャプチャ
agent-browser open https://example.com && agent-browser wait --load networkidle && agent-browser screenshot page.png
```

**連結するタイミング:** 中間コマンドの出力を読まずに続行できる場合（例：open + wait + screenshot）は `&&` を使用します。出力を解析する必要がある場合（例：snapshot で参照を取得してから操作）は個別に実行します。

## 主要コマンド

```bash
# ナビゲーション
agent-browser open <url>              # 移動（エイリアス: goto, navigate）
agent-browser close                   # ブラウザを閉じる

# スナップショット
agent-browser snapshot -i             # 参照付きインタラクティブ要素（推奨）
agent-browser snapshot -i -C          # カーソル操作可能要素も含む（onclick や cursor:pointer の div）
agent-browser snapshot -s "#selector" # CSSセレクタに範囲限定

# 操作（snapshot の @refs を使用）
agent-browser click @e1               # 要素をクリック
agent-browser click @e1 --new-tab     # クリックして新しいタブで開く
agent-browser fill @e2 "text"         # クリアして入力
agent-browser type @e2 "text"         # クリアせず入力
agent-browser select @e1 "option"     # ドロップダウン選択
agent-browser check @e1               # チェックボックスをオン
agent-browser press Enter             # キー押下
agent-browser keyboard type "text"    # 現在フォーカスへ入力（セレクタなし）
agent-browser keyboard inserttext "text"  # キーイベントなしで挿入
agent-browser scroll down 500         # ページをスクロール
agent-browser scroll down 500 --selector "div.content"  # 特定コンテナ内をスクロール

# 情報取得
agent-browser get text @e1            # 要素テキスト取得
agent-browser get url                 # 現在のURL取得
agent-browser get title               # ページタイトル取得

# 待機
agent-browser wait @e1                # 要素待機
agent-browser wait --load networkidle # ネットワークアイドル待機
agent-browser wait --url "**/page"    # URLパターン待機
agent-browser wait 2000               # ミリ秒待機

# ダウンロード
agent-browser download @e1 ./file.pdf          # 要素クリックでダウンロード開始
agent-browser wait --download ./output.zip     # 任意のダウンロード完了待機
agent-browser --download-path ./downloads open <url>  # デフォルト保存先指定

# キャプチャ
agent-browser screenshot              # 一時ディレクトリへスクリーンショット
agent-browser screenshot --full       # フルページスクリーンショット
agent-browser screenshot --annotate   # 要素番号付き注釈スクリーンショット
agent-browser pdf output.pdf          # PDFとして保存

# 差分（ページ状態比較）
agent-browser diff snapshot                          # 現在と直前のスナップショット比較
agent-browser diff snapshot --baseline before.txt    # 保存ファイルとの比較
agent-browser diff screenshot --baseline before.png  # ピクセル差分比較
agent-browser diff url <url1> <url2>                 # 2ページ比較
agent-browser diff url <url1> <url2> --wait-until networkidle  # 待機戦略を指定
agent-browser diff url <url1> <url2> --selector "#main"  # 要素範囲限定
```

## 一般的なパターン

### フォーム送信

```bash
agent-browser open https://example.com/signup
agent-browser snapshot -i
agent-browser fill @e1 "Jane Doe"
agent-browser fill @e2 "jane@example.com"
agent-browser select @e3 "California"
agent-browser check @e4
agent-browser click @e5
agent-browser wait --load networkidle
```

### 状態永続化を伴う認証

```bash
# 一度ログインして状態を保存
agent-browser open https://app.example.com/login
agent-browser snapshot -i
agent-browser fill @e1 "$USERNAME"
agent-browser fill @e2 "$PASSWORD"
agent-browser click @e3
agent-browser wait --url "**/dashboard"
agent-browser state save auth.json

# 将来のセッションで再利用
agent-browser state load auth.json
agent-browser open https://app.example.com/dashboard
```

### セッション永続化

```bash
# ブラウザ再起動後も cookies と localStorage を自動保存/復元
agent-browser --session-name myapp open https://app.example.com/login
# ... ログインフロー ...
agent-browser close  # 状態は ~/.agent-browser/sessions/ に自動保存

# 次回は状態が自動読み込みされる
agent-browser --session-name myapp open https://app.example.com/dashboard

# 保存状態を保存時に暗号化
export AGENT_BROWSER_ENCRYPTION_KEY=$(openssl rand -hex 32)
agent-browser --session-name secure open https://app.example.com

# 保存済み状態の管理
agent-browser state list
agent-browser state show myapp-default.json
agent-browser state clear myapp
agent-browser state clean --older-than 7
```

### データ抽出

```bash
agent-browser open https://example.com/products
agent-browser snapshot -i
agent-browser get text @e5           # 特定要素のテキストを取得
agent-browser get text body > page.txt  # ページ全体のテキストを取得

# 解析用のJSON出力
agent-browser snapshot -i --json
agent-browser get text @e1 --json
```

### 並列セッション

```bash
agent-browser --session site1 open https://site-a.com
agent-browser --session site2 open https://site-b.com

agent-browser --session site1 snapshot -i
agent-browser --session site2 snapshot -i

agent-browser session list
```

### 既存のChromeへ接続

```bash
# リモートデバッグ有効の実行中Chromeを自動検出
agent-browser --auto-connect open https://example.com
agent-browser --auto-connect snapshot

# またはCDPポートを明示指定
agent-browser --cdp 9222 snapshot
```

### カラースキーム（ダークモード）

```bash
# フラグによる永続ダークモード（すべてのページと新規タブに適用）
agent-browser --color-scheme dark open https://example.com

# または環境変数
AGENT_BROWSER_COLOR_SCHEME=dark agent-browser open https://example.com

# またはセッション中に設定（後続コマンドにも保持）
agent-browser set media dark
```

### ビジュアルブラウザ（デバッグ）

```bash
agent-browser --headed open https://example.com
agent-browser highlight @e1          # 要素をハイライト
agent-browser record start demo.webm # セッションを録画
agent-browser profiler start         # Chrome DevTools のプロファイリング開始
agent-browser profiler stop trace.json # 停止してプロファイル保存（パス省略可）
```

### ローカルファイル（PDF、HTML）

```bash
# file:// URL でローカルファイルを開く
agent-browser --allow-file-access open file:///path/to/document.pdf
agent-browser --allow-file-access open file:///path/to/page.html
agent-browser screenshot output.png
```

### iOSシミュレータ（Mobile Safari）

```bash
# 利用可能なiOSシミュレータ一覧
agent-browser device list

# 特定デバイスでSafari起動
agent-browser -p ios --device "iPhone 16 Pro" open https://example.com

# デスクトップと同じワークフロー - snapshot、操作、再snapshot
agent-browser -p ios snapshot -i
agent-browser -p ios tap @e1          # タップ（clickの別名）
agent-browser -p ios fill @e2 "text"
agent-browser -p ios swipe up         # モバイル専用ジェスチャー

# スクリーンショット取得
agent-browser -p ios screenshot mobile.png

# セッション終了（シミュレータをシャットダウン）
agent-browser -p ios close
```

**要件:** Xcode搭載のmacOS、Appium（`npm install -g appium && appium driver install xcuitest`）

**実機:** 事前設定済みであれば物理iOSデバイスでも動作。UDIDは `xcrun xctrace list devices` で確認し、`--device "<UDID>"` を使用。

## 差分確認（変更の検証）

アクション実行後に `diff snapshot` を使って、意図した効果があったか確認します。これは現在のアクセシビリティツリーを、セッション内で最後に取得したスナップショットと比較します。

```bash
# 典型的なワークフロー: snapshot -> action -> diff
agent-browser snapshot -i          # ベースラインのスナップショットを取得
agent-browser click @e2            # アクションを実行
agent-browser diff snapshot        # 何が変わったか確認（直前のスナップショットと自動比較）
```

ビジュアルリグレッションテストや監視の場合:

```bash
# ベースラインのスクリーンショットを保存し、後で比較
agent-browser screenshot baseline.png
# ... 時間が経過、または変更が加えられる ...
agent-browser diff screenshot --baseline baseline.png

# ステージングと本番を比較
agent-browser diff url https://staging.example.com https://prod.example.com --screenshot
```

`diff snapshot` の出力は git diff と同様に、追加を `+`、削除を `-` で表示します。  
`diff screenshot` は変更されたピクセルを赤で強調した差分画像と、不一致率（パーセンテージ）を生成します。

## タイムアウトと遅いページ

ローカルブラウザのデフォルト Playwright タイムアウトは 25 秒です。これは `AGENT_BROWSER_DEFAULT_TIMEOUT` 環境変数（ミリ秒単位）で上書きできます。遅いサイトや大きなページでは、デフォルトタイムアウトに頼るのではなく明示的な待機を使用してください:

```bash
# ネットワークの活動が落ち着くのを待つ（遅いページに最適）
agent-browser wait --load networkidle

# 特定の要素が表示されるのを待つ
agent-browser wait "#content"
agent-browser wait @e1

# 特定のURLパターンを待つ（リダイレクト後に便利）
agent-browser wait --url "**/dashboard"

# JavaScript 条件を待つ
agent-browser wait --fn "document.readyState === 'complete'"

# 最終手段として固定時間待つ（ミリ秒）
agent-browser wait 5000
```

常に遅いウェブサイトを扱う場合は、`open` の後に `wait --load networkidle` を使い、スナップショット取得前にページが完全に読み込まれていることを確認してください。特定の要素の描画が遅い場合は、`wait <selector>` や `wait @ref` で直接待機します。

## セッション管理とクリーンアップ

複数のエージェントや自動化を同時に実行する場合は、競合を避けるため必ず名前付きセッションを使用してください:

```bash
# 各エージェントは独立したセッションを持つ
agent-browser --session agent1 open site-a.com
agent-browser --session agent2 open site-b.com

# アクティブなセッションを確認
agent-browser session list
```

プロセスのリークを防ぐため、作業終了時には必ずブラウザセッションを閉じてください:

```bash
agent-browser close                    # デフォルトセッションを閉じる
agent-browser --session agent1 close   # 特定セッションを閉じる
```

以前のセッションが正しく閉じられていない場合、デーモンがまだ実行中の可能性があります。新しい作業を始める前に `agent-browser close` を使ってクリーンアップしてください。

## Ref のライフサイクル（重要）

Ref（`@e1`、`@e2` など）はページが変わると無効になります。次の場合は必ず再スナップショットを取得してください：

- ナビゲーションを伴うリンクやボタンをクリックしたとき  
- フォーム送信後  
- 動的コンテンツ読み込み後（ドロップダウン、モーダルなど）

```bash
agent-browser click @e5              # 新しいページへ移動
agent-browser snapshot -i            # 必ず再スナップショット
agent-browser click @e1              # 新しい ref を使用
```

## 注釈付きスクリーンショット（ビジョンモード）

`--annotate` を使うと、操作可能要素の上に番号ラベルを重ねたスクリーンショットを取得できます。  
各ラベル `[N]` は ref `@eN` に対応します。これにより ref もキャッシュされるため、別途スナップショットを取らずにすぐ操作できます。

```bash
agent-browser screenshot --annotate
# 出力には画像パスと凡例が含まれます：
#   [1] @e1 ボタン "Submit"
#   [2] @e2 リンク "Home"
#   [3] @e3 テキストボックス "Email"
agent-browser click @e2              # 注釈付きスクリーンショットの ref を使ってクリック
```

注釈付きスクリーンショットを使う場面：
- ラベルのないアイコンボタンや視覚要素のみの UI がある  
- 視覚レイアウトやスタイルを確認する必要がある  
- Canvas やチャート要素がある（テキストスナップショットでは不可視）  
- 要素の位置関係を空間的に把握する必要がある  

## セマンティックロケーター（Ref の代替）

Ref が使えない、または信頼できない場合はセマンティックロケーターを使用します：

```bash
agent-browser find text "Sign In" click
agent-browser find label "Email" fill "user@test.com"
agent-browser find role button click --name "Submit"
agent-browser find placeholder "Search" type "query"
agent-browser find testid "submit-btn" click
```

## JavaScript 評価（eval）

`eval` を使うとブラウザコンテキスト内で JavaScript を実行できます。**シェルのクォート処理によって複雑な式が壊れることがあります** — 問題回避には `--stdin` または `-b` を使用してください。

```bash
# 単純な式は通常のクォートで動作
agent-browser eval 'document.title'
agent-browser eval 'document.querySelectorAll("img").length'

# 複雑な JS: heredoc で --stdin を使用（推奨）
agent-browser eval --stdin <<'EVALEOF'
JSON.stringify(
  Array.from(document.querySelectorAll("img"))
    .filter(i => !i.alt)
    .map(i => ({ src: i.src.split("/").pop(), width: i.width }))
)
EVALEOF

# 別案: base64 エンコード（シェルエスケープ問題を完全回避）
agent-browser eval -b "$(echo -n 'Array.from(document.querySelectorAll("a")).map(a => a.href)' | base64)"
```

**なぜ重要か：**  
シェルがコマンドを処理する際、内部のダブルクォート、`!`（履歴展開）、バッククォート、`$()` などが JavaScript を agent-browser に届く前に壊してしまうことがあります。`--stdin` と `-b` フラグはシェル解釈を完全に回避します。

**経験則：**
- 単一行・ネストしたクォートなし → 通常の `eval 'expression'`（シングルクォート）で可  
- ネストしたクォート、アロー関数、テンプレートリテラル、複数行 → `eval --stdin <<'EVALEOF'` を使用  
- プログラム生成スクリプト → base64 を使った `eval -b` を使用  

## 設定ファイル

永続設定のため、プロジェクトルートに `agent-browser.json` を作成します：

```json
{
  "headed": true,
  "proxy": "http://localhost:8080",
  "profile": "./browser-data"
}
```

優先順位（低 → 高）：`~/.agent-browser/config.json` < `./agent-browser.json` < 環境変数 < CLI フラグ。  
カスタム設定ファイルは `--config <path>` または `AGENT_BROWSER_CONFIG` 環境変数で指定します（存在しない／無効な場合はエラー終了）。  
すべての CLI オプションは camelCase キーに対応します（例：`--executable-path` → `"executablePath"`）。  
ブールフラグは `true`/`false` を指定可能（例：`--headed false` は設定を上書き）。  
ユーザー設定とプロジェクト設定の拡張機能は置き換えではなくマージされます。

## 詳細ドキュメント

| リファレンス | 使用タイミング |
|-----------|-------------|
| [references/commands.md](references/commands.md) | すべてのオプションを含む完全なコマンド一覧 |
| [references/snapshot-refs.md](references/snapshot-refs.md) | Ref のライフサイクル、無効化ルール、トラブルシュート |
| [references/session-management.md](references/session-management.md) | 並列セッション、状態保持、同時スクレイピング |
| [references/authentication.md](references/authentication.md) | ログインフロー、OAuth、2FA 対応、状態再利用 |
| [references/video-recording.md](references/video-recording.md) | デバッグやドキュメント用の録画ワークフロー |
| [references/profiling.md](references/profiling.md) | パフォーマンス分析のための Chrome DevTools プロファイリング |
| [references/proxy-support.md](references/proxy-support.md) | プロキシ設定、地域テスト、ローテーションプロキシ |

## すぐ使えるテンプレート

| テンプレート | 説明 |
|----------|-------------|
| [templates/form-automation.sh](templates/form-automation.sh) | 検証付きフォーム入力 |
| [templates/authenticated-session.sh](templates/authenticated-session.sh) | 一度ログインして状態を再利用 |
| [templates/capture-workflow.sh](templates/capture-workflow.sh) | スクリーンショット付きコンテンツ抽出 |

```bash
./templates/form-automation.sh https://example.com/form
./templates/authenticated-session.sh https://app.example.com/login
./templates/capture-workflow.sh https://example.com ./output
```
