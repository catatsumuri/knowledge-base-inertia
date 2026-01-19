import {
    destroy,
    store,
    update,
} from '@/actions/App/Http/Controllers/ShoutboxController';
import { ImageCropper } from '@/components/image-cropper';
import { ImageFilter } from '@/components/image-filter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import { type PaginatedData, type User } from '@/types';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
    ChevronLeft,
    ChevronRight,
    Edit,
    Image as ImageIcon,
    MessageCircle,
    Save,
    Send,
    Trash2,
    X,
} from 'lucide-react';
import { useRef, useState } from 'react';

interface ShoutLink {
    id: number;
    shout_id: number;
    slug: string;
    created_at: string;
}

interface Shout {
    id: number;
    user_id: number;
    parent_id: number | null;
    content: string;
    images: string[] | null;
    created_at: string;
    user: User;
    links: ShoutLink[];
    replies?: Shout[];
}

interface MarkdownPage {
    slug: string;
    title: string;
}

interface ShoutboxPanelProps {
    shouts: PaginatedData<Shout>;
    containerClassName?: string;
}

export default function ShoutboxPanel({
    shouts,
    containerClassName,
}: ShoutboxPanelProps) {
    const page = usePage<{ auth: { user: User } }>();
    const getInitials = useInitials();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const replyFileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const editTextareaRef = useRef<HTMLTextAreaElement>(null);
    const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
    const [previewImages, setPreviewImages] = useState<string[]>([]);
    const [replyPreviewImages, setReplyPreviewImages] = useState<string[]>([]);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxImages, setLightboxImages] = useState<string[]>([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const [filterDialogOpen, setFilterDialogOpen] = useState(false);
    const [currentProcessingImage, setCurrentProcessingImage] =
        useState<File | null>(null);
    const [currentFilteringIndex, setCurrentFilteringIndex] = useState<
        number | null
    >(null);
    const [isReplyImage, setIsReplyImage] = useState(false);
    const [editingShoutId, setEditingShoutId] = useState<number | null>(null);
    const [editContent, setEditContent] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<MarkdownPage[]>([]);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
    const [mentionStart, setMentionStart] = useState<number | null>(null);
    const [showEditSuggestions, setShowEditSuggestions] = useState(false);
    const [editSuggestions, setEditSuggestions] = useState<MarkdownPage[]>([]);
    const [selectedEditSuggestionIndex, setSelectedEditSuggestionIndex] =
        useState(0);
    const [editMentionStart, setEditMentionStart] = useState<number | null>(
        null,
    );
    const [showReplySuggestions, setShowReplySuggestions] = useState(false);
    const [replySuggestions, setReplySuggestions] = useState<MarkdownPage[]>(
        [],
    );
    const [selectedReplySuggestionIndex, setSelectedReplySuggestionIndex] =
        useState(0);
    const [replyMentionStart, setReplyMentionStart] = useState<number | null>(
        null,
    );
    const [replyingToShoutId, setReplyingToShoutId] = useState<number | null>(
        null,
    );

    const { data, setData, post, processing, reset, errors } = useForm({
        parent_id: null as number | null,
        content: '',
        images: [] as File[],
    });

    const {
        data: replyData,
        setData: setReplyData,
        post: postReply,
        processing: replyProcessing,
        reset: resetReply,
    } = useForm({
        parent_id: null as number | null,
        content: '',
        images: [] as File[],
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(store().url, {
            onSuccess: () => {
                reset();
                setPreviewImages([]);
                setShowSuggestions(false);
            },
        });
    };

    const handleContentChange = async (
        e: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
        const value = e.target.value;
        const cursorPosition = e.target.selectionStart;
        setData('content', value);

        // @以降の文字列を検出
        const textBeforeCursor = value.substring(0, cursorPosition);
        const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9_\-/]*)$/);

        if (mentionMatch) {
            const query = mentionMatch[1];
            const start = cursorPosition - mentionMatch[0].length;
            setMentionStart(start);

            if (query.length > 0) {
                // API検索
                try {
                    const response = await fetch(
                        `/api/markdown/search?q=${encodeURIComponent(query)}`,
                    );
                    const responseData = await response.json();
                    setSuggestions(responseData);
                    setShowSuggestions(responseData.length > 0);
                    setSelectedSuggestionIndex(0);
                } catch (error) {
                    console.error('Failed to fetch suggestions:', error);
                }
            } else {
                // @だけ入力された場合は全件表示
                try {
                    const response = await fetch('/api/markdown/search?q=');
                    const responseData = await response.json();
                    setSuggestions(responseData);
                    setShowSuggestions(responseData.length > 0);
                    setSelectedSuggestionIndex(0);
                } catch (error) {
                    console.error('Failed to fetch suggestions:', error);
                }
            }
        } else {
            setShowSuggestions(false);
            setMentionStart(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!showSuggestions) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedSuggestionIndex(
                (prev) => (prev + 1) % suggestions.length,
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedSuggestionIndex(
                (prev) => (prev - 1 + suggestions.length) % suggestions.length,
            );
        } else if (e.key === 'Enter' && suggestions.length > 0) {
            e.preventDefault();
            insertMention(suggestions[selectedSuggestionIndex].slug);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setShowSuggestions(false);
        }
    };

    const insertMention = (slug: string) => {
        if (mentionStart === null) return;

        const textarea = textareaRef.current;
        if (!textarea) return;

        const beforeMention = data.content.substring(0, mentionStart);
        const afterCursor = data.content.substring(textarea.selectionStart);
        const newContent = beforeMention + '@' + slug + ' ' + afterCursor;

        setData('content', newContent);
        setShowSuggestions(false);
        setMentionStart(null);

        // カーソル位置を設定
        setTimeout(() => {
            const newCursorPos = beforeMention.length + slug.length + 2;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
            textarea.focus();
        }, 0);
    };

    const queueImages = (files: File[], isReplyImageTarget: boolean) => {
        const existingImages = isReplyImageTarget
            ? replyData.images
            : data.images;

        if (files.length + existingImages.length > 4) {
            alert('画像は最大4枚までです');
            return;
        }

        if (files.length === 0) {
            return;
        }

        // 最初の画像にトリミング→フィルターを適用
        setCurrentProcessingImage(files[0]);
        setCurrentFilteringIndex(existingImages.length);
        setIsReplyImage(isReplyImageTarget);
        setCropDialogOpen(true);

        // 残りの画像は一時保存
        if (files.length > 1) {
            const remainingFiles = files.slice(1);
            remainingFiles.forEach((file) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (isReplyImageTarget) {
                        setReplyPreviewImages((prev) => [
                            ...prev,
                            reader.result as string,
                        ]);
                        return;
                    }

                    setPreviewImages((prev) => [
                        ...prev,
                        reader.result as string,
                    ]);
                };
                reader.readAsDataURL(file);
            });

            if (isReplyImageTarget) {
                setReplyData('images', [...existingImages, ...remainingFiles]);
            } else {
                setData('images', [...existingImages, ...remainingFiles]);
            }
        }
    };

    const handleClipboardPaste = (
        e: React.ClipboardEvent<HTMLTextAreaElement>,
        isReplyTarget: boolean,
    ) => {
        const items = Array.from(e.clipboardData?.items || []);
        const imageFiles = items
            .filter((item) => item.type.startsWith('image/'))
            .map((item) => item.getAsFile())
            .filter((file): file is File => file !== null);

        if (imageFiles.length === 0) {
            return;
        }

        e.preventDefault();
        queueImages(imageFiles, isReplyTarget);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        queueImages(files, false);

        // inputをリセット
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleCropComplete = (croppedImage: File) => {
        // トリミング完了後、フィルター画面へ
        setCropDialogOpen(false);
        setCurrentProcessingImage(croppedImage);
        setFilterDialogOpen(true);
    };

    const handleCropSkip = () => {
        // トリミングをスキップしてフィルター画面へ（元の画像のまま）
        setCropDialogOpen(false);
        setFilterDialogOpen(true);
    };

    const handleCropCancel = () => {
        setCropDialogOpen(false);
        setCurrentProcessingImage(null);
        setCurrentFilteringIndex(null);
    };

    const handleFilterApply = (filteredImage: File) => {
        // フィルター適用後の画像を追加
        if (isReplyImage) {
            setReplyData('images', [...replyData.images, filteredImage]);

            // プレビュー生成
            const reader = new FileReader();
            reader.onloadend = () => {
                setReplyPreviewImages((prev) => [
                    ...prev,
                    reader.result as string,
                ]);
            };
            reader.readAsDataURL(filteredImage);
        } else {
            setData('images', [...data.images, filteredImage]);

            // プレビュー生成
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImages((prev) => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(filteredImage);
        }

        // ダイアログを閉じる
        setFilterDialogOpen(false);
        setCurrentProcessingImage(null);
        setCurrentFilteringIndex(null);
        setIsReplyImage(false);
    };

    const handleFilterCancel = () => {
        setFilterDialogOpen(false);
        setCurrentProcessingImage(null);
        setCurrentFilteringIndex(null);
    };

    const removeImage = (index: number) => {
        setData(
            'images',
            data.images.filter((_, i) => i !== index),
        );
        setPreviewImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleEdit = (shout: Shout) => {
        setEditingShoutId(shout.id);
        setEditContent(shout.content || '');
    };

    const handleEditContentChange = async (
        e: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
        const value = e.target.value;
        const cursorPosition = e.target.selectionStart;
        setEditContent(value);

        const textBeforeCursor = value.substring(0, cursorPosition);
        const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9_\-/]*)$/);

        if (mentionMatch) {
            const query = mentionMatch[1];
            const start = cursorPosition - mentionMatch[0].length;
            setEditMentionStart(start);

            try {
                const response = await fetch(
                    `/api/markdown/search?q=${encodeURIComponent(query)}`,
                );
                const responseData = await response.json();
                setEditSuggestions(responseData);
                setShowEditSuggestions(responseData.length > 0);
                setSelectedEditSuggestionIndex(0);
            } catch (error) {
                console.error('Failed to fetch suggestions:', error);
            }
        } else {
            setShowEditSuggestions(false);
            setEditMentionStart(null);
        }
    };

    const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!showEditSuggestions) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedEditSuggestionIndex(
                (prev) => (prev + 1) % editSuggestions.length,
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedEditSuggestionIndex(
                (prev) =>
                    (prev - 1 + editSuggestions.length) %
                    editSuggestions.length,
            );
        } else if (e.key === 'Enter' && editSuggestions.length > 0) {
            e.preventDefault();
            insertEditMention(
                editSuggestions[selectedEditSuggestionIndex].slug,
            );
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setShowEditSuggestions(false);
        }
    };

    const insertEditMention = (slug: string) => {
        if (editMentionStart === null) return;

        const textarea = editTextareaRef.current;
        if (!textarea) return;

        const beforeMention = editContent.substring(0, editMentionStart);
        const afterCursor = editContent.substring(textarea.selectionStart);
        const newContent = beforeMention + '@' + slug + ' ' + afterCursor;

        setEditContent(newContent);
        setShowEditSuggestions(false);
        setEditMentionStart(null);

        setTimeout(() => {
            const newCursorPos = beforeMention.length + slug.length + 2;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
            textarea.focus();
        }, 0);
    };

    const handleSaveEdit = (shoutId: number) => {
        router.patch(
            update(shoutId),
            { content: editContent },
            {
                onSuccess: () => {
                    setEditingShoutId(null);
                    setEditContent('');
                    setShowEditSuggestions(false);
                },
            },
        );
    };

    const handleCancelEdit = () => {
        setEditingShoutId(null);
        setEditContent('');
        setShowEditSuggestions(false);
    };

    const handleReplyContentChange = async (
        e: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
        const value = e.target.value;
        const cursorPosition = e.target.selectionStart;
        setReplyData('content', value);

        const textBeforeCursor = value.substring(0, cursorPosition);
        const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9_\-/]*)$/);

        if (mentionMatch) {
            const query = mentionMatch[1];
            const start = cursorPosition - mentionMatch[0].length;
            setReplyMentionStart(start);

            try {
                const response = await fetch(
                    `/api/markdown/search?q=${encodeURIComponent(query)}`,
                );
                const responseData = await response.json();
                setReplySuggestions(responseData);
                setShowReplySuggestions(responseData.length > 0);
                setSelectedReplySuggestionIndex(0);
            } catch (error) {
                console.error('Failed to fetch suggestions:', error);
            }
        } else {
            setShowReplySuggestions(false);
            setReplyMentionStart(null);
        }
    };

    const handleReplyKeyDown = (
        e: React.KeyboardEvent<HTMLTextAreaElement>,
    ) => {
        if (!showReplySuggestions) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedReplySuggestionIndex(
                (prev) => (prev + 1) % replySuggestions.length,
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedReplySuggestionIndex(
                (prev) =>
                    (prev - 1 + replySuggestions.length) %
                    replySuggestions.length,
            );
        } else if (e.key === 'Enter' && replySuggestions.length > 0) {
            e.preventDefault();
            insertReplyMention(
                replySuggestions[selectedReplySuggestionIndex].slug,
            );
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setShowReplySuggestions(false);
        }
    };

    const insertReplyMention = (slug: string) => {
        if (replyMentionStart === null) return;

        const textarea = replyTextareaRef.current;
        if (!textarea) return;

        const beforeMention = replyData.content.substring(0, replyMentionStart);
        const afterCursor = replyData.content.substring(
            textarea.selectionStart,
        );
        const newContent = beforeMention + '@' + slug + ' ' + afterCursor;

        setReplyData('content', newContent);
        setShowReplySuggestions(false);
        setReplyMentionStart(null);

        setTimeout(() => {
            const newCursorPos = beforeMention.length + slug.length + 2;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
            textarea.focus();
        }, 0);
    };

    const handleReply = (shoutId: number) => {
        setReplyingToShoutId(shoutId);
        setReplyData('parent_id', shoutId);
    };

    const handleCancelReply = () => {
        setReplyingToShoutId(null);
        resetReply();
        setReplyPreviewImages([]);
        setShowReplySuggestions(false);
    };

    const handleSubmitReply = (e: React.FormEvent) => {
        e.preventDefault();
        postReply(store().url, {
            onSuccess: () => {
                resetReply();
                setReplyingToShoutId(null);
                setReplyPreviewImages([]);
            },
        });
    };

    const handleReplyImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        queueImages(files, true);

        if (replyFileInputRef.current) {
            replyFileInputRef.current.value = '';
        }
    };

    const removeReplyImage = (index: number) => {
        setReplyData(
            'images',
            replyData.images.filter((_, i) => i !== index),
        );
        setReplyPreviewImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleDelete = (shoutId: number) => {
        if (confirm('この投稿を削除しますか？')) {
            router.delete(destroy(shoutId));
        }
    };

    const openLightbox = (images: string[], index: number) => {
        setLightboxImages(images);
        setCurrentImageIndex(index);
        setLightboxOpen(true);
    };

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % lightboxImages.length);
    };

    const prevImage = () => {
        setCurrentImageIndex(
            (prev) =>
                (prev - 1 + lightboxImages.length) % lightboxImages.length,
        );
    };

    const renderContentWithLinks = (content: string) => {
        if (!content) return null;

        // @slug形式をリンクに変換
        const parts = content.split(/(@[a-zA-Z0-9_\-\/]+)/g);

        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                const slug = part.slice(1);
                return (
                    <Link
                        key={index}
                        href={`/markdown/${slug}`}
                        className="font-medium text-primary hover:underline"
                    >
                        {part}
                    </Link>
                );
            }
            return <span key={index}>{part}</span>;
        });
    };

    return (
        <div
            className={cn(
                'flex h-full flex-1 flex-col gap-4',
                containerClassName,
            )}
        >
            {/* 投稿フォーム */}
            <Card className="p-4">
                <form onSubmit={handleSubmit}>
                    <div className="flex gap-3">
                        <Avatar className="size-10">
                            <AvatarImage src={page.props.auth.user.avatar} />
                            <AvatarFallback>
                                {getInitials(page.props.auth.user.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-3">
                            <div className="relative">
                                <Textarea
                                    ref={textareaRef}
                                    value={data.content}
                                    onChange={handleContentChange}
                                    onKeyDown={handleKeyDown}
                                    onPaste={(e) =>
                                        handleClipboardPaste(e, false)
                                    }
                                    placeholder="いま何してる？ (@でページをメンション)"
                                    className="min-h-[100px] resize-none border-none p-0 text-lg focus-visible:ring-0"
                                    maxLength={1000}
                                />

                                {/* サジェストリスト */}
                                {showSuggestions && suggestions.length > 0 && (
                                    <Card className="absolute top-[calc(100%-56px)] left-0 z-50 mt-0 max-h-60 w-full gap-0 overflow-y-auto p-0">
                                        {suggestions.map(
                                            (suggestion, index) => (
                                                <button
                                                    key={suggestion.slug}
                                                    type="button"
                                                    onClick={() =>
                                                        insertMention(
                                                            suggestion.slug,
                                                        )
                                                    }
                                                    className={`w-full border-b px-4 py-2 text-left leading-none hover:bg-muted ${
                                                        index ===
                                                        selectedSuggestionIndex
                                                            ? 'bg-muted'
                                                            : ''
                                                    }`}
                                                >
                                                    <div className="leading-none font-medium">
                                                        @{suggestion.slug}
                                                    </div>
                                                    <div className="text-sm leading-none text-muted-foreground">
                                                        {suggestion.title}
                                                    </div>
                                                </button>
                                            ),
                                        )}
                                    </Card>
                                )}
                            </div>

                            {/* 画像プレビュー */}
                            {previewImages.length > 0 && (
                                <div className="grid grid-cols-2 gap-2">
                                    {previewImages.map((preview, index) => (
                                        <div
                                            key={index}
                                            className="group relative"
                                        >
                                            <img
                                                src={preview}
                                                alt={`Preview ${index + 1}`}
                                                className="h-32 w-full rounded-lg object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeImage(index)
                                                }
                                                className="absolute top-1 right-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
                                            >
                                                <X className="size-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {errors.content && (
                                <p className="text-sm text-destructive">
                                    {errors.content}
                                </p>
                            )}

                            <div className="flex items-center justify-between border-t pt-3">
                                <div className="flex gap-1">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="hidden"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                        disabled={data.images.length >= 4}
                                    >
                                        <ImageIcon className="size-5" />
                                    </Button>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={
                                        processing ||
                                        (!data.content.trim() &&
                                            data.images.length === 0)
                                    }
                                >
                                    <Send className="mr-2 size-4" />
                                    投稿
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>
            </Card>

            {/* タイムライン */}
            <div className="space-y-4">
                {shouts.data.map((shout: Shout) => (
                    <Card key={shout.id} className="p-4">
                        <div className="flex gap-3">
                            <Avatar className="size-10">
                                <AvatarImage src={shout.user.avatar} />
                                <AvatarFallback>
                                    {getInitials(shout.user.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-semibold">
                                            {shout.user.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {format(
                                                new Date(shout.created_at),
                                                'PPP p',
                                                {
                                                    locale: ja,
                                                },
                                            )}
                                        </p>
                                    </div>
                                    {editingShoutId !== shout.id && (
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    handleReply(shout.id)
                                                }
                                                className="size-8"
                                                title="返信"
                                            >
                                                <MessageCircle className="size-4" />
                                            </Button>
                                            {shout.user_id ===
                                                page.props.auth.user.id && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            handleEdit(shout)
                                                        }
                                                        className="size-8"
                                                    >
                                                        <Edit className="size-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            handleDelete(
                                                                shout.id,
                                                            )
                                                        }
                                                        className="size-8"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {editingShoutId === shout.id ? (
                                    <div className="mt-2 space-y-2">
                                        <div className="relative">
                                            <Textarea
                                                ref={editTextareaRef}
                                                value={editContent}
                                                onChange={
                                                    handleEditContentChange
                                                }
                                                onKeyDown={handleEditKeyDown}
                                                className="min-h-[100px] resize-none"
                                                maxLength={1000}
                                                autoFocus
                                            />

                                            {/* 編集時のサジェストリスト */}
                                            {showEditSuggestions &&
                                                editSuggestions.length > 0 && (
                                                    <Card className="absolute top-[calc(100%-56px)] left-0 z-50 mt-0 max-h-60 w-full gap-0 overflow-y-auto p-0">
                                                        {editSuggestions.map(
                                                            (
                                                                suggestion,
                                                                index,
                                                            ) => (
                                                                <button
                                                                    key={
                                                                        suggestion.slug
                                                                    }
                                                                    type="button"
                                                                    onClick={() =>
                                                                        insertEditMention(
                                                                            suggestion.slug,
                                                                        )
                                                                    }
                                                                    className={`w-full border-b px-4 py-2 text-left leading-none hover:bg-muted ${
                                                                        index ===
                                                                        selectedEditSuggestionIndex
                                                                            ? 'bg-muted'
                                                                            : ''
                                                                    }`}
                                                                >
                                                                    <div className="leading-none font-medium">
                                                                        @
                                                                        {
                                                                            suggestion.slug
                                                                        }
                                                                    </div>
                                                                    <div className="text-sm leading-none text-muted-foreground">
                                                                        {
                                                                            suggestion.title
                                                                        }
                                                                    </div>
                                                                </button>
                                                            ),
                                                        )}
                                                    </Card>
                                                )}
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleCancelEdit}
                                            >
                                                キャンセル
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    handleSaveEdit(shout.id)
                                                }
                                            >
                                                <Save className="mr-2 size-4" />
                                                保存
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="mt-2 break-words whitespace-pre-wrap">
                                        {renderContentWithLinks(shout.content)}
                                    </p>
                                )}

                                {/* 画像 */}
                                {shout.images && shout.images.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {shout.images.map(
                                            (image: string, index: number) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={() =>
                                                        openLightbox(
                                                            shout.images ?? [],
                                                            index,
                                                        )
                                                    }
                                                    className="group relative overflow-hidden rounded-lg transition-opacity hover:opacity-90"
                                                >
                                                    <img
                                                        src={image}
                                                        alt={`Image ${index + 1}`}
                                                        className="h-32 w-32 object-cover"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
                                                        <ImageIcon className="size-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                                                    </div>
                                                </button>
                                            ),
                                        )}
                                    </div>
                                )}

                                {/* 返信一覧 */}
                                {shout.replies && shout.replies.length > 0 && (
                                    <div className="mt-4 space-y-3 border-l-2 pl-4">
                                        {shout.replies.map((reply: Shout) => (
                                            <div
                                                key={reply.id}
                                                className="flex gap-2"
                                            >
                                                <Avatar className="size-8">
                                                    <AvatarImage
                                                        src={reply.user.avatar}
                                                    />
                                                    <AvatarFallback>
                                                        {getInitials(
                                                            reply.user.name,
                                                        )}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-semibold">
                                                                {
                                                                    reply.user
                                                                        .name
                                                                }
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {format(
                                                                    new Date(
                                                                        reply.created_at,
                                                                    ),
                                                                    'PPP p',
                                                                    {
                                                                        locale: ja,
                                                                    },
                                                                )}
                                                            </p>
                                                        </div>
                                                        {reply.user_id ===
                                                            page.props.auth.user
                                                                .id && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() =>
                                                                    handleDelete(
                                                                        reply.id,
                                                                    )
                                                                }
                                                                className="size-7"
                                                                title="返信を削除"
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <p className="mt-1 text-sm break-words whitespace-pre-wrap">
                                                        {renderContentWithLinks(
                                                            reply.content,
                                                        )}
                                                    </p>
                                                    {reply.images &&
                                                        reply.images.length >
                                                            0 && (
                                                            <div className="mt-2 flex flex-wrap gap-2">
                                                                {reply.images.map(
                                                                    (
                                                                        image: string,
                                                                        index: number,
                                                                    ) => (
                                                                        <button
                                                                            key={
                                                                                index
                                                                            }
                                                                            type="button"
                                                                            onClick={() =>
                                                                                openLightbox(
                                                                                    reply.images ??
                                                                                        [],
                                                                                    index,
                                                                                )
                                                                            }
                                                                            className="group relative overflow-hidden rounded transition-opacity hover:opacity-90"
                                                                        >
                                                                            <img
                                                                                src={
                                                                                    image
                                                                                }
                                                                                alt={`Image ${index + 1}`}
                                                                                className="h-20 w-20 object-cover"
                                                                            />
                                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
                                                                                <ImageIcon className="size-4 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                                                                            </div>
                                                                        </button>
                                                                    ),
                                                                )}
                                                            </div>
                                                        )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* 返信フォーム */}
                                {replyingToShoutId === shout.id && (
                                    <form
                                        onSubmit={handleSubmitReply}
                                        className="mt-4 border-l-2 pl-4"
                                    >
                                        <div className="flex gap-2">
                                            <Avatar className="size-8">
                                                <AvatarImage
                                                    src={
                                                        page.props.auth.user
                                                            .avatar
                                                    }
                                                />
                                                <AvatarFallback>
                                                    {getInitials(
                                                        page.props.auth.user
                                                            .name,
                                                    )}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 space-y-2">
                                                <div className="relative">
                                                    <Textarea
                                                        ref={replyTextareaRef}
                                                        value={
                                                            replyData.content
                                                        }
                                                        onChange={
                                                            handleReplyContentChange
                                                        }
                                                        onKeyDown={
                                                            handleReplyKeyDown
                                                        }
                                                        onPaste={(e) =>
                                                            handleClipboardPaste(
                                                                e,
                                                                true,
                                                            )
                                                        }
                                                        placeholder="返信を入力... (@でページをメンション)"
                                                        className="min-h-[60px] resize-none text-sm"
                                                        maxLength={1000}
                                                        autoFocus
                                                    />

                                                    {/* 返信時のサジェストリスト */}
                                                    {showReplySuggestions &&
                                                        replySuggestions.length >
                                                            0 && (
                                                            <Card className="absolute top-[calc(100%-56px)] left-0 z-50 mt-0 max-h-60 w-full gap-0 overflow-y-auto p-0">
                                                                {replySuggestions.map(
                                                                    (
                                                                        suggestion,
                                                                        index,
                                                                    ) => (
                                                                        <button
                                                                            key={
                                                                                suggestion.slug
                                                                            }
                                                                            type="button"
                                                                            onClick={() =>
                                                                                insertReplyMention(
                                                                                    suggestion.slug,
                                                                                )
                                                                            }
                                                                            className={`w-full border-b px-4 py-2 text-left leading-none hover:bg-muted ${
                                                                                index ===
                                                                                selectedReplySuggestionIndex
                                                                                    ? 'bg-muted'
                                                                                    : ''
                                                                            }`}
                                                                        >
                                                                            <div className="text-sm leading-none font-medium">
                                                                                @
                                                                                {
                                                                                    suggestion.slug
                                                                                }
                                                                            </div>
                                                                            <div className="text-xs leading-none text-muted-foreground">
                                                                                {
                                                                                    suggestion.title
                                                                                }
                                                                            </div>
                                                                        </button>
                                                                    ),
                                                                )}
                                                            </Card>
                                                        )}
                                                </div>

                                                {/* 返信画像プレビュー */}
                                                {replyPreviewImages.length >
                                                    0 && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {replyPreviewImages.map(
                                                            (
                                                                preview,
                                                                index,
                                                            ) => (
                                                                <div
                                                                    key={index}
                                                                    className="group relative"
                                                                >
                                                                    <img
                                                                        src={
                                                                            preview
                                                                        }
                                                                        alt={`Preview ${index + 1}`}
                                                                        className="h-24 w-full rounded-lg object-cover"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            removeReplyImage(
                                                                                index,
                                                                            )
                                                                        }
                                                                        className="absolute top-1 right-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
                                                                    >
                                                                        <X className="size-3" />
                                                                    </button>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between">
                                                    <div className="flex gap-1">
                                                        <input
                                                            ref={
                                                                replyFileInputRef
                                                            }
                                                            type="file"
                                                            multiple
                                                            accept="image/*"
                                                            onChange={
                                                                handleReplyImageChange
                                                            }
                                                            className="hidden"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                replyFileInputRef.current?.click()
                                                            }
                                                            disabled={
                                                                replyData.images
                                                                    .length >= 4
                                                            }
                                                            className="size-8"
                                                        >
                                                            <ImageIcon className="size-4" />
                                                        </Button>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={
                                                                handleCancelReply
                                                            }
                                                        >
                                                            キャンセル
                                                        </Button>
                                                        <Button
                                                            type="submit"
                                                            size="sm"
                                                            disabled={
                                                                replyProcessing ||
                                                                (!replyData.content.trim() &&
                                                                    replyData
                                                                        .images
                                                                        .length ===
                                                                        0)
                                                            }
                                                        >
                                                            <Send className="mr-2 size-3" />
                                                            返信
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* 画像ライトボックス */}
            <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                <DialogContent className="max-w-4xl p-0">
                    <div className="relative">
                        <img
                            src={lightboxImages[currentImageIndex]}
                            alt="Full size"
                            className="h-auto w-full"
                        />
                        {lightboxImages.length > 1 && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={prevImage}
                                    className="absolute top-1/2 left-2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                                >
                                    <ChevronLeft className="size-6" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={nextImage}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                                >
                                    <ChevronRight className="size-6" />
                                </Button>
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                                    {currentImageIndex + 1} /{' '}
                                    {lightboxImages.length}
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* 画像トリミング */}
            {currentProcessingImage && cropDialogOpen && (
                <ImageCropper
                    open={cropDialogOpen}
                    onClose={handleCropCancel}
                    image={currentProcessingImage}
                    onCropComplete={handleCropComplete}
                    onSkip={handleCropSkip}
                />
            )}

            {/* 画像フィルター */}
            {currentProcessingImage && filterDialogOpen && (
                <ImageFilter
                    open={filterDialogOpen}
                    onClose={handleFilterCancel}
                    image={currentProcessingImage}
                    onApply={handleFilterApply}
                />
            )}
        </div>
    );
}
