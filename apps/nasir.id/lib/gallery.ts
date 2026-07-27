import sql from './db';

// Records an upload in the shared gallery table so it shows up in the
// Gallery admin page regardless of where the upload happened (Gallery
// itself, or the Articles/Portfolio editors -- they all call the same
// /api/upload routes). Best-effort: a tracking failure should never break
// the actual upload, which already succeeded in S3 by the time this runs.
export async function recordGalleryUpload(image: {
    url: string;
    name: string;
    size: number;
}): Promise<void> {
    try {
        await sql`
            INSERT INTO gallery_images (url, name, size)
            VALUES (${image.url}, ${image.name}, ${image.size})
            ON CONFLICT (url) DO NOTHING
        `;
    } catch (error) {
        console.error('Failed to record gallery upload:', error);
    }
}
