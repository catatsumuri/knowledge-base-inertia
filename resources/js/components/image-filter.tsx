import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEffect, useRef, useState } from 'react';

export type FilterType = 'normal' | 'grayscale' | 'sepia' | 'vintage' | 'brighten' | 'contrast' | 'cool' | 'warm';

interface ImageFilterProps {
    open: boolean;
    onClose: () => void;
    image: File;
    onApply: (filteredImage: File) => void;
}

const filters: { name: string; type: FilterType }[] = [
    { name: 'オリジナル', type: 'normal' },
    { name: 'グレースケール', type: 'grayscale' },
    { name: 'セピア', type: 'sepia' },
    { name: 'ビンテージ', type: 'vintage' },
    { name: '明るく', type: 'brighten' },
    { name: 'コントラスト', type: 'contrast' },
    { name: 'クール', type: 'cool' },
    { name: 'ウォーム', type: 'warm' },
];

export function ImageFilter({ open, onClose, image, onApply }: ImageFilterProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedFilter, setSelectedFilter] = useState<FilterType>('normal');
    const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);

    useEffect(() => {
        if (open && image) {
            const img = new Image();
            const url = URL.createObjectURL(image);
            img.onload = () => {
                setOriginalImage(img);
                URL.revokeObjectURL(url);
            };
            img.src = url;
        }
    }, [open, image]);

    useEffect(() => {
        if (originalImage && canvasRef.current) {
            applyFilter(selectedFilter);
        }
    }, [selectedFilter, originalImage]);

    const applyFilter = (filterType: FilterType) => {
        const canvas = canvasRef.current;
        if (!canvas || !originalImage) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // キャンバスサイズを画像に合わせる
        canvas.width = originalImage.width;
        canvas.height = originalImage.height;

        // 画像を描画
        ctx.drawImage(originalImage, 0, 0);

        // ピクセルデータを取得
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // フィルター適用
        switch (filterType) {
            case 'grayscale':
                for (let i = 0; i < data.length; i += 4) {
                    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                    data[i] = data[i + 1] = data[i + 2] = gray;
                }
                break;

            case 'sepia':
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
                    data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
                    data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
                }
                break;

            case 'vintage':
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    data[i] = Math.min(255, r * 1.2 + 20);
                    data[i + 1] = Math.min(255, g * 0.9);
                    data[i + 2] = Math.min(255, b * 0.7);
                }
                break;

            case 'brighten':
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, data[i] + 30);
                    data[i + 1] = Math.min(255, data[i + 1] + 30);
                    data[i + 2] = Math.min(255, data[i + 2] + 30);
                }
                break;

            case 'contrast':
                const factor = 1.5;
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
                    data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
                    data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
                }
                break;

            case 'cool':
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.max(0, data[i] - 20);
                    data[i + 2] = Math.min(255, data[i + 2] + 20);
                }
                break;

            case 'warm':
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, data[i] + 20);
                    data[i + 2] = Math.max(0, data[i + 2] - 20);
                }
                break;

            case 'normal':
            default:
                // オリジナルのまま
                break;
        }

        if (filterType !== 'normal') {
            ctx.putImageData(imageData, 0, 0);
        }
    };

    const handleApply = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.toBlob((blob) => {
            if (blob) {
                const filteredFile = new File([blob], image.name, { type: image.type });
                onApply(filteredFile);
                onClose();
            }
        }, image.type);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>フィルターを選択</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* プレビュー */}
                    <div className="flex justify-center">
                        <canvas ref={canvasRef} className="max-h-96 rounded-lg border" />
                    </div>

                    {/* フィルター選択 */}
                    <div className="grid grid-cols-4 gap-2">
                        {filters.map((filter) => (
                            <Button
                                key={filter.type}
                                variant={selectedFilter === filter.type ? 'default' : 'outline'}
                                onClick={() => setSelectedFilter(filter.type)}
                                className="text-xs"
                            >
                                {filter.name}
                            </Button>
                        ))}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        キャンセル
                    </Button>
                    <Button onClick={handleApply}>適用</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
