import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { useEffect, useRef, useState } from 'react';

export type FilterType = 'normal' | 'grayscale' | 'sepia' | 'vintage' | 'brighten' | 'contrast' | 'cool' | 'warm' | 'vignette' | 'grain' | 'drama';

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
    { name: 'ビネット', type: 'vignette' },
    { name: 'グレイン', type: 'grain' },
    { name: 'ドラマ', type: 'drama' },
];

export function ImageFilter({ open, onClose, image, onApply }: ImageFilterProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedFilter, setSelectedFilter] = useState<FilterType>('normal');
    const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
    const [intensity, setIntensity] = useState(100);

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
            applyFilter(selectedFilter, intensity);
        }
    }, [selectedFilter, originalImage, intensity]);

    const applyFilter = (filterType: FilterType, filterIntensity: number) => {
        const canvas = canvasRef.current;
        if (!canvas || !originalImage) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // キャンバスサイズを画像に合わせる
        canvas.width = originalImage.width;
        canvas.height = originalImage.height;

        // 高品質な画像スケーリング設定
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 画像を描画
        ctx.drawImage(originalImage, 0, 0);

        // ピクセルデータを取得
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // オリジナルのピクセルデータを保存（強度調整用）
        const originalData = new Uint8ClampedArray(data);

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

            case 'vignette': {
                // ビネット効果：中心から周辺を暗くする
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);

                for (let y = 0; y < canvas.height; y++) {
                    for (let x = 0; x < canvas.width; x++) {
                        const i = (y * canvas.width + x) * 4;
                        const dx = x - centerX;
                        const dy = y - centerY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const vignette = 1 - Math.pow(distance / maxDistance, 2) * 0.7;

                        data[i] = Math.max(0, data[i] * vignette);
                        data[i + 1] = Math.max(0, data[i + 1] * vignette);
                        data[i + 2] = Math.max(0, data[i + 2] * vignette);
                    }
                }
                break;
            }

            case 'grain': {
                // グレイン効果：フィルム粒子を追加
                for (let i = 0; i < data.length; i += 4) {
                    const noise = (Math.random() - 0.5) * 40;
                    data[i] = Math.min(255, Math.max(0, data[i] + noise));
                    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
                    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
                }
                break;
            }

            case 'drama': {
                // ドラマ効果：ビネット + 高コントラスト + 彩度アップ
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
                const contrastFactor = 1.8;

                for (let y = 0; y < canvas.height; y++) {
                    for (let x = 0; x < canvas.width; x++) {
                        const i = (y * canvas.width + x) * 4;
                        const dx = x - centerX;
                        const dy = y - centerY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const vignette = 1 - Math.pow(distance / maxDistance, 2) * 0.5;

                        // コントラスト
                        let r = Math.min(255, Math.max(0, contrastFactor * (data[i] - 128) + 128));
                        let g = Math.min(255, Math.max(0, contrastFactor * (data[i + 1] - 128) + 128));
                        let b = Math.min(255, Math.max(0, contrastFactor * (data[i + 2] - 128) + 128));

                        // 彩度アップ
                        const gray = r * 0.299 + g * 0.587 + b * 0.114;
                        const saturation = 1.3;
                        r = Math.min(255, gray + (r - gray) * saturation);
                        g = Math.min(255, gray + (g - gray) * saturation);
                        b = Math.min(255, gray + (b - gray) * saturation);

                        // ビネット適用
                        data[i] = Math.max(0, r * vignette);
                        data[i + 1] = Math.max(0, g * vignette);
                        data[i + 2] = Math.max(0, b * vignette);
                    }
                }
                break;
            }

            case 'normal':
            default:
                // オリジナルのまま
                break;
        }

        // フィルター強度を適用（元の画像とブレンド）
        if (filterType !== 'normal' && filterIntensity < 100) {
            const ratio = filterIntensity / 100;
            for (let i = 0; i < data.length; i += 4) {
                data[i] = originalData[i] * (1 - ratio) + data[i] * ratio;
                data[i + 1] = originalData[i + 1] * (1 - ratio) + data[i + 1] * ratio;
                data[i + 2] = originalData[i + 2] * (1 - ratio) + data[i + 2] * ratio;
            }
        }

        if (filterType !== 'normal') {
            ctx.putImageData(imageData, 0, 0);
        }
    };

    const handleApply = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.toBlob(
            (blob) => {
                if (blob) {
                    const filteredFile = new File([blob], image.name, { type: image.type });
                    onApply(filteredFile);
                    onClose();
                }
            },
            image.type,
            // JPEGの場合は品質を0.95に設定（0.0-1.0、デフォルトは0.92）
            image.type === 'image/jpeg' ? 0.95 : undefined
        );
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
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
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

                    {/* フィルター強度 */}
                    {selectedFilter !== 'normal' && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">フィルター強度</label>
                                <span className="text-sm text-muted-foreground">{intensity}%</span>
                            </div>
                            <Slider
                                value={[intensity]}
                                onValueChange={(value) => setIntensity(value[0])}
                                min={0}
                                max={100}
                                step={1}
                                className="w-full"
                            />
                        </div>
                    )}
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
