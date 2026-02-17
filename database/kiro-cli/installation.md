# Kiro CLI インストールガイド

---

## 1. macOS

### インストール

```bash
curl -fsSL https://cli.kiro.dev/install | bash
```

インストール後、Webブラウザが開きます。
画面の指示に従い [認証](authentication) を完了してください。

### アンインストール

```bash
kiro-cli uninstall
```

---

## 2. Linux（AppImage）

### ダウンロード

[https://desktop-release.q.us-east-1.amazonaws.com/latest/kiro-cli.appimage](https://desktop-release.q.us-east-1.amazonaws.com/latest/kiro-cli.appimage)

### 実行権限付与

```bash
chmod +x kiro-cli.appimage
```

### 実行

```bash
./kiro-cli.appimage
```

Webブラウザが開くので [認証](authentication) を完了してください。

---

## 3. Linux（zip 版）

### 3.1 事前要件

* unzip コマンドが使用可能であること
* glibc 2.34 以上（2021年以降の主要ディストリビューションで標準）
* 2.34 未満の場合は musl 版を使用
* 対応アーキテクチャ

  * x86_64（64bit）
  * ARM aarch64

### glibc バージョン確認

```bash
ldd --version
```

---

### 3.2 ダウンロード

#### 標準版（glibc 2.34 以上）

**Linux x86-64**

```bash
curl --proto '=https' --tlsv1.2 -sSf 'https://desktop-release.q.us-east-1.amazonaws.com/latest/kirocli-x86_64-linux.zip' -o 'kirocli.zip'
```

**Linux ARM（aarch64）**

```bash
curl --proto '=https' --tlsv1.2 -sSf 'https://desktop-release.q.us-east-1.amazonaws.com/latest/kirocli-aarch64-linux.zip' -o 'kirocli.zip'
```

---

#### musl 版（glibc < 2.34）

**x86-64**

```bash
curl --proto '=https' --tlsv1.2 -sSf 'https://desktop-release.q.us-east-1.amazonaws.com/latest/kirocli-x86_64-linux-musl.zip' -o 'kirocli.zip'
```

**ARM（aarch64）**

```bash
curl --proto '=https' --tlsv1.2 -sSf 'https://desktop-release.q.us-east-1.amazonaws.com/latest/kirocli-aarch64-linux-musl.zip' -o 'kirocli.zip'
```

---

### 3.3 インストール

```bash
unzip kirocli.zip
./kirocli/install.sh
```

デフォルトインストール先：

```
~/.local/bin
```

---

## 4. Ubuntu（.deb パッケージ）

### ダウンロード

```bash
wget https://desktop-release.q.us-east-1.amazonaws.com/latest/kiro-cli.deb
```

### インストール

```bash
sudo dpkg -i kiro-cli.deb
sudo apt-get install -f
```

### 起動

```bash
kiro-cli
```

### アンインストール

```bash
sudo apt-get remove kiro-cli
sudo apt-get purge kiro-cli
```

---

## 5. プロキシ設定

### 基本設定

```bash
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
export NO_PROXY=localhost,127.0.0.1,.company.com
```

### 認証付きプロキシ

```bash
export HTTP_PROXY=http://username:password@proxy.company.com:8080
export HTTPS_PROXY=http://username:password@proxy.company.com:8080
```

### トラブルシューティング

* プロキシサーバーへの接続確認
* 認証情報の確認
* 企業ファイアウォール設定の確認
* SSL証明書検証エラーは管理者へ相談
* 必要プロトコル対応の確認

---

## 6. デバッグ

### 問題診断

```bash
kiro-cli doctor
```

正常例：

```
✔ 問題は見つかりませんでした！
```

### 問題報告

```bash
kiro-cli issue
```

---

## 7. よくある問題

### 認証失敗

```bash
kiro-cli login
```

### 自動補完が動作しない

```bash
kiro-cli doctor
```

### SSH 統合の問題

SSH サーバーが必要な環境変数を受け入れるよう正しく設定されているか確認してください。

---

## 8. トラブルシューティング手順まとめ

1. `kiro-cli doctor` を実行
2. インターネット接続確認
3. サポート環境か確認
4. 再インストール
5. `kiro-cli issue` で報告

---

# 付記

* glibc バージョン確認を怠ると起動しないケースがある
* musl 版との取り違えが典型的な失敗原因
* 企業ネットワークではプロキシ設定が最大の障害要因になりやすい

環境依存の問題が多いため、まずは `kiro-cli doctor` を実行することが最短経路です。
