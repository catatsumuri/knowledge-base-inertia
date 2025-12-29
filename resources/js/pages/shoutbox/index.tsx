import { store, destroy } from '@/actions/App/Http/Controllers/ShoutboxController';
import { ImageCropper } from '@/components/image-cropper';
import { ImageFilter } from '@/components/image-filter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useInitials } from '@/hooks/use-initials';
import { useLang } from '@/hooks/useLang';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type PaginatedData, type User } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Image as ImageIcon, Send, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';

interface Shout {
    id: number;
    user_id: number;
    content: string;
    images: string[] | null;
    created_at: string;
    user: User;
}

interface ShoutboxIndexProps {
    shouts: PaginatedData<Shout>;
}

export default function ShoutboxIndex({ shouts }: ShoutboxIndexProps) {
    const { __ } = useLang();
    const page = usePage<{ auth: { user: User } }>();
    const getInitials = useInitials();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewImages, setPreviewImages] = useState<string[]>([]);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxImages, setLightboxImages] = useState<string[]>([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const [filterDialogOpen, setFilterDialogOpen] = useState(false);
    const [currentProcessingImage, setCurrentProcessingImage] = useState<File | null>(null);
    const [currentFilteringIndex, setCurrentFilteringIndex] = useState<number | null>(null);

    const { data, setData, post, processing, reset, errors } = useForm({
        content: '',
        images: [] as File[],
    });

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: __('Shoutbox'),
            href: '/shoutbox',
        },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(store(), {
            onSuccess: () => {
                reset();
                setPreviewImages([]);
            },
        });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length + data.images.length > 4) {
            alert('画像は最大4枚までです');
            return;
        }

        // 最初の画像にトリミング→フィルターを適用
        if (files.length > 0) {
            setCurrentProcessingImage(files[0]);
            setCurrentFilteringIndex(data.images.length);
            setCropDialogOpen(true);

            // 残りの画像は一時保存
            if (files.length > 1) {
                // 2枚目以降は後で処理
                const remainingFiles = files.slice(1);
                remainingFiles.forEach((file) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setPreviewImages((prev) => [...prev, reader.result as string]);
                    };
                    reader.readAsDataURL(file);
                    setData('images', [...data.images, file]);
                });
            }
        }

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
        setData('images', [...data.images, filteredImage]);

        // プレビュー生成
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewImages((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(filteredImage);

        // ダイアログを閉じる
        setFilterDialogOpen(false);
        setCurrentProcessingImage(null);
        setCurrentFilteringIndex(null);
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
        setCurrentImageIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={__('Shoutbox')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:px-8 lg:px-16">
                {/* 投稿フォーム */}
                <Card className="p-4">
                    <form onSubmit={handleSubmit}>
                        <div className="flex gap-3">
                            <Avatar className="size-10">
                                <AvatarImage src={page.props.auth.user.avatar} />
                                <AvatarFallback>{getInitials(page.props.auth.user.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-3">
                                <Textarea
                                    value={data.content}
                                    onChange={(e) => setData('content', e.target.value)}
                                    placeholder="いま何してる？"
                                    className="min-h-[100px] resize-none border-none p-0 text-lg focus-visible:ring-0"
                                    maxLength={1000}
                                />

                                {/* 画像プレビュー */}
                                {previewImages.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {previewImages.map((preview, index) => (
                                            <div key={index} className="group relative">
                                                <img
                                                    src={preview}
                                                    alt={`Preview ${index + 1}`}
                                                    className="h-32 w-full rounded-lg object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(index)}
                                                    className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                                                >
                                                    <X className="size-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {errors.content && (
                                    <p className="text-sm text-destructive">{errors.content}</p>
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
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={data.images.length >= 4}
                                        >
                                            <ImageIcon className="size-5" />
                                        </Button>
                                    </div>
                                    <Button type="submit" disabled={processing || !data.content.trim()}>
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
                    {shouts.data.map((shout) => (
                        <Card key={shout.id} className="p-4">
                            <div className="flex gap-3">
                                <Avatar className="size-10">
                                    <AvatarImage src={shout.user.avatar} />
                                    <AvatarFallback>{getInitials(shout.user.name)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-semibold">{shout.user.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(shout.created_at), 'PPP p', {
                                                    locale: ja,
                                                })}
                                            </p>
                                        </div>
                                        {shout.user_id === page.props.auth.user.id && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(shout.id)}
                                                className="size-8"
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <p className="mt-2 whitespace-pre-wrap break-words">{shout.content}</p>

                                    {/* 画像 */}
                                    {shout.images && shout.images.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {shout.images.map((image, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={() =>
                                                        openLightbox(
                                                            shout.images!.map((img) => `/storage/${img}`),
                                                            index,
                                                        )
                                                    }
                                                    className="group relative overflow-hidden rounded-lg transition-opacity hover:opacity-90"
                                                >
                                                    <img
                                                        src={`/storage/${image}`}
                                                        alt={`Image ${index + 1}`}
                                                        className="h-32 w-32 object-cover"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
                                                        <ImageIcon className="size-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
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
                                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                                    >
                                        <ChevronLeft className="size-6" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={nextImage}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                                    >
                                        <ChevronRight className="size-6" />
                                    </Button>
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                                        {currentImageIndex + 1} / {lightboxImages.length}
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
        </AppLayout>
    );
}
