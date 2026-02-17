# スラッシュコマンド

## 概要

* 会話から離れずに操作を素早く実行するための **インタラクティブチャット専用** コマンド。
* 先頭に **`/`** を付けて入力し、よく使う操作へのショートカットとして機能する。

---

## 使い方

* スラッシュコマンドは **インタラクティブチャットモードでのみ利用可能**。

```bash
kiro chat
> /help
```

---

## コマンド一覧

### /help

**目的**

* Help Agent に切り替えて Kiro CLI の機能について質問する、または従来のヘルプテキストを表示する。

**例**

```bash
# Help Agent に切り替え
> /help

# 直接質問する
> /help MCP サーバーをどのように設定しますか？

# 従来のヘルプテキストを表示
> /help --legacy
```

**補足**

* 詳細は Help Agent を参照。

---

### /quit

**目的**

* インタラクティブチャットセッションを終了する。

**例**

```bash
> /quit
```

**エイリアス**

* `/exit`, `/q`

---

### /clear

**目的**

* 現在の会話履歴（表示）をクリアする。

**例**

```bash
> /clear
```

**注意**

* これは **表示のみ** をクリアする。保存された会話は削除されない。

---

### /context

**目的**

* コンテキストファイルの管理、およびコンテキストウィンドウの使用状況を表示する。
* 「コンテキストルール」により、Kiro セッションに含めるファイルが決まり、**現在アクティブなエージェント** に依存する。

**基本操作**

```bash
# コンテキストルール設定と一致したファイルを表示
> /context show

# コンテキストルールを追加（ファイル名または glob パターン）
> /context add src/app.js
> /context add "*.py"
> /context add "src/**/*.js"

# 指定したルールを削除
> /context remove src/app.js

# すべてのルールを削除
> /context clear
```

**サブコマンド**

* `show` : コンテキストルール設定と一致したファイルを表示
* `add` : ルール追加（ファイル名 / glob）
* `remove` : 指定ルール削除

**注意点**

* 特定ファイル指定 or glob（例: `*.py`, `src/**/*.js`）が使える。
* エージェントルールは **現在のエージェントにのみ適用**。
* コンテキストの変更は **セッション間では保存されない**。

  * 永続化するなら **エージェント設定ファイル** を編集する。
* ルールに一致したファイルが、Kiro にプロジェクト/環境情報を追加で提供する。

---

### /model

**目的**

* 別の AI モデルに切り替える、またはデフォルトモデル設定を行う。

**例**

```bash
# 現在のモデルを表示
> /model

# 現在のモデルを今後のセッションのデフォルトとして保存
> /model set-current-as-default
```

**サブコマンド**

* `set-current-as-default` : 現在のモデル選択を今後のデフォルトとして保存

**注意**

* 設定は `~/.kiro/settings/cli.json` に保存され、以降の全チャットセッションで自動適用。

---

### /agent

**目的**

* エージェントを管理し、異なるエージェント設定間を切り替える。

**例**

```bash
# 利用可能なすべてのエージェントを一覧表示
> /agent list

# 新しいエージェントを作成
> /agent create my-agent

# 既存のエージェント設定を編集
> /agent edit my-agent

# AI を使ってエージェント設定を生成
> /agent generate

# エージェント設定スキーマを表示
> /agent schema

# 新しいチャットセッションのデフォルトエージェントを設定
> /agent set-default my-agent

# 実行時に別のエージェントへ切り替え
> /agent swap code-reviewer
```

**サブコマンド**

* `list` : エージェント一覧と説明表示
* `create` : 新規作成
* `edit` : 編集
* `generate` : AIで生成
* `schema` : スキーマ表示
* `set-default` : `kiro-cli chat` 起動時のデフォルトを設定
* `swap` : 実行時に切り替え（説明付きで選択）

**注意**

* 保存先は `~/.kiro/agents/`（グローバル）または `.kiro/agents/`（ワークスペース単位）。
* 特定エージェントで起動: `kiro-cli chat --agent agent_name`
* デフォルト設定: `kiro-cli settings chat.defaultAgent agent_name`

---

### /chat

**目的**

* チャットセッションの保存/読み込み/切り替えを管理する。
* Kiro CLI は **会話の各ターンごとに自動保存** する。

**例**

```bash
# 以前のセッションを再開するためのインタラクティブセッションピッカーを開く
> /chat resume

# 現在のセッションをファイルに保存
> /chat save /myproject/codereview.json

# ファイルからセッションを読み込む
> /chat load /myproject/codereview.json
```

**サブコマンド**

* `resume` : セッションピッカーで再開するセッションを選択
* `save` : 現在のセッションを保存（`.json` 省略可）
* `load` : ファイルから読み込み
* `save-via-script` : カスタムスクリプトで保存（stdinでJSON受領）
* `load-via-script` : カスタムスクリプトで読み込み（stdoutへJSON出力）

**注意**

* セッションは **各会話ターンごとに自動保存**。
* セッションは **ディレクトリごと** に保存され、各プロジェクトに独自のセットを持つ。
* ピッカーには「セッション名」「最終アクティビティ」「メッセージプレビュー」が表示される。
* ピッカー内ショートカット: `↑/↓` 移動、`Enter` 選択、`/` フィルタ。

#### カスタムセッション保存（例: Git notes）

**保存**

```bash
> /chat save-via-script ./scripts/save-to-git.sh
```

```bash
#!/bin/bash
set -ex
COMMIT=$(git rev-parse HEAD)
TEMP=$(mktemp)
cat > "$TEMP"
git notes --ref=kiro/notes add -F "$TEMP" "$COMMIT" --force
rm "$TEMP"
echo "Saved to commit ${COMMIT:0:8}" >&2
```

**読み込み**

```bash
> /chat load-via-script ./scripts/load-from-git.sh
```

```bash
#!/bin/bash
set -ex
COMMIT=$(git rev-parse HEAD)
git notes --ref=kiro/notes show "$COMMIT"
```

---

### /save

**目的**

* 現在の会話をファイルに保存する（実体は `/chat save`）。

**例**

```bash
> /chat save /myproject/codereview.json
```

---

### /load

**目的**

* 以前に保存した会話を読み込む（実体は `/chat load`）。

**例**

```bash
> /chat load /myproject/codereview.json
```

---

### /editor

**目的**

* デフォルトエディタ（デフォルトは `vi`）を開いてプロンプトを作成する。

**例**

```bash
> /editor
```

**補足**

* `$EDITOR` を開いて、より長いメッセージを作成できる。

---

### /reply

**目的**

* 直近のアシスタントメッセージを引用した状態でエディタを開き、返信を作成する。

**例**

```bash
> /reply
```

**用途**

* AI 応答の特定部分を参照しながら返信したいときに便利。

---

### /compact

**目的**

* 会話を要約してコンテキストスペースを解放する。

**例**

```bash
> /compact
```

**補足**

* 重要情報を保持しつつ会話履歴を圧縮。コンテキスト制限に近いときに有用。

---

### /paste

**目的**

* クリップボードから画像を貼り付ける。

**例**

```bash
> /paste
```

---

### /tools

**目的**

* ツールとその権限を表示し、信頼設定を切り替える。
* デフォルトでは、Kiro は特定ツール利用時に許可を求める。
* 信頼設定により、確認なし実行 or 都度確認に戻せる。

**例**

```bash
# すべてのツールとその権限を表示
> /tools

# 入力スキーマを表示
> /tools schema

# セッション内で特定のツールを信頼
> /tools trust write

# ツールをリクエストごとの確認に戻す
> /tools untrust write

# すべてのツールを信頼（非推奨の /acceptall と同等）
> /tools trust-all

# すべてのツールをデフォルトの権限レベルにリセット
> /tools reset
```

**サブコマンド**

* `schema` : すべてのツール入力スキーマ表示
* `trust` : 指定ツールを信頼
* `untrust` : 都度確認に戻す
* `trust-all` : 全ツール信頼（非推奨）
* `reset` : 権限を初期化

**注意**

* 永続化は Agent Configuration Reference を参照。

---

### /prompts

**目的**

* プロンプト（再利用テンプレート）を表示/取得/作成/編集/削除する。
* テンプレートはインストール済みMCPサーバーから提供される。

**例**

```bash
# ツールから利用可能なプロンプトを一覧表示
> /prompts list

# 特定のプロンプトの詳細情報を表示
> /prompts details code-review

# 名前で特定のプロンプトを取得
> /prompts get code-review [arg]

# クイック取得（/prompts プレフィックスなし）
> @code-review [arg]

# 新しいローカルプロンプトを作成
> /prompts create my-prompt

# 既存のローカルプロンプトを編集
> /prompts edit my-prompt

# 既存のローカルプロンプトを削除
> /prompts remove my-prompt
```

**サブコマンド**

* `list` : 一覧表示
* `details` : 詳細表示
* `get` : 取得
* `create` : 作成
* `edit` : 編集
* `remove` : 削除

**クイックヒント**

* `@<prompt name> [arg]` で素早く取得。

---

### /hooks

**目的**

* 現在のセッションで有効なコンテキストフックを表示する。

**例**

```bash
> /hooks
```

---

### /usage

**目的**

* 請求およびクレジット情報を表示する。

**例**

```bash
> /usage
```

---

### /mcp

**目的**

* 読み込まれている MCP（Model Context Protocol）サーバーを確認する。

**例**

```bash
> /mcp
```

---

### /code

**目的**

* コードインテリジェンス（LSP等）の設定管理・概要取得・状態確認・ログ確認。

**例**

```bash
# 初期化
> /code init

# 強制再初期化（LSP再起動）
> /code init -f

# ワークスペース概要（詳細）
> /code overview

# 概要（簡潔）
> /code overview --silent

# 状態
> /code status

# ログ（トラブルシュート）
> /code logs           # 最新20件のERROR
> /code logs -l INFO    # INFO以上
> /code logs -n 50      # 最新50件
> /code logs -l DEBUG -n 100  # DEBUG以上を100件
> /code logs -p ./lsp-logs.json # JSONへエクスポート
```

**サブコマンド**

* `init` : LSPを初期化
* `overview` : 構造の概要
* `status` : 状態表示
* `logs` : ログ表示

---

### /experiment

**目的**

* 実験的機能を有効/無効にする。

**例**

```bash
> /experiment
```

---

### /tangent

**目的**

* 会話のチェックポイントを作成し、サイドトピックを探索する。
* tangentモードの開始/終了。キーボードショートカットとして `Ctrl+T` を使用可（有効な場合）。

**例**

```bash
> /tangent
```

---

### /todos（/todo）

**目的**

* ToDoリストを表示/管理/再開する。

**例**

```bash
# ToDoを表示
> /todo

# ToDoを追加
> /todo add "Fix authentication bug"

# ToDoを完了
> /todo complete 1
```

---

### /issue

**目的**

* 新しい GitHub issue を作成する、または機能リクエストを行う。

**例**

```bash
> /issue
```

---

### /logdump

**目的**

* サポート調査用にログの zip バンドルを作成する。

**例**

```bash
> /logdump
```

---

### /changelog

**目的**

* Kiro CLI の変更履歴を表示する。

**例**

```bash
> /changelog
```

---

## キーボードショートカット（インタラクティブモード）

* `Ctrl+C` : 現在の入力をキャンセル
* `Ctrl+J` : 複数行プロンプト用に改行を挿入
* `Ctrl+S` : コマンド/コンテキストファイルをあいまい検索（Tabで複数選択）
* `Ctrl+T` : tangentモード切り替え（有効な場合）
* `↑/↓` : コマンド履歴を移動

---

## 次のステップ

* CLIコマンドについて学ぶ（ターミナル利用向け）
* インタラクティブチャットモードを探る
* 高度なコンテキスト処理は「Context Management」を確認

