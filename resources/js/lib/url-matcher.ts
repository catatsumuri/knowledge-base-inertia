/**
 * URL判定ユーティリティ
 * Zenn Editorのurl-matcherを参考に実装
 */

/** URL文字列か判定する */
export function isValidHttpUrl(str: string): boolean {
    try {
        const url = new URL(str);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

/** GitHubのファイルURLか判定する */
export function isGithubUrl(url: string): boolean {
    return /^https:\/\/github\.com\/([a-zA-Z0-9](-?[a-zA-Z0-9]){0,38})\/([a-zA-Z0-9](-?[a-zA-Z0-9._]){0,99})\/blob\/[^~\s:?[*^/\\]{2,}\/[\w!\-_~.*%()'"/]+(?:#L\d+(?:-L\d+)?)?$/.test(
        url,
    );
}

/** Twitter/XのツイートURLか判定する */
export function isTweetUrl(url: string): boolean {
    return /^https:\/\/(twitter|x)\.com\/[a-zA-Z0-9_-]+\/status\/[a-zA-Z0-9?=&\-_]+$/.test(
        url,
    );
}

/** YouTubeのURLか判定する */
export function isYoutubeUrl(url: string): boolean {
    return [
        /^https?:\/\/youtu\.be\/[\w-]+(?:\?[\w=&-]+)?$/,
        /^https?:\/\/(?:www\.)?youtube\.com\/watch\?[\w=&-]+$/,
    ].some((pattern) => pattern.test(url));
}

/** YouTubeのVideoIdの文字列の長さ */
const YOUTUBE_VIDEO_ID_LENGTH = 11;

/**
 * YouTubeのURLからvideoIdと開始位置の秒数を取得する
 */
export function extractYoutubeVideoParameters(
    youtubeUrl: string,
): { videoId: string; start?: string } | undefined {
    if (!isYoutubeUrl(youtubeUrl)) return undefined;

    const url = new URL(youtubeUrl);
    const params = new URLSearchParams(url.search || '');

    // https://youtu.be/Hoge の "Hoge" の部分または、
    // https://www.youtube.com/watch?v=Hoge の "Hoge" の部分を値とする
    const videoId = params.get('v') || url.pathname.split('/')[1];

    // https://www.youtube.com/watch?v=Hoge&t=100s の "100" の部分を値とする
    const start = params.get('t')?.replace('s', '');

    if (videoId?.length !== YOUTUBE_VIDEO_ID_LENGTH) return undefined;

    return { videoId, start };
}
