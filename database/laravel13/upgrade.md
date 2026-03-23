## 12.x から 13.0 へのアップグレード

#### 推定アップグレード時間: 10 分

> [!NOTE]
> 可能な限りすべての破壊的変更を文書化しています。ただし、これらの変更の中にはフレームワークのあまり使われない部分に関するものもあり、実際にアプリケーションに影響するのは一部のみである場合があります。時間短縮のために [Shift](https://laravelshift.com) を利用できます。Shift は Laravel のアップグレードを自動化するコミュニティ運営サービスです。

### AI を使用したアップグレード

[Laravel Boost](https://github.com/laravel/boost) を使用してアップグレードを自動化できます。Boost はファーストパーティの MCP サーバーであり、AI アシスタントにガイド付きアップグレードプロンプトを提供します。任意の Laravel 12 アプリケーションにインストールした後、Claude Code、Cursor、OpenCode、Gemini、または VS Code で `/upgrade-laravel-v13` スラッシュコマンドを使用して Laravel 13 へのアップグレードを開始できます。このコマンドには Laravel Boost `^2.0` が必要です。

### 依存関係の更新

**影響の可能性: 高**

アプリケーションの `composer.json` ファイルで、以下の依存関係を更新する必要があります:

<div class="content-list" markdown="1">

- `laravel/framework` を `^13.0` に
- `laravel/boost` を `^2.0` に
- `laravel/tinker` を `^3.0` に
- `phpunit/phpunit` を `^12.0` に
- `pestphp/pest` を `^4.0` に

</div>

### Laravel インストーラーの更新

Laravel インストーラー CLI ツールを使用して新しい Laravel アプリケーションを作成している場合は、Laravel 13.x に対応するようインストーラーを更新してください。

`composer global require` で Laravel インストーラーをインストールした場合は、以下のコマンドで更新できます:

```shell
composer global update laravel/installer
```

または、[Laravel Herd](https://herd.laravel.com) にバンドルされているインストーラーを使用している場合は、Herd を最新バージョンに更新してください。

### キャッシュ

#### キャッシュプレフィックスとセッションクッキー名

**影響の可能性: 低**

Laravel のデフォルトのキャッシュおよび Redis キープレフィックスは、ハイフン区切りのサフィックスを使用するようになりました。また、デフォルトのセッションクッキー名はアプリケーション名に対して `Str::snake(...)` を使用するようになりました。

ほとんどのアプリケーションでは、これらの値はすでにアプリケーションレベルの設定ファイルで定義されているため、この変更は適用されません。これは主に、対応する設定値が存在しない場合にフレームワークのデフォルト設定に依存しているアプリケーションに影響します。

これらの自動生成されたデフォルト値に依存している場合、アップグレード後にキャッシュキーやセッションクッキー名が変更される可能性があります:

```php
// Laravel <= 12.x
Str::slug((string) env('APP_NAME', 'laravel'), '_').'_cache_';
Str::slug((string) env('APP_NAME', 'laravel'), '_').'_database_';
Str::slug((string) env('APP_NAME', 'laravel'), '_').'_session';

// Laravel >= 13.x
Str::slug((string) env('APP_NAME', 'laravel')).'-cache-';
Str::slug((string) env('APP_NAME', 'laravel')).'-database-';
Str::snake((string) env('APP_NAME', 'laravel')).'_session';
```

以前の動作を維持するには、環境設定で `CACHE_PREFIX`、`REDIS_PREFIX`、`SESSION_COOKIE` を明示的に設定してください。

#### `Store` および `Repository` コントラクト: `touch`

**影響の可能性: 非常に低**

キャッシュコントラクトに、アイテムの TTL を延長するための `touch` メソッドが追加されました。カスタムキャッシュストア実装を行っている場合は、このメソッドを追加してください:

```php
// Illuminate\Contracts\Cache\Store
public function touch($key, $seconds);
```

#### Cache `serializable_classes` 設定

**影響の可能性: 中**

デフォルトのアプリケーション `cache` 設定に、`serializable_classes` オプションが追加され、`false` に設定されています。これは、アプリケーションの `APP_KEY` が漏洩した場合の PHP デシリアライズガジェットチェーン攻撃を防ぐため、キャッシュのアンシリアライズ動作を強化するものです。アプリケーションで意図的に PHP オブジェクトをキャッシュに保存している場合は、アンシリアライズを許可するクラスを明示的に指定する必要があります:

```php
'serializable_classes' => [
    App\Data\CachedDashboardStats::class,
    App\Support\CachedPricingSnapshot::class,
],
```

以前に任意のオブジェクトのアンシリアライズに依存していた場合は、明示的なクラス許可リスト、または配列などの非オブジェクト形式のキャッシュへ移行する必要があります。

### コンテナ

#### `Container::call` と Nullable クラスのデフォルト値

**影響の可能性: 低**

`Container::call` は、バインディングが存在しない場合に Nullable クラスパラメータのデフォルト値を尊重するようになりました（Laravel 12 で導入されたコンストラクタインジェクションの挙動と一致）:

```php
$container->call(function (?Carbon $date = null) {
    return $date;
});

// Laravel <= 12.x: Carbon インスタンス
// Laravel >= 13.x: null
```

以前の挙動に依存していた場合は、ロジックの更新が必要になる可能性があります。

### コントラクト

#### `Dispatcher` コントラクト: `dispatchAfterResponse`

**影響の可能性: 非常に低**

`Illuminate\Contracts\Bus\Dispatcher` コントラクトに `dispatchAfterResponse($command, $handler = null)` メソッドが追加されました。

カスタムディスパッチャ実装を行っている場合は、このメソッドを追加してください。

#### `ResponseFactory` コントラクト: `eventStream`

**影響の可能性: 非常に低**

`Illuminate\Contracts\Routing\ResponseFactory` コントラクトに `eventStream` シグネチャが追加されました。

このコントラクトのカスタム実装を行っている場合は、このメソッドを追加してください。

#### `MustVerifyEmail` コントラクト: `markEmailAsUnverified`

**影響の可能性: 非常に低**

`Illuminate\Contracts\Auth\MustVerifyEmail` コントラクトに `markEmailAsUnverified()` が追加されました。

カスタム実装を提供している場合は、このメソッドを追加して互換性を維持してください。

### データベース

#### MySQL の `JOIN`・`ORDER BY`・`LIMIT` を伴う `DELETE` クエリ

**影響の可能性: 低**

Laravel は、MySQL の文法において `ORDER BY` および `LIMIT` を含む完全な `DELETE ... JOIN` クエリを生成するようになりました。

以前のバージョンでは、結合付き削除で `ORDER BY` / `LIMIT` が無視される場合がありましたが、Laravel 13 では生成される SQL に含まれるようになりました。その結果、この構文をサポートしないデータベースエンジン（標準的な MySQL / MariaDB など）では、無制限の削除が実行される代わりに `QueryException` が発生する可能性があります。

### Eloquent

#### モデルのブート処理とネストされたインスタンス生成

**影響の可能性: 非常に低**

モデルのブート中に同じモデルの新しいインスタンスを生成することが禁止され、`LogicException` がスローされるようになりました。

これは、モデルの `boot` メソッドやトレイトの `boot*` メソッド内でモデルをインスタンス化するコードに影響します:

```php
protected static function boot()
{
    parent::boot();

    // ブート中は使用不可...
    (new static())->getTable();
}
```

ネストされたブートを避けるため、このロジックはブートサイクルの外に移動してください。

#### ポリモーフィックなピボットテーブル名の生成

**影響の可能性: 低**

カスタムピボットモデルクラスを使用してポリモーフィックなピボットモデルのテーブル名を推測する場合、Laravel は複数形の名前を生成するようになりました。

以前の単数形の推測名に依存していた場合は、ピボットモデルでテーブル名を明示的に定義してください。

#### コレクションのモデルシリアライズで eager-load 済みリレーションを復元

**影響の可能性: 低**

Eloquent モデルコレクションがシリアライズおよび復元される際（例: キュージョブ内）、eager-load 済みリレーションが復元されるようになりました。

デシリアライズ後にリレーションが存在しないことを前提としていた場合は、ロジックの調整が必要になる可能性があります。

#### `JobAttempted` イベントの例外ペイロード

**影響の可能性：低**

`Illuminate\Queue\Events\JobAttempted` イベントは、これまでの真偽値プロパティ `$exceptionOccurred` の代わりに、例外オブジェクト（または `null`）を `$exception` として公開するようになりました：

```php
// Laravel <= 12.x
$event->exceptionOccurred;

// Laravel >= 13.x
$event->exception;
```

このイベントをリッスンしている場合は、リスナーコードを適宜更新してください。

#### `Queue` コントラクトへのメソッド追加

**影響の可能性：非常に低**

`Illuminate\Contracts\Queue\Queue` コントラクトには、これまでドキュメントコメント（docblock）のみで宣言されていたキューサイズ確認メソッドが追加されました。

このコントラクトのカスタムキュードライバ実装を行っている場合、以下のメソッドを実装してください：

<div class="content-list" markdown="1">

- `pendingSize`
- `delayedSize`
- `reservedSize`
- `creationTimeOfOldestPendingJob`

</div>

### ルーティング

#### ドメインルート登録の優先順位

**影響の可能性：低**

明示的なドメインを持つルートは、ルートマッチング時に非ドメインルートより優先されるようになりました。

これにより、非ドメインルートが先に登録されていても、サブドメインのキャッチオールルートが一貫して動作します。アプリケーションが従来の登録順に依存していた場合は、ルートマッチングの挙動を確認してください。

### スケジューリング

#### `withScheduling` の登録タイミング

**影響の可能性：非常に低**

`ApplicationBuilder::withScheduling()` によって登録されたスケジュールは、`Schedule` が解決されるまで遅延されるようになりました。

アプリケーションがブートストラップ時の即時登録に依存していた場合は、ロジックの調整が必要になる可能性があります。

### セキュリティ

#### リクエスト偽造防止

**影響の可能性：高**

Laravel の CSRF ミドルウェアは `VerifyCsrfToken` から `PreventRequestForgery` に名称変更され、`Sec-Fetch-Site` ヘッダーを使用したリクエスト発信元の検証が追加されました。

`VerifyCsrfToken` および `ValidateCsrfToken` は非推奨のエイリアスとして引き続き利用可能ですが、特にテストやルート定義でミドルウェアを除外する場合は、直接参照を `PreventRequestForgery` に更新してください：

```php
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;

// Laravel <= 12.x
->withoutMiddleware([VerifyCsrfToken::class]);

// Laravel >= 13.x
->withoutMiddleware([PreventRequestForgery::class]);
```

ミドルウェア設定 API では、`preventRequestForgery(...)` も利用可能になりました。

### サポート

#### Manager の `extend` コールバックのバインディング

**影響の可能性：低**

manager の `extend` メソッドで登録されたカスタムドライバクロージャは、現在マネージャインスタンスにバインドされるようになりました。

これまでこれらのコールバック内で `$this` として別のバインドオブジェクト（サービスプロバイダインスタンスなど）を利用していた場合は、その値を `use (...)` によるクロージャキャプチャに移行してください。

#### テスト間での `Str` ファクトリのリセット

**影響の可能性：低**

Laravel はテスト終了時にカスタム `Str` ファクトリをリセットするようになりました。

テストメソッド間で UUID / ULID / ランダム文字列ファクトリが維持されることに依存していた場合は、各テストまたはセットアップフックで設定するようにしてください。

#### `Js::from` がデフォルトで非エスケープUnicodeを使用

**影響の可能性：非常に低**

`Illuminate\Support\Js::from` は、デフォルトで `JSON_UNESCAPED_UNICODE` を使用するようになりました。

テストやフロントエンド出力の比較でエスケープされたUnicodeシーケンス（例：`\u00e8`）に依存していた場合は、期待値を更新してください。

### ビュー

#### ページネーション Bootstrap ビュー名

**影響の可能性：低**

Bootstrap 3 のデフォルトにおける内部ページネーションビュー名が明示的になりました：

```nothing
// Laravel <= 12.x
pagination::default
pagination::simple-default

// Laravel >= 13.x
pagination::bootstrap-3
pagination::simple-bootstrap-3
```

アプリケーションで古いページネーションビュー名を直接参照している場合は、それらを更新してください。

### その他

また、`laravel/laravel` の [GitHub リポジトリ](https://github.com/laravel/laravel) における変更も確認することを推奨します。これらの変更の多くは必須ではありませんが、アプリケーションとファイルを同期させておくとよいでしょう。いくつかの変更はこのアップグレードガイドで取り上げられていますが、設定ファイルやコメントの変更などは含まれていない場合があります。[GitHub 比較ツール](https://github.com/laravel/laravel/compare/12.x...13.x) を使えば変更点を簡単に確認でき、どの更新が重要か選択できます。
