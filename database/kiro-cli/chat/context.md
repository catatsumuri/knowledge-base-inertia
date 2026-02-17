# コンテキスト管理ガイド

## 1. コンテキスト管理の目的

Kiro に適切な情報を与え、関連性の高い応答を得るためにコンテキストを管理します。プロジェクト要件、コーディング標準、設定情報、開発ルールなどを整理し、用途に応じた方法で提供します。

---

# 2. コンテキスト提供アプローチ一覧

## 2.1 概要比較

| アプローチ           | コンテキストウィンドウへの影響 | 永続性          | 最適な用途               |
| --------------- | --------------- | ------------ | ------------------- |
| Agent Resources | 常時有効（トークン消費）    | セッションをまたいで永続 | 重要なプロジェクトファイル、標準、設定 |
| Skills          | 必要時に全文読み込み      | セッションをまたいで永続 | 大規模ガイド、専門知識         |
| Session Context | 常時有効（トークン消費）    | 現在セッションのみ    | 一時ファイル、簡易実験         |
| Knowledge Bases | 検索時のみ消費         | セッションをまたいで永続 | 大規模コードベース、広範な資料     |

---

# 3. 意思決定フロー

## 3.1 選択手順

1. コンテンツは **10MB超** または **数千ファイル規模**か？

   * はい → **Knowledge Bases**
   * いいえ → 次へ

2. すべての会話で必要か？

   * はい → **Agent Resources**
   * いいえ → **Session Context**

---

# 4. クイックリファレンス

* README・設定・標準 → **Agent Resources**
* 大規模コードベース → **Knowledge Bases**
* 一時的なタスクファイル → **Session Context**

---

# 5. コンテキストウィンドウの仕組み

## 5.1 トークン消費の原則

* Agent Resources と Session Context は常にトークンを消費
* Knowledge Bases は検索されるまで消費しない
* 上限：コンテキストウィンドウの 75%

## 5.2 使用状況確認

```bash
/context show
```

### 出力例

```bash
Agent
  - .kiro/steering/**/*.md
  - README.md

Session（temporary）
  <none>
```

### 表示内容の意味

* **Agent**：永続的コンテキスト
* **Session**：現在セッション限定コンテキスト

---

# 6. Agent Resources（永続コンテキスト）

## 6.1 設定方法

```json
{
  "name": "my-agent",
  "description": "My development agent",
  "resources": [
    "file://README.md",
    "file://docs/**/*.md",
    "file://src/config.py"
  ]
}
```

## 6.2 URI スキーム

* `file://` 起動時に全文読み込み
* `skill://` メタデータのみ起動時、全文は必要時
* `knowledgeBase` 検索時のみ

---

# 7. Session Context（一時コンテキスト）

## 7.1 追加

```bash
/context add README.md
/context add docs/*.md
```

## 7.2 削除

```bash
/context remove src/temp-file.py
/context clear
```

※ スラッシュコマンドによる変更は一時的

---

# 8. Knowledge Bases（大規模データ向け）

## 8.1 有効化

```bash
kiro-cli settings chat.enableKnowledge true
```

## 8.2 コンテンツ追加

```bash
/knowledge add /path/to/large-codebase --include "/*.py" --exclude "node_modules/"
```

## 8.3 利点

* セマンティック検索
* 常時トークン消費なし
* 巨大リポジトリに最適

---

# 9. コンパクション（会話圧縮）

## 9.1 実行方法

* 手動：`/compact`
* 自動：ウィンドウ超過時

## 9.2 設定

| Setting                                | Default | 説明           |
| -------------------------------------- | ------- | ------------ |
| compaction.excludeMessages             | 2       | 保持最小メッセージペア数 |
| compaction.excludeContextWindowPercent | 2       | 保持最小ウィンドウ割合  |

保守的（大きい）な値が優先される。

---

# 10. デフォルトエージェント設定

```bash
kiro-cli settings chat.defaultAgent my-project-agent
```

---

# 11. ベストプラクティス

## 11.1 コンテキスト整理

* 必要最小限に絞る
* 論理的ディレクトリ構造
* 意味の明確なファイル名
* 巨大ファイルは分割

## 11.2 パフォーマンス管理

* `/context show` で監視
* 広すぎるグロブを避ける
* 不要な resources を削除
* 大規模データは Knowledge Base

## 11.3 セキュリティ

* 機密情報を含めない
* `.gitignore` を活用
* 古い情報の定期確認
* 会話で共有される情報に注意

---

# 12. 関連コマンド

* Slash Commands
* CLI Commands
* Interactive Chat Mode

---

# まとめ

用途に応じて以下を使い分ける：

* 永続・小規模 → Agent Resources
* 一時利用 → Session Context
* 大規模・検索前提 → Knowledge Bases

トークン消費を意識し、構造的に整理することが安定運用の鍵となる。

