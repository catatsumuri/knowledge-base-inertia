import type { ComponentPropsWithoutRef } from 'react';
import { useState } from 'react';
import { createPortal } from 'react-dom';

interface MarkdownImageProps extends ComponentPropsWithoutRef<'img'> {}

/**
 * Zenn式のMarkdown画像コンポーネント
 *
 * 画像サイズ指定は remark-image-size プラグインで処理されます。
 * このコンポーネントは、Zenn CSSに必要な md-img クラスと lazy loading を追加します。
 * クリックすると画像を拡大表示します。
 */
export function MarkdownImage({
    className,
    src,
    alt,
    ...props
}: MarkdownImageProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleClick = () => {
        setIsOpen(true);
    };

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            handleClose();
        }
    };

    return (
        <>
            <img
                {...props}
                src={src}
                alt={alt}
                className={
                    className
                        ? `${className} md-img cursor-pointer`
                        : 'md-img cursor-pointer'
                }
                loading="lazy"
                onClick={handleClick}
            />
            {isOpen &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        className="fixed inset-0 z-50 overflow-auto bg-black/90 p-4"
                        onClick={handleClose}
                        onKeyDown={handleKeyDown}
                        role="dialog"
                        aria-modal="true"
                        tabIndex={-1}
                    >
                        <div className="flex min-h-full items-center justify-center">
                            <div className="relative">
                                <img
                                    src={src}
                                    alt={alt}
                                    className="block"
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                    onClick={handleClose}
                                    className="fixed top-4 right-4 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
                                    aria-label="閉じる"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <line
                                            x1="18"
                                            y1="6"
                                            x2="6"
                                            y2="18"
                                        ></line>
                                        <line
                                            x1="6"
                                            y1="6"
                                            x2="18"
                                            y2="18"
                                        ></line>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
}
