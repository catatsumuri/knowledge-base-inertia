# カスタム Diff ツール設定ガイド

## 概要

Kiro がファイルの変更を提案すると、デフォルトでは組み込みの diff ツールで表示されます。

しかし、以下のような理由で外部ツールを使いたい場合があります。

* シンタックスハイライト付きで見たい
* 左右分割表示で比較したい
* GUI で視覚的に確認したい
* 既存の Git ワークフローと統合したい

その場合、`chat.diffTool` 設定を変更することで外部 diff ツールを利用できます。

---

## 設定方法

### diff ツールを指定する

```bash
kiro-cli settings chat.diffTool <tool-name>
```

例：`delta` を使用する場合

```bash
kiro-cli settings chat.diffTool delta
```

### 組み込み diff に戻す

```bash
kiro-cli settings -d chat.diffTool
```

---

# ターミナル系 Diff ツール

ワークフローを中断せず、ターミナル内で完結させたい場合に適しています。

| ツール            | Config値        | 特徴・用途                        |
| -------------- | -------------- | ---------------------------- |
| delta          | delta          | Git ユーザー向け。シンタックスハイライト・行番号対応 |
| difftastic     | difft          | 言語構造を理解し、フォーマット差分を無視         |
| icdiff         | icdiff         | 高速な左右分割カラー比較                 |
| diff-so-fancy  | diff-so-fancy  | 読みやすく整形された出力                 |
| colordiff      | colordiff      | シンプルなカラー表示                   |
| diff-highlight | diff-highlight | 単語単位ハイライト（Git 同梱）            |
| ydiff          | ydiff          | 単語レベル強調＋左右分割表示               |
| bat            | bat            | Git 統合＋シンタックスハイライト           |

---

# GUI Diff ツール

別ウィンドウで視覚的に確認したい場合に適しています。

| ツール              | Config値       |
| ---------------- | ------------- |
| VS Code          | code          |
| VSCodium         | codium        |
| Meld             | meld          |
| KDiff3           | kdiff3        |
| FileMerge（macOS） | opendiff      |
| Vim              | vimdiff / vim |
| Neovim           | nvim          |

---

## ⚠ 警告

GUI diff ツールは「閲覧専用の一時ファイル」を開きます。

* GUI 上で編集しても保存されません
* Kiro の提案内容には反映されません

編集は必ず元ファイル側で行う必要があります。

---

# カスタム引数の指定

ツールに追加オプションを渡すことも可能です。

例：`delta` を左右分割表示で使う場合

```bash
kiro-cli settings chat.diffTool "delta --side-by-side"
```

引用符で囲むことで、引数付きコマンドとして扱われます。

---

# その他の Diff ツールとの連携

Kiro は、明示的にサポートされていないツールとも連携可能です。

以下の順序で実行を試みます：

1. 統一形式 diff を stdin 経由でパイプする
2. 2つの一時ファイルのパスを引数として渡す

どちらも失敗した場合、組み込みのインライン diff にフォールバックします。

---

# トラブルシューティング

### エラー

```
Couldn't find the diff tool
```

### 確認方法

```bash
which delta
```

何も表示されない場合：

* ツールが未インストール
* PATH に含まれていない

---

## インストール例（delta）

### macOS

```bash
brew install git-delta
```

### Ubuntu / Debian

```bash
sudo apt install git-delta
```

その他のツールについては、各公式ドキュメントを参照してください。

---

# まとめ

* `chat.diffTool` で diff 体験をカスタマイズ可能
* ターミナル派か GUI 派かで選択が変わる
* GUI は閲覧専用である点に注意
* 未対応ツールも基本的に利用可能（フォールバックあり）

用途に応じて最適な diff ツールを選択すると、レビュー効率は大きく変わります。

