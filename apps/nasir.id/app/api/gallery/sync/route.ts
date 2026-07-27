import { NextResponse } from 'next/server';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { s3Client } from '@/lib/s3';
import { isAuthenticated } from '@/lib/auth';
import sql from '@/lib/db';

const SIZE_SUFFIXES = ['-large', '-medium', '-thumb'] as const;
// Preferred variant to use as "the" URL for a given image, matching what
// /api/upload itself returns (result.medium || result.original).
const VARIANT_PREFERENCE = ['medium', 'original', 'large', 'thumb'] as const;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;

interface Variant {
    key: string;
    size: number;
    lastModified: Date;
}

// POST /api/gallery/sync - Scans the S3 bucket directly and backfills
// gallery_images with every image that was ever uploaded, including ones
// uploaded before this table existed (via the Articles/Portfolio editors,
// or via the old localStorage-only Gallery). Safe to run repeatedly --
// ON CONFLICT (url) DO NOTHING skips anything already recorded.
export async function POST() {
    const authed = await isAuthenticated();
    if (!authed) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bucket = process.env.AWS_S3_BUCKET || '';
    if (!bucket) {
        return NextResponse.json({ error: 'S3 bucket not configured' }, { status: 500 });
    }

    try {
        // groupKey (path + base filename, no size suffix or extension) -> variants found
        const groups = new Map<string, Partial<Record<'original' | 'large' | 'medium' | 'thumb', Variant>>>();

        let continuationToken: string | undefined;
        let scanned = 0;

        do {
            const page = await s3Client.send(new ListObjectsV2Command({
                Bucket: bucket,
                Prefix: 'uploads/',
                ContinuationToken: continuationToken,
            }));

            for (const obj of page.Contents || []) {
                const key = obj.Key;
                if (!key || !IMAGE_EXT.test(key)) continue;
                scanned++;

                const lastSlash = key.lastIndexOf('/');
                const basePath = key.slice(0, lastSlash);
                const filename = key.slice(lastSlash + 1);
                const dot = filename.lastIndexOf('.');
                const nameWithoutExt = dot === -1 ? filename : filename.slice(0, dot);

                let variant: 'original' | 'large' | 'medium' | 'thumb' = 'original';
                let baseFilename = nameWithoutExt;
                for (const suffix of SIZE_SUFFIXES) {
                    if (nameWithoutExt.endsWith(suffix)) {
                        variant = suffix.slice(1) as 'large' | 'medium' | 'thumb';
                        baseFilename = nameWithoutExt.slice(0, -suffix.length);
                        break;
                    }
                }

                const groupKey = `${basePath}/${baseFilename}`;
                const entry = groups.get(groupKey) || {};
                entry[variant] = {
                    key,
                    size: obj.Size || 0,
                    lastModified: obj.LastModified || new Date(),
                };
                groups.set(groupKey, entry);
            }

            continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
        } while (continuationToken);

        let imported = 0;
        for (const [groupKey, variants] of Array.from(groups.entries())) {
            const chosenVariant = VARIANT_PREFERENCE.find((v) => variants[v]);
            if (!chosenVariant) continue;
            const chosen = variants[chosenVariant]!;

            const url = `https://assets.nasir.id/${chosen.key}`;
            const baseFilename = groupKey.slice(groupKey.lastIndexOf('/') + 1);
            // Stored keys are "{timestamp}-{original filename without ext}" -- strip
            // the timestamp prefix to get something readable back for display.
            const name = baseFilename.replace(/^\d+-/, '') || baseFilename;

            const result = await sql`
                INSERT INTO gallery_images (url, name, size, uploaded_at)
                VALUES (${url}, ${name}, ${chosen.size}, ${chosen.lastModified.toISOString()})
                ON CONFLICT (url) DO NOTHING
                RETURNING id
            `;
            if (result.length > 0) imported++;
        }

        return NextResponse.json({
            success: true,
            scanned,
            groupsFound: groups.size,
            imported,
        });
    } catch (error) {
        console.error('Error syncing gallery from S3:', error);
        return NextResponse.json({ error: 'Failed to sync gallery from S3' }, { status: 500 });
    }
}
