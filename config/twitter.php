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

    'default_tweet_fields' => env('X_DEFAULT_TWEET_FIELDS', 'created_at,author_id,public_metrics,lang,possibly_sensitive'),
];
