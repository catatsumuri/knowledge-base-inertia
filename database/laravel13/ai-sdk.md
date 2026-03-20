# Laravel AI SDK

## 概要

[Laravel AI SDK](https://github.com/laravel/ai) は、OpenAI、Anthropic、Gemini などのAIプロバイダーとやり取りするための、統一され表現力の高いAPIを提供します。AI SDK を使用すると、ツールや構造化出力を備えたインテリジェントエージェントの構築、画像生成、音声の合成および文字起こし、ベクトル埋め込みの作成などを、Laravel に適した一貫したインターフェースで実現できます。

## インストール

Laravel AI SDK は Composer を使用してインストールできます：

```shell
composer require laravel/ai
```

次に、`vendor:publish` Artisan コマンドを使用して、AI SDK の設定ファイルとマイグレーションファイルを公開します：

```shell
php artisan vendor:publish --provider="Laravel\Ai\AiServiceProvider"
```

最後に、アプリケーションのデータベースマイグレーションを実行する必要があります。これにより、AI SDK が会話ストレージのために使用する `agent_conversations` と `agent_conversation_messages` テーブルが作成されます：

```shell
php artisan migrate
```
### 設定

AIプロバイダの認証情報は、アプリケーションの `config/ai.php` 設定ファイル、または `.env` ファイルの環境変数として定義できます：

```ini
ANTHROPIC_API_KEY=
COHERE_API_KEY=
ELEVENLABS_API_KEY=
GEMINI_API_KEY=
MISTRAL_API_KEY=
OLLAMA_API_KEY=
OPENAI_API_KEY=
JINA_API_KEY=
VOYAGEAI_API_KEY=
XAI_API_KEY=
```

テキスト、画像、音声、文字起こし、埋め込みに使用されるデフォルトモデルも、アプリケーションの `config/ai.php` 設定ファイルで構成できます。


### カスタムベースURL

デフォルトでは、Laravel AI SDKは各プロバイダの公開APIエンドポイントに直接接続します。しかし、別のエンドポイントを経由してリクエストをルーティングする必要がある場合もあります。例えば、APIキー管理を一元化するためのプロキシサービスを使用したり、レート制限を実装したり、企業のゲートウェイを経由してトラフィックをルーティングする場合です。

プロバイダ設定に `url` パラメータを追加することで、カスタムベースURLを設定できます：

```php
'providers' => [
    'openai' => [
        'driver' => 'openai',
        'key' => env('OPENAI_API_KEY'),
        'url' => env('OPENAI_BASE_URL'),
    ],

    'anthropic' => [
        'driver' => 'anthropic',
        'key' => env('ANTHROPIC_API_KEY'),
        'url' => env('ANTHROPIC_BASE_URL'),
    ],
],
```

これは、プロキシサービス（LiteLLMやAzure OpenAI Gatewayなど）を経由してリクエストをルーティングする場合や、代替エンドポイントを使用する場合に有用です。

カスタムベースURLは、以下のプロバイダでサポートされています：OpenAI、Anthropic、Gemini、Groq、Cohere、DeepSeek、xAI、OpenRouter。


### プロバイダサポート

AI SDKは、さまざまな機能にわたって複数のプロバイダをサポートしています。以下の表は、各機能で利用可能なプロバイダをまとめたものです：

| 機能 | プロバイダ |
|---|---|
| テキスト | OpenAI、Anthropic、Gemini、Azure、Groq、xAI、DeepSeek、Mistral、Ollama |
| 画像 | OpenAI、Gemini、xAI |
| TTS | OpenAI、ElevenLabs |
| STT | OpenAI、ElevenLabs、Mistral |
| 埋め込み | OpenAI、Gemini、Azure、Cohere、Mistral、Jina、VoyageAI |
| 再ランキング | Cohere、Jina |
| ファイル | OpenAI、Anthropic、Gemini |

`Laravel\Ai\Enums\Lab` 列挙型は、プレーンな文字列の代わりにコード内でプロバイダを参照するために使用できます：

```php
use Laravel\Ai\Enums\Lab;

Lab::Anthropic;
Lab::OpenAI;
Lab::Gemini;
// ...
```

## エージェント

エージェントは、Laravel AI SDKにおいてAIプロバイダとやり取りするための基本的な構成要素です。各エージェントは専用のPHPクラスであり、大規模言語モデルとやり取りするために必要な指示、会話コンテキスト、ツール、出力スキーマをカプセル化します。エージェントは、専門化されたアシスタント—営業コーチ、ドキュメント分析者、サポートボットなど—として考えることができ、一度設定すればアプリケーション全体で必要に応じてプロンプトとして利用できます。

以下の `make:agent` Artisan コマンドでエージェントを作成できます：

```shell
php artisan make:agent SalesCoach

php artisan make:agent SalesCoach --structured
```

生成されたエージェントクラス内では、システムプロンプト／指示、メッセージコンテキスト、利用可能なツール、出力スキーマ（該当する場合）を定義できます：

```php
<?php

namespace App\Ai\Agents;

use App\Ai\Tools\RetrievePreviousTranscripts;
use App\Models\History;
use App\Models\User;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\Conversational;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Contracts\HasTools;
use Laravel\Ai\Messages\Message;
use Laravel\Ai\Promptable;
use Stringable;

class SalesCoach implements Agent, Conversational, HasTools, HasStructuredOutput
{
    use Promptable;

    public function __construct(public User $user) {}

    /**
     * エージェントが従うべき指示を取得する。
     */
    public function instructions(): Stringable|string
    {
        return 'あなたは営業コーチであり、トランスクリプトを分析し、フィードバックと全体的な営業力スコアを提供します。';
    }

    /**
     * これまでの会話を構成するメッセージ一覧を取得する。
     */
    public function messages(): iterable
    {
        return History::where('user_id', $this->user->id)
            ->latest()
            ->limit(50)
            ->get()
            ->reverse()
            ->map(function ($message) {
                return new Message($message->role, $message->content);
            })->all();
    }

    /**
     * エージェントが利用可能なツールを取得する。
     *
     * @return Tool[]
     */
    public function tools(): iterable
    {
        return [
            new RetrievePreviousTranscripts,
        ];
    }

    /**
     * エージェントの構造化出力スキーマ定義を取得する。
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'feedback' => $schema->string()->required(),
            'score' => $schema->integer()->min(1)->max(10)->required(),
        ];
    }
}
```

### プロンプト

エージェントにプロンプトを送るには、まず `make` メソッドまたは通常のインスタンス化でインスタンスを作成し、その後 `prompt` を呼び出します：

```php
$response = (new SalesCoach)
    ->prompt('この営業トランスクリプトを分析してください...');

return (string) $response;
```

`make` メソッドはコンテナからエージェントを解決し、自動的な依存性注入を可能にします。また、エージェントのコンストラクタに引数を渡すこともできます：

```php
$agent = SalesCoach::make(user: $user);
```

`prompt` メソッドに追加の引数を渡すことで、プロンプト実行時のデフォルトのプロバイダ、モデル、HTTPタイムアウトを上書きできます：

```php
$response = (new SalesCoach)->prompt(
    'この営業トランスクリプトを分析してください...',
    provider: Lab::Anthropic,
    model: 'claude-haiku-4-5-20251001',
    timeout: 120,
);
```


### 会話コンテキスト

エージェントが `Conversational` インターフェースを実装している場合、必要に応じて過去の会話コンテキストを返すために `messages` メソッドを使用できます：

```php
use App\Models\History;
use Laravel\Ai\Messages\Message;

/**
 * これまでの会話を構成するメッセージ一覧を取得します。
 */
public function messages(): iterable
{
    return History::where('user_id', $this->user->id)
        ->latest()
        ->limit(50)
        ->get()
        ->reverse()
        ->map(function ($message) {
            return new Message($message->role, $message->content);
        })->all();
}
```


#### 会話の記憶

> **注意:** `RemembersConversations` トレイトを使用する前に、`vendor:publish` Artisan コマンドを使って AI SDK のマイグレーションを公開・実行してください。これらのマイグレーションは、会話を保存するために必要なデータベーステーブルを作成します。

Laravel にエージェントの会話履歴を自動的に保存・取得させたい場合、`RemembersConversations` トレイトを使用できます。このトレイトは、`Conversational` インターフェースを手動で実装することなく、会話メッセージをデータベースに永続化する簡単な方法を提供します：

```php
<?php

namespace App\Ai\Agents;

use Laravel\Ai\Concerns\RemembersConversations;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\Conversational;
use Laravel\Ai\Promptable;

class SalesCoach implements Agent, Conversational
{
    use Promptable, RemembersConversations;

    /**
     * エージェントが従うべき指示を取得します。
     */
    public function instructions(): string
    {
        return 'あなたは営業コーチです...';
    }
}
```

ユーザーの新しい会話を開始するには、プロンプトの前に `forUser` メソッドを呼び出します：

```php
$response = (new SalesCoach)->forUser($user)->prompt('こんにちは！');

$conversationId = $response->conversationId;
```

会話IDはレスポンスに含まれており、後で参照するために保存できます。または、`agent_conversations` テーブルからユーザーのすべての会話を直接取得することも可能です。

既存の会話を続けるには、`continue` メソッドを使用します：

```php
$response = (new SalesCoach)
    ->continue($conversationId, as: $user)
    ->prompt('その件についてもっと教えてください。');
```

`RemembersConversations` トレイトを使用している場合、過去のメッセージはプロンプト時に自動的に読み込まれ、会話コンテキストに含まれます。また、各やり取り後に新しいメッセージ（ユーザーとアシスタントの両方）が自動的に保存されます。


### 構造化出力

エージェントに構造化された出力を返させたい場合、`HasStructuredOutput` インターフェースを実装し、`schema` メソッドを定義する必要があります：

```php
<?php

namespace App\Ai\Agents;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Promptable;

class SalesCoach implements Agent, HasStructuredOutput
{
    use Promptable;

    // ...

    /**
     * エージェントの構造化出力スキーマ定義を取得します。
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'score' => $schema->integer()->required(),
        ];
    }
}
```

構造化出力を返すエージェントをプロンプトする場合、返却された `StructuredAgentResponse` は配列のようにアクセスできます：

```php
$response = (new SalesCoach)->prompt('この営業トランスクリプトを分析してください...');

return $response['score'];
```


### 添付ファイル

プロンプト時には、モデルが画像やドキュメントを確認できるように添付ファイルを渡すこともできます：

```php
use App\Ai\Agents\SalesCoach;
use Laravel\Ai\Files;

$response = (new SalesCoach)->prompt(
    '添付された営業トランスクリプトを分析してください...',
    attachments: [
        Files\Document::fromStorage('transcript.pdf') // ファイルシステムディスクからドキュメントを添付...
        Files\Document::fromPath('/home/laravel/transcript.md') // ローカルパスからドキュメントを添付...
        $request->file('transcript'), // アップロードされたファイルを添付...
    ]
);
```

同様に、`Laravel\Ai\Files\Image` クラスを使用して画像をプロンプトに添付することもできます：

```php
use App\Ai\Agents\ImageAnalyzer;
use Laravel\Ai\Files;

$response = (new ImageAnalyzer)->prompt(
    'この画像には何が写っていますか？',
    attachments: [
        Files\Image::fromStorage('photo.jpg') // ファイルシステムディスクから画像を添付...
        Files\Image::fromPath('/home/laravel/photo.jpg') // ローカルパスから画像を添付...
        $request->file('photo'), // アップロードされた画像ファイルを添付...
    ]
);
```

### ストリーミング

`stream` メソッドを呼び出すことで、エージェントのレスポンスをストリーミングできます。返される `StreamableAgentResponse` は、ルートから返すことでクライアントへストリーミングレスポンス（SSE）を自動送信できます：

```php
use App\Ai\Agents\SalesCoach;

Route::get('/coach', function () {
    return (new SalesCoach)->stream('この営業トランスクリプトを分析してください...');
});
```

`then` メソッドを使用すると、レスポンス全体がクライアントにストリーミングされた後に呼び出されるクロージャを指定できます：

```php
use App\Ai\Agents\SalesCoach;
use Laravel\Ai\Responses\StreamedAgentResponse;

Route::get('/coach', function () {
    return (new SalesCoach)
        ->stream('この営業トランスクリプトを分析してください...')
        ->then(function (StreamedAgentResponse $response) {
            // $response->text, $response->events, $response->usage...
        });
});
```

または、ストリーミングされたイベントを手動で反復処理することもできます：

```php
$stream = (new SalesCoach)->stream('この営業トランスクリプトを分析してください...');

foreach ($stream as $event) {
    // ...
}
```


#### Vercel AI SDK プロトコルを使用したストリーミング

`usingVercelDataProtocol` メソッドをストリーム可能レスポンスに対して呼び出すことで、[Vercel AI SDK のストリームプロトコル](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol)を使ってイベントをストリーミングできます：

```php
use App\Ai\Agents\SalesCoach;

Route::get('/coach', function () {
    return (new SalesCoach)
        ->stream('この営業トランスクリプトを分析してください...')
        ->usingVercelDataProtocol();
});
```


### ブロードキャスト

ストリーミングされたイベントは、いくつかの方法でブロードキャストできます。まず、ストリーミングイベントに対して `broadcast` または `broadcastNow` メソッドを直接呼び出す方法があります：

```php
use App\Ai\Agents\SalesCoach;
use Illuminate\Broadcasting\Channel;

$stream = (new SalesCoach)->stream('この営業トランスクリプトを分析してください...');

foreach ($stream as $event) {
    $event->broadcast(new Channel('channel-name'));
}
```

または、エージェントの `broadcastOnQueue` メソッドを呼び出して、エージェント処理をキューに入れ、利用可能になり次第ストリーミングイベントをブロードキャストすることもできます：

```php
(new SalesCoach)->broadcastOnQueue(
    'この営業トランスクリプトを分析してください...'
    new Channel('channel-name'),
);
```


### キューイング

エージェントの `queue` メソッドを使用すると、エージェントにプロンプトを送信しつつ、レスポンスの処理をバックグラウンドで行わせることができ、アプリケーションの体感速度と応答性を保てます。`then` と `catch` メソッドを使うことで、レスポンスが利用可能になったとき、または例外が発生したときに呼び出されるクロージャを登録できます：

```php
use Illuminate\Http\Request;
use Laravel\Ai\Responses\AgentResponse;
use Throwable;

Route::post('/coach', function (Request $request) {
    return (new SalesCoach)
        ->queue($request->input('transcript'))
        ->then(function (AgentResponse $response) {
            // ...
        })
        ->catch(function (Throwable $e) {
            // ...
        });

    return back();
});
```


### ツール

ツールは、エージェントがプロンプトに応答する際に利用できる追加機能を提供するために使用されます。ツールは `make:tool` Artisan コマンドを使って作成できます：

```shell
php artisan make:tool RandomNumberGenerator
```

生成されたツールは、アプリケーションの `app/Ai/Tools` ディレクトリに配置されます。各ツールには `handle` メソッドがあり、エージェントがツールを利用する必要がある場合に呼び出されます：

```php
<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class RandomNumberGenerator implements Tool
{
    /**
     * ツールの目的の説明を取得します。
     */
    public function description(): Stringable|string
    {
        return 'このツールは、暗号学的に安全な乱数を生成するために使用できます。';
    }

    /**
     * ツールを実行します。
     */
    public function handle(Request $request): Stringable|string
    {
        return (string) random_int($request['min'], $request['max']);
    }

    /**
     * ツールのスキーマ定義を取得します。
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'min' => $schema->integer()->min(0)->required(),
            'max' => $schema->integer()->required(),
        ];
    }
}
```

ツールを定義した後、任意のエージェントの `tools` メソッドから返すことができます：

```php
use App\Ai\Tools\RandomNumberGenerator;

/**
 * エージェントで利用可能なツールを取得します。
 *
 * @return Tool[]
 */
public function tools(): iterable
{
    return [
        new RandomNumberGenerator,
    ];
}
```


#### 類似度検索

`SimilaritySearch` ツールは、データベースに保存されたベクトル埋め込みを使用して、指定されたクエリに類似するドキュメントを検索できます。これは、エージェントにアプリケーションデータを検索させるための RAG（検索拡張生成）に有用です。

最も簡単な方法は、ベクトル埋め込みを持つ Eloquent モデルとともに `usingModel` メソッドを使用することです：

```php
use App\Models\Document;
use Laravel\Ai\Tools\SimilaritySearch;

public function tools(): iterable
{
    return [
        SimilaritySearch::usingModel(Document::class, 'embedding'),
    ];
}
```

第1引数は Eloquent モデルクラス、第2引数はベクトル埋め込みを含むカラムです。

また、`0.0` から `1.0` の範囲で最小類似度しきい値や、クエリをカスタマイズするクロージャを指定することもできます：

```php
SimilaritySearch::usingModel(
    model: Document::class,
    column: 'embedding',
    minSimilarity: 0.7,
    limit: 10,
    query: fn ($query) => $query->where('published', true),
),
```

さらに柔軟に制御するには、検索結果を返すカスタムクロージャを使って類似度検索ツールを作成できます：

```php
use App\Models\Document;
use Laravel\Ai\Tools\SimilaritySearch;

public function tools(): iterable
{
    return [
        new SimilaritySearch(using: function (string $query) {
            return Document::query()
                ->where('user_id', $this->user->id)
                ->whereVectorSimilarTo('embedding', $query)
                ->limit(10)
                ->get();
        }),
    ];
}
```

`withDescription` メソッドを使ってツールの説明をカスタマイズすることもできます：

```php
SimilaritySearch::usingModel(Document::class, 'embedding')
    ->withDescription('ナレッジベースから関連する記事を検索します。'),
```


### プロバイダーツール

プロバイダーツールは、AIプロバイダーによってネイティブに実装された特別なツールで、ウェブ検索、URL取得、ファイル検索などの機能を提供します。通常のツールとは異なり、これらはアプリケーションではなくプロバイダー側で実行されます。

プロバイダーツールは、エージェントの `tools` メソッドから返すことができます。


#### Web検索

`WebSearch` プロバイダーツールは、エージェントがリアルタイム情報を検索するためにウェブ検索を行えるようにします。これは、現在の出来事や最新データ、モデルの学習カットオフ以降に変化した可能性のあるトピックに関する質問に有用です。

**対応プロバイダー:** Anthropic, OpenAI, Gemini

```php
use Laravel\Ai\Providers\Tools\WebSearch;

public function tools(): iterable
{
    return [
        new WebSearch,
    ];
}
```

検索回数の制限や、特定ドメインへの制限も設定できます：

```php
(new WebSearch)->max(5)->allow(['laravel.com', 'php.net']),
```

ユーザーの位置情報に基づいて検索結果を最適化するには、`location` メソッドを使用します：

```php
(new WebSearch)->location(
    city: 'New York',
    region: 'NY',
    country: 'US'
);
```


#### Web取得

`WebFetch` プロバイダーツールは、ウェブページの内容を取得して読み取ることができます。特定のURLを分析したり、既知のウェブページから詳細情報を取得する場合に有用です。

**対応プロバイダー:** Anthropic, Gemini

```php
use Laravel\Ai\Providers\Tools\WebFetch;

public function tools(): iterable
{
    return [
        new WebFetch,
    ];
}
```

取得回数の制限や、特定ドメインへの制限も設定できます：

```php
(new WebFetch)->max(3)->allow(['docs.laravel.com']),
```


#### ファイル検索

`FileSearch` プロバイダーツールは、[ファイル](#files)を[ベクトルストア](#vector-stores)内から検索できます。これにより、アップロードされたドキュメントから関連情報を検索できる RAG（検索拡張生成）が実現されます。

**対応プロバイダー:** OpenAI, Gemini

```php
use Laravel\Ai\Providers\Tools\FileSearch;

public function tools(): iterable
{
    return [
        new FileSearch(stores: ['store_id']),
    ];
}
```

複数のベクトルストアIDを指定して横断検索することもできます：

```php
new FileSearch(stores: ['store_1', 'store_2']);
```

ファイルに[メタデータ](#adding-files-to-stores)がある場合、`where` 引数を指定して検索結果をフィルタリングできます。単純な一致条件の場合は配列で指定します：

```php
new FileSearch(stores: ['store_id'], where: [
    'author' => 'Taylor Otwell',
    'year' => 2026,
]);
```

より複雑な条件には、`FileSearchQuery` インスタンスを受け取るクロージャを使用できます：

```php
use Laravel\Ai\Providers\Tools\FileSearchQuery;

new FileSearch(stores: ['store_id'], where: fn (FileSearchQuery $query) =>
    $query->where('author', 'Taylor Otwell')
        ->whereNot('status', 'draft')
        ->whereIn('category', ['news', 'updates'])
);
```

### ミドルウェア

エージェントはミドルウェアをサポートしており、プロンプトがプロバイダに送信される前にそれを横取りして変更できます。ミドルウェアは、`make:agent-middleware` Artisan コマンドを使用して作成できます：

```shell
php artisan make:agent-middleware LogPrompts
```

生成されたミドルウェアは、アプリケーションの `app/Ai/Middleware` ディレクトリに配置されます。エージェントにミドルウェアを追加するには、`HasMiddleware` インターフェースを実装し、ミドルウェアクラスの配列を返す `middleware` メソッドを定義します：

```php
<?php

namespace App\Ai\Agents;

use App\Ai\Middleware\LogPrompts;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasMiddleware;
use Laravel\Ai\Promptable;

class SalesCoach implements Agent, HasMiddleware
{
    use Promptable;

    // ...

    /**
     * エージェントのミドルウェアを取得する
     */
    public function middleware(): array
    {
        return [
            new LogPrompts,
        ];
    }
}
```

各ミドルウェアクラスは、`AgentPrompt` と次のミドルウェアへプロンプトを渡すための `Closure` を受け取る `handle` メソッドを定義する必要があります：

```php
<?php

namespace App\Ai\Middleware;

use Closure;
use Laravel\Ai\Prompts\AgentPrompt;

class LogPrompts
{
    /**
     * 受信したプロンプトを処理する
     */
    public function handle(AgentPrompt $prompt, Closure $next)
    {
        Log::info('エージェントにプロンプト送信', ['prompt' => $prompt->prompt]);

        return $next($prompt);
    }
}
```

エージェントが処理を完了した後にコードを実行するには、レスポンスの `then` メソッドを使用できます。これは同期・ストリーミングの両方のレスポンスで動作します：

```php
public function handle(AgentPrompt $prompt, Closure $next)
{
    return $next($prompt)->then(function (AgentResponse $response) {
        Log::info('エージェントの応答', ['text' => $response->text]);
    });
}
```


### 匿名エージェント

専用のエージェントクラスを作成せずに、モデルと素早くやり取りしたい場合があります。その場合、`agent` 関数を使用してアドホックな匿名エージェントを作成できます：

```php
use function Laravel\Ai\{agent};

$response = agent(
    instructions: 'あなたはソフトウェア開発の専門家です。',
    messages: [],
    tools: [],
)->prompt('Laravel について教えて')
```

匿名エージェントは構造化された出力も生成できます：

```php
use Illuminate\Contracts\JsonSchema\JsonSchema;

use function Laravel\Ai\{agent};

$response = agent(
    schema: fn (JsonSchema $schema) => [
        'number' => $schema->integer()->required(),
    ],
)->prompt('100 未満のランダムな数値を生成してください')
```

### エージェント設定

PHP の属性を使用して、エージェントのテキスト生成オプションを設定できます。利用可能な属性は以下の通りです：

- `MaxSteps`: ツール使用時にエージェントが実行できる最大ステップ数
- `MaxTokens`: モデルが生成できる最大トークン数
- `Model`: エージェントが使用するモデル
- `Provider`: エージェントで使用する AI プロバイダ（フェイルオーバー用に複数指定可能）
- `Temperature`: 生成時のサンプリング温度（0.0〜1.0）
- `Timeout`: エージェントリクエストの HTTP タイムアウト（秒、デフォルト: 60）
- `UseCheapestModel`: コスト最適化のためにプロバイダの最安モデルを使用
- `UseSmartestModel`: 複雑なタスクのために最も高性能なモデルを使用

```php
<?php

namespace App\Ai\Agents;

use Laravel\Ai\Attributes\MaxSteps;
use Laravel\Ai\Attributes\MaxTokens;
use Laravel\Ai\Attributes\Model;
use Laravel\Ai\Attributes\Provider;
use Laravel\Ai\Attributes\Temperature;
use Laravel\Ai\Attributes\Timeout;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Enums\Lab;
use Laravel\Ai\Promptable;

#[Provider(Lab::Anthropic)]
#[Model('claude-haiku-4-5-20251001')]
#[MaxSteps(10)]
#[MaxTokens(4096)]
#[Temperature(0.7)]
#[Timeout(120)]
class SalesCoach implements Agent
{
    use Promptable;

    // ...
}
```

`UseCheapestModel` と `UseSmartestModel` 属性を使用すると、モデル名を指定せずに、指定したプロバイダ内で最もコスト効率の良いモデルまたは最も高性能なモデルを自動的に選択できます。これは、プロバイダ間でコストや性能を最適化したい場合に有用です：

```php
use Laravel\Ai\Attributes\UseCheapestModel;
use Laravel\Ai\Attributes\UseSmartestModel;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Promptable;

#[UseCheapestModel]
class SimpleSummarizer implements Agent
{
    use Promptable;

    // 最安のモデル（例：Haiku）を使用...
}

#[UseSmartestModel]
class ComplexReasoner implements Agent
{
    use Promptable;

    // 最も高性能なモデル（例：Opus）を使用...
}
```


### プロバイダオプション

エージェントがプロバイダ固有のオプション（OpenAI の推論負荷やペナルティ設定など）を渡す必要がある場合は、`HasProviderOptions` コントラクトを実装し、`providerOptions` メソッドを定義します：

```php
<?php

namespace App\Ai\Agents;

use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasProviderOptions;
use Laravel\Ai\Enums\Lab;
use Laravel\Ai\Promptable;

class SalesCoach implements Agent, HasProviderOptions
{
    use Promptable;

    // ...

    /**
     * プロバイダ固有の生成オプションを取得する
     */
    public function providerOptions(Lab|string $provider): array
    {
        return match ($provider) {
            Lab::OpenAI => [
                'reasoning' => ['effort' => 'low'],
                'frequency_penalty' => 0.5,
                'presence_penalty' => 0.3,
            ],
            Lab::Anthropic => [
                'thinking' => ['budget_tokens' => 1024],
            ],
            default => [],
        };
    }
}
```

`providerOptions` メソッドは現在使用されているプロバイダ（`Lab` enum または文字列）を受け取り、プロバイダごとに異なるオプションを返すことができます。これは、[フェイルオーバー](#failover) を使用する場合に特に有用で、各フォールバックプロバイダに個別の設定を適用できます。


## 画像

`Laravel\Ai\Image` クラスは、`openai`、`gemini`、または `xai` プロバイダーを使用して画像を生成するために使用できます：

```php
use Laravel\Ai\Image;

$image = Image::of('キッチンカウンターの上に置かれたドーナツ')->generate();

$rawContent = (string) $image;
```

`square`、`portrait`、`landscape` メソッドを使用して画像のアスペクト比を制御でき、`quality` メソッドを使用して最終的な画像品質（`high`、`medium`、`low`）をモデルに指示できます。また、`timeout` メソッドでHTTPタイムアウト（秒）を指定できます：

```php
use Laravel\Ai\Image;

$image = Image::of('キッチンカウンターの上に置かれたドーナツ')
    ->quality('high')
    ->landscape()
    ->timeout(120)
    ->generate();
```

`attachments` メソッドを使用して参照画像を添付することもできます：

```php
use Laravel\Ai\Files;
use Laravel\Ai\Image;

$image = Image::of('この写真の自分を印象派の絵画風に変更してください。')
    ->attachments([
        Files\Image::fromStorage('photo.jpg'),
        // Files\Image::fromPath('/home/laravel/photo.jpg'),
        // Files\Image::fromUrl('https://example.com/photo.jpg'),
        // $request->file('photo'),
    ])
    ->landscape()
    ->generate();
```

生成された画像は、アプリケーションの `config/filesystems.php` 設定ファイルで構成されたデフォルトディスクに簡単に保存できます：

```php
$image = Image::of('キッチンカウンターの上に置かれたドーナツ');

$path = $image->store();
$path = $image->storeAs('image.jpg');
$path = $image->storePublicly();
$path = $image->storePubliclyAs('image.jpg');
```

画像生成はキューに入れることも可能です：

```php
use Laravel\Ai\Image;
use Laravel\Ai\Responses\ImageResponse;

Image::of('キッチンカウンターの上に置かれたドーナツ')
    ->portrait()
    ->queue()
    ->then(function (ImageResponse $image) {
        $path = $image->store();

        // ...
    });
```


## 音声

`Laravel\Ai\Audio` クラスは、指定されたテキストから音声を生成するために使用できます：

```php
use Laravel\Ai\Audio;

$audio = Audio::of('Laravelでコーディングするのが大好きです。')->generate();

$rawContent = (string) $audio;
```

`male`、`female`、`voice` メソッドを使用して生成される音声の声を指定できます：

```php
$audio = Audio::of('Laravelでコーディングするのが大好きです。')
    ->female()
    ->generate();

$audio = Audio::of('Laravelでコーディングするのが大好きです。')
    ->voice('voice-id-or-name')
    ->generate();
```

同様に、`instructions` メソッドを使用して生成される音声の話し方を動的に指示することもできます：

```php
$audio = Audio::of('Laravelでコーディングするのが大好きです。')
    ->female()
    ->instructions('海賊のように話す')
    ->generate();
```

生成された音声は、アプリケーションの `config/filesystems.php` 設定ファイルで構成されたデフォルトディスクに簡単に保存できます：

```php
$audio = Audio::of('Laravelでコーディングするのが大好きです。')->generate();

$path = $audio->store();
$path = $audio->storeAs('audio.mp3');
$path = $audio->storePublicly();
$path = $audio->storePubliclyAs('audio.mp3');
```

音声生成もキューに入れることができます：

```php
use Laravel\Ai\Audio;
use Laravel\Ai\Responses\AudioResponse;

Audio::of('Laravelでコーディングするのが大好きです。')
    ->queue()
    ->then(function (AudioResponse $audio) {
        $path = $audio->store();

        // ...
    });
```


## 文字起こし

`Laravel\Ai\Transcription` クラスは、指定された音声の文字起こしを生成するために使用できます：

```php
use Laravel\Ai\Transcription;

$transcript = Transcription::fromPath('/home/laravel/audio.mp3')->generate();
$transcript = Transcription::fromStorage('audio.mp3')->generate();
$transcript = Transcription::fromUpload($request->file('audio'))->generate();

return (string) $transcript;
```

`diarize` メソッドを使用すると、生のテキスト文字起こしに加えて話者ごとに分割された文字起こし（ダイアライズ）を含めるよう指定できます：

```php
$transcript = Transcription::fromStorage('audio.mp3')
    ->diarize()
    ->generate();
```

文字起こしの生成もキューに入れることができます：

```php
use Laravel\Ai\Transcription;
use Laravel\Ai\Responses\TranscriptionResponse;

Transcription::fromStorage('audio.mp3')
    ->queue()
    ->then(function (TranscriptionResponse $transcript) {
        // ...
    });
```


## 埋め込み（Embeddings）

Laravelの `Stringable` クラスで利用可能な新しい `toEmbeddings` メソッドを使用して、任意の文字列のベクトル埋め込みを簡単に生成できます：

```php
use Illuminate\Support\Str;

$embeddings = Str::of('ナパバレーには素晴らしいワインがあります。')->toEmbeddings();
```

または、`Embeddings` クラスを使用して複数の入力に対する埋め込みを一度に生成することもできます：

```php
use Laravel\Ai\Embeddings;

$response = Embeddings::for([
    'ナパバレーには素晴らしいワインがあります。',
    'LaravelはPHPのフレームワークです。',
])->generate();

$response->embeddings; // [[0.123, 0.456, ...], [0.789, 0.012, ...]]
```

埋め込みの次元数やプロバイダーを指定することも可能です：

```php
$response = Embeddings::for(['ナパバレーには素晴らしいワインがあります。'])
    ->dimensions(1536)
    ->generate(Lab::OpenAI, 'text-embedding-3-small');
```


### 埋め込みのクエリ

埋め込みを生成した後は、通常それらをデータベースの `vector` カラムに保存して後でクエリします。Laravelは `pgvector` 拡張を使用したPostgreSQLのベクトルカラムをネイティブサポートしています。まず、マイグレーションで次元数を指定して `vector` カラムを定義します：

```php
Schema::ensureVectorExtensionExists();

Schema::create('documents', function (Blueprint $table) {
    $table->id();
    $table->string('title');
    $table->text('content');
    $table->vector('embedding', dimensions: 1536);
    $table->timestamps();
});
```

類似検索を高速化するためにベクトルインデックスを追加することもできます。ベクトルカラムで `index` を呼び出すと、Laravelは自動的にコサイン距離を使用したHNSWインデックスを作成します：

```php
$table->vector('embedding', dimensions: 1536)->index();
```

Eloquentモデルでは、ベクトルカラムを `array` にキャストする必要があります：

```php
protected function casts(): array
{
    return [
        'embedding' => 'array',
    ];
}
```

類似レコードをクエリするには、`whereVectorSimilarTo` メソッドを使用します。このメソッドは最小コサイン類似度（`0.0`〜`1.0`、`1.0`が完全一致）で結果をフィルタし、類似度で並べ替えます：

```php
use App\Models\Document;

$documents = Document::query()
    ->whereVectorSimilarTo('embedding', $queryEmbedding, minSimilarity: 0.4)
    ->limit(10)
    ->get();
```

`$queryEmbedding` は浮動小数点配列またはプレーンな文字列にできます。文字列が指定された場合、Laravelは自動的にその埋め込みを生成します：

```php
$documents = Document::query()
    ->whereVectorSimilarTo('embedding', 'ナパバレーで最高のワイナリー')
    ->limit(10)
    ->get();
```

より詳細な制御が必要な場合は、低レベルの `whereVectorDistanceLessThan`、`selectVectorDistance`、`orderByVectorDistance` メソッドを個別に使用できます：

```php
$documents = Document::query()
    ->select('*')
    ->selectVectorDistance('embedding', $queryEmbedding, as: 'distance')
    ->whereVectorDistanceLessThan('embedding', $queryEmbedding, maxDistance: 0.3)
    ->orderByVectorDistance('embedding', $queryEmbedding)
    ->limit(10)
    ->get();
```

エージェントに類似検索をツールとして実行させたい場合は、[Similarity Search](#similarity-search) ツールドキュメントを確認してください。

> [!NOTE]
> 現在、ベクトルクエリは `pgvector` 拡張を使用するPostgreSQL接続でのみサポートされています。


### 埋め込みのキャッシュ

埋め込み生成は、同一入力に対する冗長なAPI呼び出しを避けるためにキャッシュできます。キャッシュを有効にするには、`ai.caching.embeddings.cache` 設定オプションを `true` に設定します：

```php
'caching' => [
    'embeddings' => [
        'cache' => true,
        'store' => env('CACHE_STORE', 'database'),
        // ...
    ],
],
```

キャッシュが有効な場合、埋め込みは30日間キャッシュされます。キャッシュキーはプロバイダー、モデル、次元数、入力内容に基づいており、同一リクエストはキャッシュ結果を返し、異なる設定では新たな埋め込みが生成されます。

グローバルキャッシュが無効でも、`cache` メソッドを使用して特定のリクエストに対してキャッシュを有効にできます：

```php
$response = Embeddings::for(['ナパバレーには素晴らしいワインがあります。'])
    ->cache()
    ->generate();
```

秒単位でカスタムキャッシュ期間を指定することもできます：

```php
$response = Embeddings::for(['ナパバレーには素晴らしいワインがあります。'])
    ->cache(seconds: 3600) // 1時間キャッシュ
    ->generate();
```

`toEmbeddings` の Stringable メソッドも `cache` 引数を受け取ります：

```php
// デフォルト期間でキャッシュ...
$embeddings = Str::of('ナパバレーには素晴らしいワインがあります。')->toEmbeddings(cache: true);

// 特定期間でキャッシュ...
$embeddings = Str::of('ナパバレーには素晴らしいワインがあります。')->toEmbeddings(cache: 3600);
```

## リランキング

リランキングは、指定されたクエリに対する関連性に基づいてドキュメントのリストを並べ替えることを可能にします。これはセマンティック理解を用いて検索結果を改善するのに有用です：

`Laravel\Ai\Reranking` クラスを使用してドキュメントをリランキングできます：

```php
use Laravel\Ai\Reranking;

$response = Reranking::of([
    'DjangoはPythonのWebフレームワークです。',
    'LaravelはPHPのWebアプリケーションフレームワークです。',
    'Reactはユーザーインターフェース構築のためのJavaScriptライブラリです。',
])->rerank('PHPフレームワーク');

// 上位結果にアクセス...
$response->first()->document; // "LaravelはPHPのWebアプリケーションフレームワークです。"
$response->first()->score;    // 0.95
$response->first()->index;    // 1（元の位置）
```

`limit` メソッドを使用して返される結果数を制限できます：

```php
$response = Reranking::of($documents)
    ->limit(5)
    ->rerank('検索クエリ');
```



利便性のため、Laravelコレクションは `rerank` マクロを使用してリランキングできます。第1引数はリランキングに使用するフィールド、第2引数はクエリです：

```php
// 単一フィールドでリランキング...
$posts = Post::all()
    ->rerank('body', 'Laravelチュートリアル');

// 複数フィールドでリランキング（JSONとして送信）...
$reranked = $posts->rerank(['title', 'body'], 'Laravelチュートリアル');

// クロージャでドキュメントを構築してリランキング...
$reranked = $posts->rerank(
    fn ($post) => $post->title.': '.$post->body,
    'Laravelチュートリアル'
);
```

結果数の制限やプロバイダーの指定も可能です：

```php
$reranked = $posts->rerank(
    by: 'content',
    query: 'Laravelチュートリアル',
    limit: 10,
    provider: Lab::Cohere
);
```


## ファイル

`Laravel\Ai\Files` クラス、または個々のファイルクラスを使用して、AIプロバイダにファイルを保存し、後の会話で再利用できます。これは、大きなドキュメントや、再アップロードせずに何度も参照したいファイルに有用です：

```php
use Laravel\Ai\Files\Document;
use Laravel\Ai\Files\Image;

// ローカルパスからファイルを保存...
$response = Document::fromPath('/home/laravel/document.pdf')->put();
$response = Image::fromPath('/home/laravel/photo.jpg')->put();

// ファイルシステムディスク上のファイルを保存...
$response = Document::fromStorage('document.pdf', disk: 'local')->put();
$response = Image::fromStorage('photo.jpg', disk: 'local')->put();

// リモートURL上のファイルを保存...
$response = Document::fromUrl('https://example.com/document.pdf')->put();
$response = Image::fromUrl('https://example.com/photo.jpg')->put();

return $response->id;
```

生のコンテンツやアップロードされたファイルを保存することもできます：

```php
use Laravel\Ai\Files;
use Laravel\Ai\Files\Document;

// 生のコンテンツを保存...
$stored = Document::fromString('Hello, World!', 'text/plain')->put();

// アップロードされたファイルを保存...
$stored = Document::fromUpload($request->file('document'))->put();
```

一度ファイルを保存すると、エージェントでテキスト生成を行う際に、再アップロードする代わりにそのファイルを参照できます：

```php
use App\Ai\Agents\SalesCoach;
use Laravel\Ai\Files;

$response = (new SalesCoach)->prompt(
    '添付された営業トランスクリプトを分析してください...'
    attachments: [
        Files\Document::fromId('file-id') // 保存済みドキュメントを添付...
    ]
);
```

保存済みファイルを取得するには、ファイルインスタンスの `get` メソッドを使用します：

```php
use Laravel\Ai\Files\Document;

$file = Document::fromId('file-id')->get();

$file->id;
$file->mimeType();
```

プロバイダからファイルを削除するには、`delete` メソッドを使用します：

```php
Document::fromId('file-id')->delete();
```

デフォルトでは、`Files` クラスはアプリケーションの `config/ai.php` 設定ファイルで構成されたデフォルトのAIプロバイダを使用します。ほとんどの操作では、`provider` 引数を使用して別のプロバイダを指定できます：

```php
$response = Document::fromPath(
    '/home/laravel/document.pdf'
)->put(provider: Lab::Anthropic);
```


### 会話で保存済みファイルを使用する

プロバイダにファイルを保存した後、`Document` または `Image` クラスの `fromId` メソッドを使用して、エージェントの会話内で参照できます：

```php
use App\Ai\Agents\DocumentAnalyzer;
use Laravel\Ai\Files;
use Laravel\Ai\Files\Document;

$stored = Document::fromPath('/path/to/report.pdf')->put();

$response = (new DocumentAnalyzer)->prompt(
    'このドキュメントを要約してください。',
    attachments: [
        Document::fromId($stored->id),
    ],
);
```

同様に、保存済み画像は `Image` クラスを使用して参照できます：

```php
use Laravel\Ai\Files;
use Laravel\Ai\Files\Image;

$stored = Image::fromPath('/path/to/photo.jpg')->put();

$response = (new ImageAnalyzer)->prompt(
    'この画像には何が写っていますか？',
    attachments: [
        Image::fromId($stored->id),
    ],
);
```


## ベクターストア

ベクターストアは、検索可能なファイルコレクションを作成し、検索拡張生成（RAG）に利用できます。`Laravel\Ai\Stores` クラスは、ベクターストアの作成・取得・削除のためのメソッドを提供します：

```php
use Laravel\Ai\Stores;

// 新しいベクターストアを作成...
$store = Stores::create('Knowledge Base');

// 追加オプション付きで作成...
$store = Stores::create(
    name: 'Knowledge Base',
    description: 'ドキュメントおよび参照資料。',
    expiresWhenIdleFor: days(30),
);

return $store->id;
```

既存のベクターストアをIDで取得するには、`get` メソッドを使用します：

```php
use Laravel\Ai\Stores;

$store = Stores::get('store_id');

$store->id;
$store->name;
$store->fileCounts;
$store->ready;
```

ベクターストアを削除するには、`Stores` クラスまたはストアインスタンスの `delete` メソッドを使用します：

```php
use Laravel\Ai\Stores;

// IDで削除...
Stores::delete('store_id');

// またはインスタンス経由で削除...
$store = Stores::get('store_id');

$store->delete();
```


### ストアにファイルを追加する

ベクターストアを作成した後、`add` メソッドを使用して[ファイル](#files)を追加できます。ストアに追加されたファイルは、[ファイル検索プロバイダツール](#file-search)を使用したセマンティック検索のために自動的にインデックス化されます：

```php
use Laravel\Ai\Files\Document;
use Laravel\Ai\Stores;

$store = Stores::get('store_id');

// すでにプロバイダに保存されているファイルを追加...
$document = $store->add('file_id');
$document = $store->add(Document::fromId('file_id'));

// または、保存と追加を同時に実行...
$document = $store->add(Document::fromPath('/path/to/document.pdf'));
$document = $store->add(Document::fromStorage('manual.pdf'));
$document = $store->add($request->file('document'));

$document->id;
$document->fileId;
```

> **注意:** 既に保存されているファイルをベクターストアに追加する場合、通常は返されるドキュメントIDは元のファイルIDと一致しますが、一部のベクターストレージプロバイダでは新しい「ドキュメントID」が返されることがあります。そのため、将来の参照のために両方のIDをデータベースに保存しておくことが推奨されます。

ストアにファイルを追加する際にメタデータを付与することもできます。このメタデータは、[ファイル検索プロバイダツール](#file-search)使用時に検索結果のフィルタリングに利用できます：

```php
$store->add(Document::fromPath('/path/to/document.pdf'), metadata: [
    'author' => 'Taylor Otwell',
    'department' => 'Engineering',
    'year' => 2026,
]);
```

ストアからファイルを削除するには、`remove` メソッドを使用します：

```php
$store->remove('file_id');
```

ベクターストアからファイルを削除しても、プロバイダの[ファイルストレージ](#files)からは削除されません。ベクターストアから削除すると同時にファイルストレージからも完全に削除するには、`deleteFile` 引数を使用します：

```php
$store->remove('file_abc123', deleteFile: true);
```

## フェイルオーバー

プロンプト送信やその他メディア生成の際に、複数のプロバイダ／モデルの配列を指定することで、プライマリプロバイダでサービス障害やレート制限が発生した場合に、自動的にバックアップへフェイルオーバーできます：

```php
use App\Ai\Agents\SalesCoach;
use Laravel\Ai\Image;

$response = (new SalesCoach)->prompt(
    'この営業トランスクリプトを分析してください...',
    provider: [Lab::OpenAI, Lab::Anthropic],
);

$image = Image::of('キッチンカウンターの上に置かれたドーナツ')
    ->generate(provider: [Lab::Gemini, Lab::xAI]);
```

## テスト


### エージェント

テスト中にエージェントの応答を偽装するには、エージェントクラスの `fake` メソッドを呼び出します。レスポンスの配列やクロージャを任意で提供できます：

```php
use App\Ai\Agents\SalesCoach;
use Laravel\Ai\Prompts\AgentPrompt;

// すべてのプロンプトに対して固定レスポンスを自動生成...
SalesCoach::fake();

// プロンプトのレスポンス一覧を提供...
SalesCoach::fake([
    '最初のレスポンス',
    '2番目のレスポンス',
]);

// 受信したプロンプトに基づいて動的にレスポンスを処理...
SalesCoach::fake(function (AgentPrompt $prompt) {
    return 'レスポンス: '.$prompt->prompt;
});
```

> **注意:** 構造化出力を返すエージェントに対して `Agent::fake()` を呼び出すと、Laravel はエージェントで定義された出力スキーマに一致するフェイクデータを自動生成します。

エージェントにプロンプトを送信した後、受信されたプロンプトに対してアサーションを行うことができます：

```php
use Laravel\Ai\Prompts\AgentPrompt;

SalesCoach::assertPrompted('これを分析...');

SalesCoach::assertPrompted(function (AgentPrompt $prompt) {
    return $prompt->contains('Analyze');
});

SalesCoach::assertNotPrompted('存在しないプロンプト');

SalesCoach::assertNeverPrompted();
```

キューに入れられたエージェント呼び出しについては、キュー用のアサーションメソッドを使用します：

```php
use Laravel\Ai\QueuedAgentPrompt;

SalesCoach::assertQueued('これを分析...');

SalesCoach::assertQueued(function (QueuedAgentPrompt $prompt) {
    return $prompt->contains('Analyze');
});

SalesCoach::assertNotQueued('存在しないプロンプト');

SalesCoach::assertNeverQueued();
```

すべてのエージェント呼び出しに対応するフェイクレスポンスがあることを保証するには、`preventStrayPrompts` を使用できます。定義されていないフェイクレスポンスでエージェントが呼び出された場合、例外がスローされます：

```php
SalesCoach::fake()->preventStrayPrompts();
```


### 画像

画像生成は、`Image` クラスの `fake` メソッドを呼び出すことで偽装できます。画像がフェイク化された後、記録された画像生成プロンプトに対してさまざまなアサーションを実行できます：

```php
use Laravel\Ai\Image;
use Laravel\Ai\Prompts\ImagePrompt;
use Laravel\Ai\Prompts\QueuedImagePrompt;

// すべてのプロンプトに対して固定レスポンスを自動生成...
Image::fake();

// プロンプトのレスポンス一覧を提供...
Image::fake([
    base64_encode($firstImage),
    base64_encode($secondImage),
]);

// 受信したプロンプトに基づいて動的にレスポンスを処理...
Image::fake(function (ImagePrompt $prompt) {
    return base64_encode('...');
});
```

画像生成後、受信されたプロンプトに対してアサーションを行うことができます：

```php
Image::assertGenerated(function (ImagePrompt $prompt) {
    return $prompt->contains('sunset') && $prompt->isLandscape();
});

Image::assertNotGenerated('存在しないプロンプト');

Image::assertNothingGenerated();
```

キューに入れられた画像生成については、キュー用のアサーションメソッドを使用します：

```php
Image::assertQueued(
    fn (QueuedImagePrompt $prompt) => $prompt->contains('sunset')
);

Image::assertNotQueued('存在しないプロンプト');

Image::assertNothingQueued();
```

すべての画像生成に対応するフェイクレスポンスがあることを保証するには、`preventStrayImages` を使用できます。定義されていないフェイクレスポンスで画像が生成された場合、例外がスローされます：

```php
Image::fake()->preventStrayImages();
```


### 音声

音声生成は、`Audio` クラスの `fake` メソッドを呼び出すことで偽装できます。音声がフェイク化された後、記録された音声生成プロンプトに対してさまざまなアサーションを実行できます：

```php
use Laravel\Ai\Audio;
use Laravel\Ai\Prompts\AudioPrompt;
use Laravel\Ai\Prompts\QueuedAudioPrompt;

// すべてのプロンプトに対して固定レスポンスを自動生成...
Audio::fake();

// プロンプトのレスポンス一覧を提供...
Audio::fake([
    base64_encode($firstAudio),
    base64_encode($secondAudio),
]);

// 受信したプロンプトに基づいて動的にレスポンスを処理...
Audio::fake(function (AudioPrompt $prompt) {
    return base64_encode('...');
});
```

音声生成後、受信されたプロンプトに対してアサーションを行うことができます：

```php
Audio::assertGenerated(function (AudioPrompt $prompt) {
    return $prompt->contains('Hello') && $prompt->isFemale();
});

Audio::assertNotGenerated('存在しないプロンプト');

Audio::assertNothingGenerated();
```

キューに入れられた音声生成については、キュー用のアサーションメソッドを使用します：

```php
Audio::assertQueued(
    fn (QueuedAudioPrompt $prompt) => $prompt->contains('Hello')
);

Audio::assertNotQueued('存在しないプロンプト');

Audio::assertNothingQueued();
```

すべての音声生成に対応するフェイクレスポンスがあることを保証するには、`preventStrayAudio` を使用できます。定義されていないフェイクレスポンスで音声が生成された場合、例外がスローされます：

```php
Audio::fake()->preventStrayAudio();
```


### 文字起こし

文字起こし生成は、`Transcription` クラスの `fake` メソッドを呼び出すことで偽装できます。文字起こしがフェイク化された後、記録された文字起こし生成プロンプトに対してさまざまなアサーションを実行できます：

```php
use Laravel\Ai\Transcription;
use Laravel\Ai\Prompts\TranscriptionPrompt;
use Laravel\Ai\Prompts\QueuedTranscriptionPrompt;

// すべてのプロンプトに対して固定レスポンスを自動生成...
Transcription::fake();

// プロンプトのレスポンス一覧を提供...
Transcription::fake([
    '最初の文字起こしテキスト。',
    '2番目の文字起こしテキスト。',
]);

// 受信したプロンプトに基づいて動的にレスポンスを処理...
Transcription::fake(function (TranscriptionPrompt $prompt) {
    return '文字起こしされたテキスト...';
});
```

文字起こし生成後、受信されたプロンプトに対してアサーションを行うことができます：

```php
Transcription::assertGenerated(function (TranscriptionPrompt $prompt) {
    return $prompt->language === 'en' && $prompt->isDiarized();
});

Transcription::assertNotGenerated(
    fn (TranscriptionPrompt $prompt) => $prompt->language === 'fr'
);

Transcription::assertNothingGenerated();
```

キューに入れられた文字起こし生成については、キュー用のアサーションメソッドを使用します：

```php
Transcription::assertQueued(
    fn (QueuedTranscriptionPrompt $prompt) => $prompt->isDiarized()
);

Transcription::assertNotQueued(
    fn (QueuedTranscriptionPrompt $prompt) => $prompt->language === 'fr'
);

Transcription::assertNothingQueued();
```

すべての文字起こし生成に対応するフェイクレスポンスがあることを保証するには、`preventStrayTranscriptions` を使用できます。定義されていないフェイクレスポンスで文字起こしが生成された場合、例外がスローされます：

```php
Transcription::fake()->preventStrayTranscriptions();
```


### 埋め込み（Embeddings）

埋め込み生成は、`Embeddings` クラスの `fake` メソッドを呼び出すことで偽装できます。埋め込みがフェイク化された後、記録された埋め込み生成プロンプトに対してさまざまなアサーションを実行できます：

```php
use Laravel\Ai\Embeddings;
use Laravel\Ai\Prompts\EmbeddingsPrompt;
use Laravel\Ai\Prompts\QueuedEmbeddingsPrompt;

// すべてのプロンプトに対して適切な次元のフェイク埋め込みを自動生成...
Embeddings::fake();

// プロンプトのレスポンス一覧を提供...
Embeddings::fake([
    [$firstEmbeddingVector],
    [$secondEmbeddingVector],
]);

// 受信したプロンプトに基づいて動的にレスポンスを処理...
Embeddings::fake(function (EmbeddingsPrompt $prompt) {
    return array_map(
        fn () => Embeddings::fakeEmbedding($prompt->dimensions),
        $prompt->inputs
    );
});
```

埋め込み生成後、受信されたプロンプトに対してアサーションを行うことができます：

```php
Embeddings::assertGenerated(function (EmbeddingsPrompt $prompt) {
    return $prompt->contains('Laravel') && $prompt->dimensions === 1536;
});

Embeddings::assertNotGenerated(
    fn (EmbeddingsPrompt $prompt) => $prompt->contains('Other')
);

Embeddings::assertNothingGenerated();
```

キューに入れられた埋め込み生成については、キュー用のアサーションメソッドを使用します：

```php
Embeddings::assertQueued(
    fn (QueuedEmbeddingsPrompt $prompt) => $prompt->contains('Laravel')
);

Embeddings::assertNotQueued(
    fn (QueuedEmbeddingsPrompt $prompt) => $prompt->contains('Other')
);

Embeddings::assertNothingQueued();
```

すべての埋め込み生成に対応するフェイクレスポンスがあることを保証するには、`preventStrayEmbeddings` を使用できます。定義されていないフェイクレスポンスで埋め込みが生成された場合、例外がスローされます：

```php
Embeddings::fake()->preventStrayEmbeddings();
```


### 再ランキング

再ランキング操作は、`Reranking` クラスの `fake` メソッドを呼び出すことで偽装できます：

```php
use Laravel\Ai\Reranking;
use Laravel\Ai\Prompts\RerankingPrompt;
use Laravel\Ai\Responses\Data\RankedDocument;

// フェイクの再ランキングレスポンスを自動生成...
Reranking::fake();

// カスタムレスポンスを提供...
Reranking::fake([
    [
        new RankedDocument(index: 0, document: 'First', score: 0.95),
        new RankedDocument(index: 1, document: 'Second', score: 0.80),
    ],
]);
```

再ランキング後、実行された操作に対してアサーションを行うことができます：

```php
Reranking::assertReranked(function (RerankingPrompt $prompt) {
    return $prompt->contains('Laravel') && $prompt->limit === 5;
});

Reranking::assertNotReranked(
    fn (RerankingPrompt $prompt) => $prompt->contains('Django')
);

Reranking::assertNothingReranked();
```


### ファイル

ファイル操作は、`Files` クラスの `fake` メソッドを呼び出すことで偽装できます：

```php
use Laravel\Ai\Files;

Files::fake();
```

ファイル操作がフェイク化された後、アップロードや削除に関するアサーションを行うことができます：

```php
use Laravel\Ai\Contracts\Files\StorableFile;
use Laravel\Ai\Files\Document;

// ファイルを保存...
Document::fromString('Hello, Laravel!', mimeType: 'text/plain')
    ->as('hello.txt')
    ->put();

// アサーションを実行...
Files::assertStored(fn (StorableFile $file) =>
    (string) $file === 'Hello, Laravel!' &&
        $file->mimeType() === 'text/plain';
);

Files::assertNotStored(fn (StorableFile $file) =>
    (string) $file === 'Hello, World!'
);

Files::assertNothingStored();
```

ファイル削除に対するアサーションを行う場合、ファイルIDを指定できます：

```php
Files::assertDeleted('file-id');
Files::assertNotDeleted('file-id');
Files::assertNothingDeleted();
```


### ベクターストア

ベクターストア操作は、`Stores` クラスの `fake` メソッドを呼び出すことで偽装できます。ストアをフェイク化すると、[ファイル操作](#files) も自動的にフェイク化されます：

```php
use Laravel\Ai\Stores;

Stores::fake();
```

ストア操作がフェイク化された後、作成または削除されたストアに関するアサーションを行うことができます：

```php
use Laravel\Ai\Stores;

// ストアを作成...
$store = Stores::create('ナレッジベース');

// アサーションを実行...
Stores::assertCreated('ナレッジベース');

Stores::assertCreated(fn (string $name, ?string $description) =>
    $name === 'ナレッジベース'
);

Stores::assertNotCreated('他のストア');

Stores::assertNothingCreated();
```

ストア削除に対するアサーションを行う場合、ストアIDを指定できます：

```php
Stores::assertDeleted('store_id');
Stores::assertNotDeleted('other_store_id');
Stores::assertNothingDeleted();
```

特定の `Store` インスタンスに対してファイルの追加や削除を検証するには、そのインスタンスのアサーションメソッドを使用します：

```php
Stores::fake();

$store = Stores::get('store_id');

// ファイルを追加 / 削除...
$store->add('added_id');
$store->remove('removed_id');

// アサーションを実行...
$store->assertAdded('added_id');
$store->assertRemoved('removed_id');

$store->assertNotAdded('other_file_id');
$store->assertNotRemoved('other_file_id');
```

ファイルがプロバイダの[ファイルストレージ](#files)に保存され、同じリクエスト内でベクターストアに追加される場合、プロバイダ側のファイルIDが分からないことがあります。この場合、`assertAdded` メソッドにクロージャを渡して、追加されたファイルの内容に対してアサーションを行うことができます：

```php
use Laravel\Ai\Contracts\Files\StorableFile;
use Laravel\Ai\Files\Document;

$store->add(Document::fromString('Hello, World!', 'text/plain')->as('hello.txt'));

$store->assertAdded(fn (StorableFile $file) => $file->name() === 'hello.txt');
$store->assertAdded(fn (StorableFile $file) => $file->content() === 'Hello, World!');
```



## イベント

Laravel AI SDK は、以下のようなさまざまな [イベント](/docs/13.x/events) をディスパッチします：

- `AddingFileToStore`
- `AgentPrompted`
- `AgentStreamed`
- `AudioGenerated`
- `CreatingStore`
- `EmbeddingsGenerated`
- `FileAddedToStore`
- `FileDeleted`
- `FileRemovedFromStore`
- `FileStored`
- `GeneratingAudio`
- `GeneratingEmbeddings`
- `GeneratingImage`
- `GeneratingTranscription`
- `ImageGenerated`
- `InvokingTool`
- `PromptingAgent`
- `RemovingFileFromStore`
- `Reranked`
- `Reranking`
- `StoreCreated`
- `StoringFile`
- `StreamingAgent`
- `ToolInvoked`
- `TranscriptionGenerated`

これらのイベントのいずれにもリスナーを設定して、AI SDK の使用状況をログまたは保存できます。


