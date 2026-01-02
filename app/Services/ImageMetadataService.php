<?php

namespace App\Services;

use Illuminate\Http\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImageMetadataService
{
    /**
     * @return array{path: string, metadata: array{make: ?string, model: ?string, datetime_original: ?string, orientation: ?int, gps: array{latitude: ?float, longitude: ?float, latitude_ref: ?string, longitude_ref: ?string}}|null}
     */
    public function storeUploadedImage(
        UploadedFile $file,
        string $directory,
        string $disk = 'public'
    ): array {
        $extension = strtolower((string) $file->getClientOriginalExtension());

        if (! in_array($extension, ['jpg', 'jpeg'], true)) {
            return [
                'path' => $file->store($directory, $disk),
                'metadata' => null,
            ];
        }

        $metadata = $this->extractJpegMetadata($file->getPathname());
        $path = $this->storeJpegWithoutMetadata($file, $directory, $disk, $metadata);

        return [
            'path' => $path,
            'metadata' => $metadata,
        ];
    }

    /**
     * @param  array{orientation: ?int}|null  $metadata
     */
    private function storeJpegWithoutMetadata(
        UploadedFile $file,
        string $directory,
        string $disk,
        ?array $metadata
    ): string {
        $image = imagecreatefromjpeg($file->getPathname());

        if (! $image instanceof \GdImage) {
            return $file->store($directory, $disk);
        }

        $image = $this->applyOrientation($image, $metadata['orientation'] ?? null);

        $tempPath = tempnam(sys_get_temp_dir(), 'jpeg-');
        if ($tempPath === false) {
            return $file->store($directory, $disk);
        }

        imagejpeg($image, $tempPath, 92);
        imagedestroy($image);

        $filename = Str::random(40).'.jpg';
        $storedPath = Storage::disk($disk)->putFileAs(
            $directory,
            new File($tempPath),
            $filename
        );

        @unlink($tempPath);

        return $storedPath;
    }

    /**
     * @return array{make: ?string, model: ?string, datetime_original: ?string, orientation: ?int, gps: array{latitude: ?float, longitude: ?float, latitude_ref: ?string, longitude_ref: ?string}}|null
     */
    private function extractJpegMetadata(string $path): ?array
    {
        $data = $this->readExifData($path);

        if ($data === null) {
            return null;
        }

        $make = $this->normalizeString($data['IFD0']['Make'] ?? null);
        $model = $this->normalizeString($data['IFD0']['Model'] ?? null);
        $datetimeOriginal = $this->normalizeString($data['EXIF']['DateTimeOriginal'] ?? null);
        $orientation = isset($data['IFD0']['Orientation'])
            ? (int) $data['IFD0']['Orientation']
            : null;

        $gpsLatitudeRef = $this->normalizeString($data['GPS']['GPSLatitudeRef'] ?? null);
        $gpsLongitudeRef = $this->normalizeString($data['GPS']['GPSLongitudeRef'] ?? null);
        $gpsLatitude = $this->parseCoordinate(
            $data['GPS']['GPSLatitude'] ?? null,
            $gpsLatitudeRef
        );
        $gpsLongitude = $this->parseCoordinate(
            $data['GPS']['GPSLongitude'] ?? null,
            $gpsLongitudeRef
        );

        $metadata = [
            'make' => $make,
            'model' => $model,
            'datetime_original' => $datetimeOriginal,
            'orientation' => $orientation,
            'gps' => [
                'latitude' => $gpsLatitude,
                'longitude' => $gpsLongitude,
                'latitude_ref' => $gpsLatitudeRef,
                'longitude_ref' => $gpsLongitudeRef,
            ],
        ];

        if (! $this->hasMetadata($metadata)) {
            return null;
        }

        return $metadata;
    }

    private function readExifData(string $path): ?array
    {
        if (! function_exists('exif_read_data')) {
            return null;
        }

        $data = @exif_read_data($path, 'IFD0,EXIF,GPS', true, false);

        return is_array($data) ? $data : null;
    }

    private function normalizeString(mixed $value): ?string
    {
        $stringValue = is_string($value) ? trim($value) : null;

        return $stringValue === '' ? null : $stringValue;
    }

    /**
     * @param  array<int, mixed>|null  $coordinate
     */
    private function parseCoordinate(?array $coordinate, ?string $ref): ?float
    {
        if ($coordinate === null || count($coordinate) < 3) {
            return null;
        }

        $degrees = $this->parseExifRational($coordinate[0]);
        $minutes = $this->parseExifRational($coordinate[1]);
        $seconds = $this->parseExifRational($coordinate[2]);

        if ($degrees === null || $minutes === null || $seconds === null) {
            return null;
        }

        $decimal = $degrees + ($minutes / 60) + ($seconds / 3600);

        if ($ref === 'S' || $ref === 'W') {
            $decimal *= -1;
        }

        return $decimal;
    }

    private function parseExifRational(mixed $value): ?float
    {
        if (is_numeric($value)) {
            return (float) $value;
        }

        if (! is_string($value) || ! str_contains($value, '/')) {
            return null;
        }

        [$numerator, $denominator] = explode('/', $value, 2);

        if (! is_numeric($numerator) || ! is_numeric($denominator)) {
            return null;
        }

        $denominatorValue = (float) $denominator;
        if ($denominatorValue == 0.0) {
            return null;
        }

        return (float) $numerator / $denominatorValue;
    }

    /**
     * @param  array{make: ?string, model: ?string, datetime_original: ?string, orientation: ?int, gps: array{latitude: ?float, longitude: ?float, latitude_ref: ?string, longitude_ref: ?string}}  $metadata
     */
    private function hasMetadata(array $metadata): bool
    {
        if (
            $metadata['make'] !== null ||
            $metadata['model'] !== null ||
            $metadata['datetime_original'] !== null ||
            $metadata['orientation'] !== null
        ) {
            return true;
        }

        $gps = $metadata['gps'];

        return $gps['latitude'] !== null ||
            $gps['longitude'] !== null ||
            $gps['latitude_ref'] !== null ||
            $gps['longitude_ref'] !== null;
    }

    private function applyOrientation(\GdImage $image, ?int $orientation): \GdImage
    {
        if ($orientation === null) {
            return $image;
        }

        switch ($orientation) {
            case 2:
                imageflip($image, IMG_FLIP_HORIZONTAL);
                break;
            case 3:
                $image = $this->rotateImage($image, 180);
                break;
            case 4:
                imageflip($image, IMG_FLIP_VERTICAL);
                break;
            case 5:
                imageflip($image, IMG_FLIP_HORIZONTAL);
                $image = $this->rotateImage($image, 270);
                break;
            case 6:
                $image = $this->rotateImage($image, -90);
                break;
            case 7:
                imageflip($image, IMG_FLIP_HORIZONTAL);
                $image = $this->rotateImage($image, -90);
                break;
            case 8:
                $image = $this->rotateImage($image, 90);
                break;
        }

        return $image;
    }

    private function rotateImage(\GdImage $image, int $angle): \GdImage
    {
        $rotated = imagerotate($image, $angle, 0);

        if (! $rotated instanceof \GdImage) {
            return $image;
        }

        imagedestroy($image);

        return $rotated;
    }
}
