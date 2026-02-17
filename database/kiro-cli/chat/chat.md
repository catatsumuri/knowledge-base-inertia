# Kiro CLI Chat モード ガイド

## 概要

Kiro CLI は、ターミナル上で AI と自然な会話を行える対話型チャットモードを提供します。
コマンドラインのワークフローに会話型 AI を組み込むことができます。

---

# 1. セッションの開始

## 1.1 通常のチャット開始

```bash
kiro-cli
```

## 1.2 特定エージェントを指定して開始

```bash
kiro-cli --agent myagent
```

---

# 2. 複数行入力

## 2.1 エディタを使用する方法

```bash
/editor
```

* デフォルトエディタ（既定: vi）が開く
* 複数行のプロンプトを記述可能
* 保存して終了すると内容が送信される

## 2.2 改行ショートカット

```
Ctrl + J
```

* 直接改行を挿入できる

## 2.3 返信モード

```bash
/reply
```

* 直近のアシスタントメッセージを引用
* エディタで複数行返信が可能
* 長文レスポンス作成に便利

---

# 3. 会話の永続化

Kiro は、チャットを開始したフォルダ単位で会話を記憶します。

## 3.1 ディレクトリベース永続化

* 初回: 新規会話を開始
* 同じディレクトリで再起動: 過去履歴を読み込み可能

## 3.2 明示的に再開

```bash
kiro-cli chat --resume
```

## 3.3 セッション選択ピッカー

```bash
kiro-cli chat --resume-picker
```

---

# 4. 会話の手動保存・読み込み

## 4.1 会話の保存

```bash
/chat save [path] – 現在の会話をJSONファイルとして保存します。

        既存のファイルを上書きするには -f または --force を追加してください

        例:

        /chat save ./my-project-conversation -f

        /chat save /home/user/project/my-project-conversation.json

        ホームディレクトリを示すために ~ を使用することはできません。

    /chat load [path] – 以前に保存したJSONファイルから会話を読み込みます

        例: /chat load ./my-project-conversation.json
```

:::message
`/chat save` および `/chat load` コマンドは、会話が最初に作成されたディレクトリとは独立して動作します。会話を読み込む際は、どのディレクトリに保存されていたかに関わらず、現在の会話が置き換えられることに注意してください。
:::

---


# まとめ

| 機能       | コマンド                            |
| -------- | ------------------------------- |
| 通常起動     | `kiro-cli`                      |
| エージェント指定 | `kiro-cli --agent myagent`      |
| エディタ入力   | `/editor`                       |
| 返信モード    | `/reply`                        |
| 再開       | `kiro-cli chat --resume`        |
| セッション選択  | `kiro-cli chat --resume-picker` |
| 保存       | `/chat save`                    |
| 読み込み     | `/chat load`                    |

Kiro CLI はディレクトリ単位での会話管理と手動保存の両方をサポートしており、プロジェクトごとにコンテキストを整理しながら対話を継続できます。

