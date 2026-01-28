<?php

return [

    /*
    |--------------------------------------------------------------------------
    | X (Twitter) API Bearer Token
    |--------------------------------------------------------------------------
    |
    | X API v2の認証に使用するBearer Tokenを設定します。
    | X Developer Portalから取得したBearer Tokenを環境変数に設定してください。
    | https://developer.x.com/
    */

    'bearer_token' => env('X_BEARER_TOKEN'),

    /*
    |--------------------------------------------------------------------------
    | OAuth 1.0a User Context
    |--------------------------------------------------------------------------
    |
    | 鍵アカ対応など、ユーザー権限でAPIを叩きたい場合に使用します。
    | X Developer PortalのAPI Key/Secret（Consumer）と
    | Access Token/Secretを設定してください。
    */

    'use_oauth1' => env('X_USE_OAUTH1', false),
    'oauth1_consumer_key' => env('X_OAUTH1_CONSUMER_KEY'),
    'oauth1_consumer_secret' => env('X_OAUTH1_CONSUMER_SECRET'),
    'oauth1_access_token' => env('X_OAUTH1_ACCESS_TOKEN'),
    'oauth1_access_token_secret' => env('X_OAUTH1_ACCESS_TOKEN_SECRET'),

    /*
    |--------------------------------------------------------------------------
    | X API Base URL
    |--------------------------------------------------------------------------
    |
    | X API v2のベースURLです。通常は変更する必要はありません。
    */

    'base_url' => env('X_API_BASE_URL', 'https://api.x.com'),

    /*
    |--------------------------------------------------------------------------
    | Request Timeout
    |--------------------------------------------------------------------------
    |
    | HTTPリクエストのタイムアウト時間（秒）を設定します。
    | デフォルトは30秒です。
    */

    'request_timeout' => env('X_REQUEST_TIMEOUT', 30),

    /*
    |--------------------------------------------------------------------------
    | Default Tweet Fields
    |--------------------------------------------------------------------------
    |
    | ツイート取得時にデフォルトで取得するフィールドを設定します。
    | 利用可能なフィールド: created_at, author_id, conversation_id,
    | in_reply_to_user_id, referenced_tweets, attachments, geo,
    | context_annotations, entities, withheld, public_metrics, etc.
    */

    'default_tweet_fields' => env('X_DEFAULT_TWEET_FIELDS', 'created_at,author_id,public_metrics,lang,possibly_sensitive,attachments,referenced_tweets,entities'),

    /*
    |--------------------------------------------------------------------------
    | Default Expansions
    |--------------------------------------------------------------------------
    |
    | ツイート取得時にデフォルトで展開する関連データを設定します。
    | 利用可能な値: attachments.media_keys, referenced_tweets.id,
    | referenced_tweets.id.author_id, author_id, etc.
    */

    'default_expansions' => env('X_DEFAULT_EXPANSIONS', 'attachments.media_keys,referenced_tweets.id,referenced_tweets.id.author_id'),

    /*
    |--------------------------------------------------------------------------
    | Default Media Fields
    |--------------------------------------------------------------------------
    |
    | メディア情報取得時にデフォルトで取得するフィールドを設定します。
    | 利用可能なフィールド: media_key, type, url, duration_ms, height, width,
    | preview_image_url, public_metrics, alt_text, variants, etc.
    */

    'default_media_fields' => env('X_DEFAULT_MEDIA_FIELDS', 'media_key,type,url,width,height,preview_image_url,alt_text,variants'),

    /*
    |--------------------------------------------------------------------------
    | Default User Fields
    |--------------------------------------------------------------------------
    |
    | ユーザー情報取得時にデフォルトで取得するフィールドを設定します。
    | 利用可能なフィールド: id, name, username, created_at, description,
    | profile_image_url, public_metrics, verified, etc.
    */

    'default_user_fields' => env('X_DEFAULT_USER_FIELDS', 'id,name,username,profile_image_url,verified,verified_type'),

    /*
    |--------------------------------------------------------------------------
    | Tweet Cache TTL
    |--------------------------------------------------------------------------
    |
    | ツイート取得結果をキャッシュする秒数。0以下で無効。
    | 開発時のレート制限回避に利用できます。
    */

    'tweet_cache_ttl' => env('X_TWEET_CACHE_TTL', 3600),
];
