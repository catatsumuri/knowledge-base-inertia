# Kiro 認証ガイド

---

## 認証方法

Kiro は以下の認証プロバイダーをサポートしています。

| プロバイダー                      | 用途 / 特徴                |
| --------------------------- | ---------------------- |
| **GitHub**                  | GitHub アカウントとのシームレスな統合 |
| **Google**                  | Google 認証情報でサインイン      |
| **AWS Builder ID**          | 個人開発者向けの迅速なセットアップ      |
| **AWS IAM Identity Center** | エンタープライズ向けの高度な認証       |

---

:::message
### サブスクリプションとデータ利用について

* 有料 Kiro サブスクリプションを利用し、以下のいずれかでアクセスしているユーザーは**個人サブスクライバー**とみなされます。

  * ソーシャルログイン（GitHub / Google）
  * AWS Builder ID

* **Kiro Free Tier** および **個人サブスクライバーの一部コンテンツ** は、サービス改善のために使用される場合があります。

* 詳細およびオプトアウト方法は[Service improvement](https://kiro.dev/docs/privacy-and-security/data-protection/#service-improvement)を参照してください。

:::

## Kiro CLI にサインインする

### 基本手順

```bash
kiro-cli
# または
kiro-cli login
```

1. Enter キーを押すよう求められる
2. ブラウザが開く
3. 使用する認証方法を選択

   * Google
   * GitHub
   * Builder ID
   * 所属組織
4. 認証完了後、ブラウザに「ターミナルへ戻る」旨の表示
5. ターミナルに戻るとログイン完了

---

## リモートマシンからのサインイン

SSH / SSM / コンテナなど経由で CLI を実行している場合、ブラウザを直接開けないため認証方法が異なります。

---

### Builder ID / IAM Identity Center

* **デバイスコード認証**を使用
* ローカルブラウザで入力する URL とコードが表示される
* 追加セットアップ不要

---

###  ソーシャルログイン（Google / GitHub）

* PKCE 認証を使用
* localhost への OAuth コールバックが必要
* **SSH ポートフォワーディングが必須**

---

### 手順

1. `kiro-cli login` を実行
2. 「Use for Free with Google or GitHub」を選択
3. 表示されたポート番号を確認（例：49153）
4. ローカルマシンでポートフォワーディングを設定

```bash
ssh -L <PORT>:localhost:<PORT> -N user@remote-host
```

* `<PORT>` → 表示されたポート番号
* `user@remote-host` → リモート接続情報

5. CLI で Enter を押す
6. ローカルブラウザで URL を開く
7. 認証完了後、トンネル経由で CLI にコールバックが届く

---

## SSH ポートフォワーディング例

```bash
# 基本例
ssh -L 49153:localhost:49153 -N user@remote-host

# カスタム ID ファイル使用（EC2 など）
ssh -i ~/.ssh/my-key.pem -L 49153:localhost:49153 -N user@remote-host

# SSH 設定エイリアス使用
ssh -L 49153:localhost:49153 -N myserver
```

---

## トラブルシューティング

### 認証がタイムアウトする

* ポートフォワーディング未設定
* 誤ったポート番号
* CLI 表示ポートと一致しているか確認

### コールバックポートのバインド失敗

* リモート側でポート使用中

```bash
lsof -i :<PORT>
```

### SSH 開始時に "Address already in use"

* ローカル側でポート使用中
* 古い SSH セッションを終了

### 認証中にトンネル切断

* SSH ターミナルを閉じない
* タイムアウト防止オプション追加

```bash
ssh -o ServerAliveInterval=60 -L <PORT>:localhost:<PORT> -N user@remote-host
```

---

## サインアウト

```bash
kiro-cli logout
```

---

## 認証問題の一般対応

* ブラウザリダイレクト失敗
* サインインエラー

→ トラブルシューティングガイドを参照

---

## 次のステップ

* FAQ を確認
* Chat 機能を探る
* Kiro CLI を使い始める

