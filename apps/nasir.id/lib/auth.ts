import { cookies } from 'next/headers';
import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'nasir-id-secret-key-2026';

export function generateToken(): string {
    const hash = crypto
        .createHmac('sha256', TOKEN_SECRET)
        .update(ADMIN_PASSWORD + Date.now().toString())
        .digest('hex');
    return hash;
}

export function verifyPassword(password: string): boolean {
    return password === ADMIN_PASSWORD;
}

export async function isAuthenticated(): Promise<boolean> {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token');
    return !!token?.value;
}
