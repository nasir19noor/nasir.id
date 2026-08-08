export const API_URL = import.meta.env.PUBLIC_API_URL || 'https://api.layarsehat.nasir.id';

const TOKEN_KEY = 'layarsehat_token';
const PARENT_KEY = 'layarsehat_parent';

export function simpanSesi(token, parent) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(PARENT_KEY, JSON.stringify(parent));
}

export function ambilToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function ambilOrangTua() {
  const raw = localStorage.getItem(PARENT_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function keluar() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PARENT_KEY);
  window.location.href = '/masuk';
}

export function wajibMasuk() {
  if (!ambilToken()) {
    window.location.href = '/masuk';
    return false;
  }
  return true;
}

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = ambilToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    keluar();
    throw new Error('Sesi berakhir, silakan masuk kembali');
  }

  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const detail = data && data.detail;
    throw new Error(typeof detail === 'string' ? detail : 'Terjadi kesalahan pada server');
  }
  return data;
}

/** Detik → "2 j 15 mnt" */
export function formatDurasi(detik) {
  const total = Math.round(detik / 60);
  const jam = Math.floor(total / 60);
  const menit = total % 60;
  if (jam && menit) return `${jam} j ${menit} mnt`;
  if (jam) return `${jam} jam`;
  return `${menit} mnt`;
}

export function formatTanggal(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

/** Selisih waktu dalam bahasa Indonesia, mis. "3 menit lalu" */
export function waktuLalu(iso) {
  if (!iso) return 'Belum pernah terhubung';
  const detik = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (detik < 60) return 'Baru saja';
  if (detik < 3600) return `${Math.floor(detik / 60)} menit lalu`;
  if (detik < 86400) return `${Math.floor(detik / 3600)} jam lalu`;
  return `${Math.floor(detik / 86400)} hari lalu`;
}

export function escapeHtml(teks) {
  return String(teks ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
