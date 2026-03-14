> ## ドキュメント索引  
> 完全なドキュメント索引はこちらから取得できます: https://code.claude.com/docs/llms.txt  
> さらに調べる前に、このファイルを使って利用可能なすべてのページを確認してください。  

# Remote Control でどのデバイスからでもローカルセッションを継続

> Remote Control を使えば、スマートフォン、タブレット、または任意のブラウザからローカルの Claude Code セッションを継続できます。claude.ai/code と Claude モバイルアプリに対応しています。  

<Note>  
  Remote Control は Pro および Max プランでリサーチプレビューとして利用可能です。Team または Enterprise プランでは利用できません。  
</Note>  

Remote Control は、あなたのマシン上で実行されている Claude Code セッションに、[claude.ai/code](https://claude.ai/code) または Claude アプリ（[iOS](https://apps.apple.com/us/app/claude-by-anthropic/id6473753684)、[Android](https://play.google.com/store/apps/details?id=com.anthropic.claude)）を接続します。デスクで作業を始めて、ソファでスマートフォンから、あるいは別のコンピュータのブラウザから続けられます。  

マシンで Remote Control セッションを開始すると、Claude は常にローカルで動作し続けるため、クラウドへ移動するものはありません。Remote Control では次のことが可能です:  

* **ローカル環境をそのままリモート利用**: ファイルシステム、[MCP サーバー](/en/mcp)、ツール、プロジェクト設定はすべて利用可能なままです  
* **両方の画面から同時作業**: 会話は接続されたすべてのデバイス間で同期され、ターミナル、ブラウザ、スマートフォンから自由にメッセージを送れます  
* **中断に強い**: ノートPCがスリープしても、ネットワークが切れても、マシンがオンラインに戻れば自動的に再接続します  

クラウド基盤上で動作する [Claude Code on the web](/en/claude-code-on-the-web) とは異なり、Remote Control セッションはあなたのマシン上で直接実行され、ローカルのファイルシステムとやり取りします。Web とモバイルのインターフェースは、そのローカルセッションへの単なるウィンドウにすぎません。  

このページでは、セットアップ方法、セッションの開始と接続方法、そして Remote Control と Claude Code on the web の違いについて説明します。  

## 要件  

Remote Control を使用する前に、環境が次の条件を満たしていることを確認してください:  

* **サブスクリプション**: Pro または Max プランが必要です。API キーはサポートされていません。  
* **認証**: `claude` を実行し、まだの場合は `/login` を使って claude.ai 経由でサインインしてください。  
* **ワークスペース信頼**: プロジェクトディレクトリで少なくとも一度 `claude` を実行し、ワークスペース信頼ダイアログを承認してください。  

## Remote Control セッションを開始する  

Remote Control から直接新しいセッションを開始することも、すでに実行中のセッションに接続することもできます。  

<Tabs>  
  <Tab title="新しいセッション">  
    プロジェクトディレクトリに移動して次を実行します:  

    ```bash  theme={null}  
    claude remote-control  
    ```  

    プロセスはターミナルで実行されたままになり、リモート接続を待機します。別のデバイスから接続するためのセッションURLが表示され、スペースキーを押すとスマートフォン用のQRコードを表示できます。リモートセッションがアクティブな間、ターミナルには接続状態とツールの動作が表示されます。  

    このコマンドは次のフラグをサポートしています:  

    * **`--verbose`**: 詳細な接続ログとセッションログを表示  
    * **`--sandbox`** / **`--no-sandbox`**: セッション中のファイルシステムおよびネットワーク分離のための [サンドボックス化](/en/sandboxing) を有効または無効にします。デフォルトではサンドボックスは無効です。  
  </Tab>  

  <Tab title="既存セッションから">  
    すでに Claude Code セッション内にいて、それをリモートで継続したい場合は `/remote-control`（または `/rc`）コマンドを使用します:  

    ```  
    /remote-control  
    ```  

    これにより現在の会話履歴を引き継いだ Remote Control セッションが開始され、別のデバイスから接続するためのセッションURLとQRコードが表示されます。`--verbose`、`--sandbox`、`--no-sandbox` フラグはこのコマンドでは利用できません。  

    <Tip>  
      `/remote-control` を実行する前に `/rename` を使ってセッションに説明的な名前を付けてください。これによりデバイス間のセッション一覧で見つけやすくなります。  
    </Tip>  
  </Tab>  
</Tabs>  

### 別のデバイスから接続する  

Remote Control セッションがアクティブになると、別のデバイスから接続する方法はいくつかあります:  

* **セッションURLをブラウザで開く** と、[claude.ai/code](https://claude.ai/code) 上のセッションに直接移動します。`claude remote-control` と `/remote-control` の両方がこのURLをターミナルに表示します。  
* **QRコードをスキャン** すると、Claude アプリで直接開けます。`claude remote-control` ではスペースキーでQRコード表示を切り替えます。  
* **[claude.ai/code](https://claude.ai/code) または Claude アプリを開く** と、セッション一覧で名前から見つけられます。Remote Control セッションはオンライン時に緑のステータスドット付きのコンピュータアイコンで表示されます。  

リモートセッションの名前は、直前のメッセージ、`/rename` の値、または会話履歴がない場合は “Remote Control session” になります。環境にすでにアクティブなセッションがある場合、それを続行するか新規開始するかを尋ねられます。  

まだ Claude アプリを持っていない場合は、Claude Code 内で `/mobile` コマンドを使うと、[iOS](https://apps.apple.com/us/app/claude-by-anthropic/id6473753684) または [Android](https://play.google.com/store/apps/details?id=com.anthropic.claude) 用のダウンロードQRコードが表示されます。  

### すべてのセッションで Remote Control を有効にする  

デフォルトでは、Remote Control は `claude remote-control` または `/remote-control` を明示的に実行したときだけ有効になります。すべてのセッションで自動的に有効にするには、Claude Code 内で `/config` を実行し、**Enable Remote Control for all sessions** を `true` に設定します。無効にするには `false` に戻します。  

各 Claude Code インスタンスは同時に1つのリモートセッションのみをサポートします。複数のインスタンスを実行している場合、それぞれが独自の環境とセッションを持ちます。

## 接続とセキュリティ

ローカルのClaude Codeセッションは、外向きのHTTPSリクエストのみを行い、マシン上で受信ポートを開くことはありません。Remote Controlを開始すると、Anthropic APIに登録され、作業のポーリングを行います。別のデバイスから接続すると、サーバーはWebまたはモバイルクライアントとローカルセッションの間で、ストリーミング接続を介してメッセージを中継します。

すべての通信はTLSを通じてAnthropic API経由で送信され、これは通常のClaude Codeセッションと同じトランスポートセキュリティです。接続には複数の短命な認証情報が使用され、それぞれ単一の目的に限定され、個別に期限切れになります。

## Remote Control と Web版Claude Codeの違い

Remote Controlと[Web版Claude Code](/en/claude-code-on-the-web)はどちらもclaude.ai/codeインターフェースを使用します。主な違いは、セッションが実行される場所です。Remote Controlはあなたのマシン上で実行されるため、ローカルのMCPサーバー、ツール、プロジェクト設定を引き続き利用できます。Web版Claude CodeはAnthropic管理のクラウドインフラ上で実行されます。

ローカル作業の途中で、別のデバイスから作業を続けたい場合はRemote Controlを使用してください。ローカル設定なしでタスクを開始したい場合、クローンしていないリポジトリで作業したい場合、または複数のタスクを並行して実行したい場合はWeb版Claude Codeを使用してください。

## 制限事項

* **同時に1つのリモートセッションのみ**：各Claude Codeセッションは1つのリモート接続のみサポートします。  
* **ターミナルを開いたままにする必要あり**：Remote Controlはローカルプロセスとして実行されます。ターミナルを閉じるか`claude`プロセスを停止すると、セッションは終了します。新しく開始するには再度`claude remote-control`を実行してください。  
* **長時間のネットワーク障害**：マシンが起動していても、約10分以上ネットワークに接続できない状態が続くと、セッションはタイムアウトしてプロセスが終了します。新しいセッションを開始するには再度`claude remote-control`を実行してください。

## 関連リソース

* [Web版Claude Code](/en/claude-code-on-the-web)：マシン上ではなくAnthropic管理のクラウド環境でセッションを実行  
* [Authentication](/en/authentication)：claude.aiの`/login`設定と認証情報の管理  
* [CLI reference](/en/cli-reference)：`claude remote-control`を含むフラグとコマンドの完全一覧  
* [Security](/en/security)：Remote ControlセッションがClaude Codeのセキュリティモデルにどのように組み込まれるか  
* [Data usage](/en/data-usage)：ローカルおよびリモートセッション中にAnthropic APIを通過するデータの内容
