# プロンプト管理

Kiro CLI は、ローカルプロンプトおよび Model Context Protocol（MCP）プロンプトの両方に対応した包括的なプロンプト管理機能を提供します。
開発ワークフロー全体で再利用可能なプロンプトを作成・編集・整理・利用できます。

---

## プロンプトの種類

### 1. ローカルプロンプト

* 保存場所: `project/.kiro/prompts/`
* 範囲: 現在のプロジェクト内のみ
* 優先度: 最優先

### 2. グローバルプロンプト

* 保存場所: `~/.kiro/prompts/`
* 範囲: すべてのプロジェクト
* 優先度: 中

### 3. MCPプロンプト

* 提供元: 設定済みMCPサーバー
* 範囲: サーバー設定に依存
* 優先度: 最低

---

## 優先順位システム

同名のプロンプトが存在する場合、以下の順で解決されます。

1. ローカルプロンプト
2. グローバルプロンプト
3. MCPプロンプト

プロジェクト固有のカスタマイズが常に優先されます。

---

# コマンド一覧

すべての操作は `/prompts` コマンド経由で実行します。

---

## プロンプトの一覧表示

```
/prompts list
```

* 利用可能なすべてのプロンプトを3列レイアウトで表示

  * 名前
  * 説明
  * ソース（ローカル / グローバル / MCP）
* 総プロンプト数を表示

---

## プロンプトの作成

```
/prompts create --name name [--content content]
```

### パラメータ

* `name`（必須）: 最大50文字
* `--content`（任意）: 内容を直接指定

### 動作

* `--content` 指定あり → 即作成
* 指定なし → デフォルトエディタ起動
* 保存先: `.kiro/prompts/`

---

## プロンプトの編集

```
/prompts edit name
```

対応対象:

* ローカル
* グローバル
* MCP（サーバー対応時）

---

## プロンプト詳細の表示

```
/prompts details name
```

表示内容:

* メタデータ
* 引数情報
* AI送信前の完全なプロンプト内容
* パラメータ要件と例
* ソース情報

---

# プロンプトの使用方法

チャット内で `@` プレフィックスを使用します。

```
@prompt-name
```

### 例

```
@code-review
@team-standup
```

---

# MCPプロンプトの引数

ファイルベース（ローカル / グローバル）は引数非対応。
MCPプロンプトのみ引数を受け付けます。

## 構文

```
@server-name/prompt-name <required-arg> [optional-arg]
```

引数確認:

```
/prompts details prompt-name
```

[O### 例

```
@dev-tools/analyze "performance issue" "detailed"
@security-tools/scan "web-app" "high-severity"
```

---

# 拡張機能

## 内容プレビュー

* AI送信前の完全なプロンプト内容を表示

## エラーハンドリング強化

* MCPエラーをユーザーフレンドリーに変換
* 使用例の自動生成
* 無効パラメータの明確な案内

## 視覚的フォーマット

* 一貫したターミナル表示
* 3列レイアウトによる可読性向上

---

# MCP統合

* 自動検出: 設定済みサーバーから自動取得
* UX強化: 管理操作の向上
* エラー変換: JSONエラーを実用的メッセージへ変換
* 内容プレビュー: 実行前に完全内容表示

---

# 使用例

## ファイルベースプロンプトの作成

```
/prompts create --name code-review --content "Please review this code for best practices, security issues, and potential improvements:"
```

### 使用

```
@code-review
```

---

## 引数付きMCPプロンプト

```
@dev-tools/analyze "performance bottleneck" "cpu usage"
@security-tools/scan "web-app" "high-severity"
@aws-tools/deploy "my-service" "production" "us-west-2"
```

