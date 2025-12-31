import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useEffect, useRef, useState } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropperProps {
    open: boolean;
    onClose: () => void;
    image: File;
    onCropComplete: (croppedImage: File) => void;
    onSkip: () => void;
}

export function ImageCropper({
    open,
    onClose,
    image,
    onCropComplete,
    onSkip,
}: ImageCropperProps) {
    const [imageSrc, setImageSrc] = useState<string>('');
    const [crop, setCrop] = useState<Crop>({
        unit: '%',
        width: 90,
        height: 90,
        x: 5,
        y: 5,
    });
    const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // 画像を読み込み
    useEffect(() => {
        if (image) {
            const reader = new FileReader();
            reader.onload = () => {
                setImageSrc(reader.result as string);
            };
            reader.readAsDataURL(image);
        }
    }, [image]);

    const getCroppedImage = async (): Promise<Blob> => {
        if (!completedCrop || !imgRef.current) {
            throw new Error('Crop area not defined');
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('No 2d context');
        }

        const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
        const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

        // 元画像の実際のサイズでcanvasを設定（高解像度を維持）
        const cropWidth = completedCrop.width * scaleX;
        const cropHeight = completedCrop.height * scaleY;

        canvas.width = cropWidth;
        canvas.height = cropHeight;

        // 高品質な画像スケーリング設定
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(
            imgRef.current,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            cropWidth,
            cropHeight,
            0,
            0,
            cropWidth,
            cropHeight,
        );

        return new Promise((resolve) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    }
                },
                image.type,
                // JPEGの場合は品質を0.95に設定（0.0-1.0、デフォルトは0.92）
                image.type === 'image/jpeg' ? 0.95 : undefined,
            );
        });
    };

    const handleCrop = async () => {
        try {
            const croppedBlob = await getCroppedImage();
            const croppedFile = new File([croppedBlob], image.name, {
                type: image.type,
            });
            onCropComplete(croppedFile);
        } catch (error) {
            console.error('Crop error:', error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>画像をトリミング</DialogTitle>
                </DialogHeader>

                <div className="flex justify-center">
                    {imageSrc && (
                        <ReactCrop
                            crop={crop}
                            onChange={(c) => setCrop(c)}
                            onComplete={(c) => setCompletedCrop(c)}
                            className="max-h-96"
                        >
                            <img
                                ref={imgRef}
                                src={imageSrc}
                                alt="Crop"
                                className="max-h-96"
                            />
                        </ReactCrop>
                    )}
                </div>

                <DialogFooter>
                    <div className="flex w-full items-center justify-between">
                        <Button variant="outline" onClick={onClose}>
                            キャンセル
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={onSkip}>
                                スキップ
                            </Button>
                            <Button onClick={handleCrop}>
                                トリミングして次へ
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
