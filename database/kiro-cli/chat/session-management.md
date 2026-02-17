# セッション管理

## 概要

Kiro CLI は、すべての会話ターンを自動的に保存します。セッションは**ディレクトリ単位**で管理され、以下が可能です。

* 過去セッションの再開
* ファイルへのエクスポート
* カスタムストレージとの統合

保存先はローカル（`~/.kiro/`）内の SQLite データベースです。

---

## 自動保存の仕様

| 項目      | 内容                 |
| ------- | ------------------ |
| 保存方式    | すべての会話ターンを自動保存     |
| スコープ    | ディレクトリ単位（プロジェクトごと） |
| 保存先     | `~/.kiro/`         |
| セッションID | UUID 形式            |

---

# セッションの管理方法

## 1. コマンドラインから操作

### セッション再開

```bash
# 最新セッションを再開
kiro-cli chat --resume

# インタラクティブ選択
kiro-cli chat --resume-picker
```

### セッション一覧表示

```bash
kiro-cli chat --list-sessions
```

### セッション削除

```bash
kiro-cli chat --delete-session <SESSION_ID>
```

---

## 2. チャット内コマンド

### 再開（インタラクティブ）

```bash
/chat resume
```

### ファイルへ保存

```bash
/chat save <path>
```

### ファイルから読み込み

```bash
/chat load <path>
```

:::message
`.json` 拡張子は省略可能
:::

---

# カスタムストレージ（スクリプト連携）

Git やクラウドストレージ、独自 DB へ保存／読み込みが可能。

## 保存（スクリプト経由）

```bash
/chat save-via-script <script-path>
```

* セッションJSONは **stdin 経由**で渡される
* 成功時は `exit 0`

### 例: Git Notes に保存

```bash
#!/bin/bash
COMMIT=$(git rev-parse HEAD)
TEMP=$(mktemp)
cat > "$TEMP"
git notes --ref=kiro/notes add -F "$TEMP" "$COMMIT" --force
rm "$TEMP"
echo "Saved to commit ${COMMIT:0:8}" >&2
```

---

## 読み込み（スクリプト経由）

```bash
/chat load-via-script <script-path>
```

* セッションJSONを **stdout に出力**
* 成功時は `exit 0`

### 例: Git Notes から読み込み

```bash
#!/bin/bash
COMMIT=$(git rev-parse HEAD)
git notes --ref=kiro/notes show "$COMMIT"
```

---

# セッション保存方式まとめ

| 方法     | 内容                       |
| ------ | ------------------------ |
| データベース | ディレクトリ単位で自動保存            |
| ファイル   | `/chat save` による手動エクスポート |
| カスタム   | スクリプト経由で外部連携             |

セッションID例:

```
f2946a26-3735-4b08-8d05-c928010302d5
```

---

# 利用例

## 最新セッションを再開

```bash
kiro-cli chat --resume
```

## セッションを選択して再開

```bash
kiro-cli chat --resume-picker
```

## ファイルへエクスポート

```bash
/chat save backup.json
```

## Git 連携

```bash
# 保存
/chat save-via-script ./scripts/save-to-git.sh

# 読み込み
/chat load-via-script ./scripts/load-from-git.sh
```

---

# トラブルシューティング

## 再開できるセッションがない

**症状**: `No saved chat sessions`

**原因**: 現在のディレクトリに保存データが存在しない

**対策**: 正しいディレクトリへ移動

---

## スクリプト保存の失敗

**原因**: スクリプトが非ゼロ終了コードを返した

**対策**:

* 手動実行で動作確認
* 成功時に `exit 0` を返すことを確認

---

## スクリプト読み込みの失敗

**原因**: 有効なJSONを stdout に出力していない

**対策**:

* JSON形式を検証
* stdoutへ出力されているか確認

---

# 制限事項

* セッションはディレクトリ単位
* 自動保存はデータベースのみ
* UUIDは人間向けではない
* クラウド同期なし（スクリプトで対応）
* 内容検索は不可

---

# 技術詳細

* 保存先: `~/.kiro/` 内 SQLite
* ディレクトリパスと紐付け
* 全ターン自動保存

## スクリプト仕様

| 操作   | 要件                           |
| ---- | ---------------------------- |
| 保存   | JSONをstdinで受け取り、成功時 `exit 0` |
| 読み込み | JSONをstdoutへ出力、成功時 `exit 0`  |

---

# 次のステップ

* チャットコマンド詳細を確認
* インタラクティブモードの理解
* コンテキスト管理機能の把握

