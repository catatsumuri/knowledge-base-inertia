import { Check, Copy, MoveHorizontal, WrapText } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-markup-templating'; // PHPに必要な依存パッケージ
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-typescript';
import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
    node?: {
        data?: {
            meta?: string;
        };
        properties?: {
            metastring?: string;
        };
    };
}

export function CodeBlock({
    inline,
    className,
    children,
    node,
    ...props
}: CodeBlockProps) {
    const [copied, setCopied] = useState(false);
    const [wrap, setWrap] = useState(true);

    const content = String(children).replace(/\n$/, '');

    // インラインコードの判定: 言語指定がなく、改行を含まない場合
    const isInline = inline !== false && !className && !content.includes('\n');

    // メタ情報から言語とファイル名を取得
    // 例: "diff php:routes/web.php" → language="php", filename="routes/web.php", isDiff=true
    //     "php:routes/web.php" → language="php", filename="routes/web.php", isDiff=false
    //     "javascript" → language="javascript", filename=null, isDiff=false
    const meta = node?.data?.meta || node?.properties?.metastring || '';
    const classMatch = /language-(\w+)/.exec(className || '');

    let language = classMatch?.[1] || '';
    let filename = null;
    let isDiff = false;

    // meta情報から解析（例: "php:routes/web.php"）
    if (meta) {
        const metaParts = meta.split(/\s+/);
        if (metaParts.length > 0) {
            const langPart = metaParts[0];
            if (langPart.includes(':')) {
                const [lang, file] = langPart.split(':');
                language = lang;
                filename = file;
            } else {
                language = langPart;
            }
        }
    }

    // クラス名から言語名を取得（メタ情報がない場合のフォールバック）
    if (className?.includes('language-diff')) {
        isDiff = true;
        // diff の後に言語名がある場合（例: language-diff → メタから php を取得）
        if (meta) {
            const metaParts = meta.split(/\s+/);
            if (metaParts.length > 0 && metaParts[0].includes(':')) {
                const [lang, file] = metaParts[0].split(':');
                language = lang;
                filename = file;
            } else if (metaParts.length > 0) {
                language = metaParts[0];
            }
        }
    } else if (className?.includes(':')) {
        // クラス名にファイル名が含まれている場合
        const parts = className.replace('language-', '').split(':');
        language = parts[0];
        filename = parts[1];
    }

    const handleCopy = async () => {
        try {
            // diff記法の場合は+や-を除いた純粋なコードをコピー
            let textToCopy = content;
            if (isDiff) {
                textToCopy = content
                    .split('\n')
                    .map((line) => {
                        if (
                            line.startsWith('+') ||
                            line.startsWith('-') ||
                            line.startsWith(' ')
                        ) {
                            return line.slice(1);
                        }
                        return line;
                    })
                    .join('\n');
            }

            await navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const toggleWrap = () => {
        setWrap(!wrap);
    };

    // インラインコード（`` `text` ``）の場合は早期リターン
    if (isInline) {
        return (
            <code
                className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-pink-600 before:content-none after:content-none dark:bg-gray-800 dark:text-pink-400"
                {...props}
            >
                {children}
            </code>
        );
    }

    // 以下、コードブロックの処理
    if (isDiff && language) {
        // diff記法の場合
        const lines = content.split('\n');
        const prismLanguage = Prism?.languages?.[language] || null;

        return (
            <div className="not-prose my-4 overflow-hidden rounded-lg border border-gray-700 bg-gray-900">
                <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-2 font-mono text-sm text-gray-300">
                    <span>{filename || language}</span>
                    <div className="flex gap-2">
                        <button
                            onClick={toggleWrap}
                            className="rounded p-1.5 transition-colors hover:bg-gray-700"
                            title={wrap ? '横スクロール' : '折り返し'}
                        >
                            {wrap ? (
                                <MoveHorizontal size={16} />
                            ) : (
                                <WrapText size={16} />
                            )}
                        </button>
                        <button
                            onClick={handleCopy}
                            className="rounded p-1.5 transition-colors hover:bg-gray-700"
                            title="コードをコピー"
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>
                <div className={wrap ? '' : 'overflow-x-auto'}>
                    <pre className="!my-0 font-mono text-sm">
                        <code>
                            {lines.map((line, index) => {
                                let bgColor = 'transparent';
                                let symbol = '';
                                let codeContent = line;

                                if (line.startsWith('@@')) {
                                    bgColor = 'rgba(59, 130, 246, 0.15)'; // 青
                                    symbol = '';
                                    codeContent = line;
                                } else if (line.startsWith('+')) {
                                    bgColor = 'rgba(16, 185, 129, 0.15)'; // 緑
                                    symbol = '+';
                                    codeContent = line.slice(1);
                                } else if (line.startsWith('-')) {
                                    bgColor = 'rgba(239, 68, 68, 0.15)'; // 赤
                                    symbol = '-';
                                    codeContent = line.slice(1);
                                } else if (line.startsWith(' ')) {
                                    symbol = '';
                                    codeContent = line.slice(1);
                                }

                                // Prismでシンタックスハイライトを適用
                                let highlightedHTML = '';
                                if (prismLanguage && codeContent.trim()) {
                                    try {
                                        highlightedHTML = Prism.highlight(
                                            codeContent,
                                            prismLanguage,
                                            language,
                                        );
                                    } catch {
                                        // ハイライト失敗時はプレーンテキスト
                                        highlightedHTML = codeContent;
                                    }
                                } else {
                                    highlightedHTML = codeContent;
                                }

                                return (
                                    <div
                                        key={index}
                                        style={{ backgroundColor: bgColor }}
                                        className={`grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-1 px-4 py-0.5 ${wrap ? 'break-all whitespace-pre-wrap' : ''}`}
                                    >
                                        <span
                                            className="text-center text-gray-500 select-none"
                                            style={{
                                                userSelect: 'none',
                                            }}
                                        >
                                            {symbol || ' '}
                                        </span>
                                        <span
                                            className="token-line"
                                            dangerouslySetInnerHTML={{
                                                __html: highlightedHTML,
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </code>
                    </pre>
                </div>
            </div>
        );
    }

    // 通常のシンタックスハイライト（言語指定あり）
    if (language) {
        return (
            <div className="not-prose my-4 overflow-hidden rounded-lg border border-gray-700 bg-gray-900">
                <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-2 font-mono text-sm text-gray-300">
                    <span>{filename || language}</span>
                    <div className="flex gap-2">
                        <button
                            onClick={toggleWrap}
                            className="rounded p-1.5 transition-colors hover:bg-gray-700"
                            title={wrap ? '横スクロール' : '折り返し'}
                        >
                            {wrap ? (
                                <MoveHorizontal size={16} />
                            ) : (
                                <WrapText size={16} />
                            )}
                        </button>
                        <button
                            onClick={handleCopy}
                            className="rounded p-1.5 transition-colors hover:bg-gray-700"
                            title="コードをコピー"
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>
                <SyntaxHighlighter
                    style={oneDark}
                    language={language}
                    PreTag="div"
                    className="!mt-0 !rounded-t-none"
                    wrapLines={wrap}
                    wrapLongLines={wrap}
                    {...props}
                >
                    {content}
                </SyntaxHighlighter>
            </div>
        );
    }

    // 言語指定なしのコードブロック
    return (
        <div className="not-prose my-4 overflow-hidden rounded-lg border border-gray-700 bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-2 font-mono text-sm text-gray-300">
                <span>code</span>
                <button
                    onClick={handleCopy}
                    className="rounded p-1.5 transition-colors hover:bg-gray-700"
                    title="コードをコピー"
                >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
            </div>
            <div className={wrap ? '' : 'overflow-x-auto'}>
                <pre className="!my-0 bg-[#282c34] px-4 py-3 font-mono text-sm text-gray-300">
                    <code
                        className={wrap ? 'break-all whitespace-pre-wrap' : ''}
                    >
                        {content}
                    </code>
                </pre>
            </div>
        </div>
    );
}
