# ヘルプエージェント

## 概要

ヘルプエージェントは、Kiro CLI に組み込まれた専用エージェントです。以下の内容に関する質問へ回答します。

* 機能
* コマンド
* ツール
* 設定

一般的なAI回答とは異なり、回答は実際の Kiro CLI ドキュメントに基づいています。

また、`.kiro/` ディレクトリ内に以下の設定ファイルを作成できます。

* エージェント
* プロンプト
* LSP設定

---

# クイックスタート

## ヘルプエージェントへ切り替える

```bash
/help
```

出力例：

```
✔ エージェントに切り替えました: kiro_help
[help] >
```

## 直接質問する

```bash
/help MCPサーバーを設定するにはどうすればよいですか？
```

## 従来コマンド一覧を使う

```bash
/help --legacy
```

---

# 質問できる内容

ヘルプエージェントは包括的な Kiro CLI ドキュメントへアクセスできます。

## コマンド

* スラッシュコマンド

  * `/chat`
  * `/agent`
  * `/context`
* CLIコマンド

  * `kiro-cli chat`
  * `kiro-cli settings`

## ツール

* `fs_read`
* `code`
* `grep`
* `glob`

## 設定

* `kiro-cli settings` で利用可能なすべての設定

## 機能

* Tangent Mode
* Hooks
* MCP
* Code Intelligence
* Subagents

## ショートカット

* キーボードショートカットとその使用方法

---

# 設定の作成

ヘルプエージェントは `.kiro/` ディレクトリ内のファイルを作成・変更できます。

例：

```
[help] > テストを書くためのエージェントを作成して
```

出力例：

```
✔ .kiro/agents/test-writer.yaml を作成しました
```

切り替え方法：

```bash
/agent swap test-writer
```

## 作成可能なもの

* `.kiro/agents/` 内のエージェント
* `.kiro/prompts/` 内のプロンプト
* `.kiro/` 内の LSP 設定

---

# 使用例

## コマンドについて質問する

```
[help] > 会話を保存するにはどうすればよいですか？
```

回答例：

現在の会話を保存するには以下を使用します。

```bash
/chat save ~/my-session.json
```

保存した会話は以下で読み込み可能です。

```bash
/chat load ~/my-session.json
```

---

## ツールについて質問する

```
[help] > code ツールは何をしますか？
```

`code` ツールの機能：

* `search_symbols` — 名前でシンボル定義を検索
* `lookup_symbols` — 特定のシンボルの詳細取得
* `get_document_symbols` — ファイル内の全シンボル一覧
* `pattern_search` — ASTベースの構造検索

複数言語に対応し、AST解析によって高精度なコード理解を行います。

---

## 設定について質問する

```
[help] > tangent mode を有効にするにはどうすればよいですか？
```

有効化方法：

```bash
kiro-cli settings chat.enableTangentMode true
```

またはチャット中に：

```bash
/tangent
```

---

# 以前のエージェントに戻る

ヘルプエージェント使用中に再度実行：

```bash
/help
```

出力例：

```
✔ エージェントに切り替えました: kiro_default
```

特定エージェントへ切り替える場合：

```bash
/agent swap <name>
```

---

# 関連項目

* Slash Commands — 利用可能なすべてのスラッシュコマンド
* Custom Agents — 独自エージェントの作成方法
* Settings Reference — 設定オプション一覧

