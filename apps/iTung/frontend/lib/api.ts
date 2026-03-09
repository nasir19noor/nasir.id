import axios from 'axios'
import Cookies from 'js-cookie'

const TOKEN_KEY = 'itung_token'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000',
})

api.interceptors.request.use((config) => {
  const token = Cookies.get(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type Difficulty = 'sangat_mudah' | 'mudah' | 'sedang' | 'sulit' | 'sangat_sulit'

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  sangat_mudah: 'Sangat Mudah',
  mudah: 'Mudah',
  sedang: 'Sedang',
  sulit: 'Sulit',
  sangat_sulit: 'Sangat Sulit',
}

export interface User {
  id: number
  username: string
  email: string
  full_name: string | null
  phone_number: string | null
  is_active: boolean
  is_admin: boolean
  ai_access: boolean
  birth_date: string | null   // ISO date: "YYYY-MM-DD"
  avatar_url: string | null
  cartoon_url: string | null
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

export interface Question {
  id: number
  question: string
  choices: string[]
  difficulty: Difficulty
  image_url: string | null
  number: number
}

export interface Performance {
  total: number
  correct: number
  accuracy: number
  weak_topics: string[]
  strong_topics: string[]
  next_difficulty: Difficulty
  recent_history: { topic: string; correct: boolean; difficulty: string }[]
}

export interface CreateSessionResponse {
  session_id: number
  topic: string
  total_questions: number
  use_ai: boolean
  first_question: Question
}

export interface SubmitAnswerResponse {
  is_correct: boolean
  explanation: string
  session_score: number
  next_question: Question | null
  performance: Performance
}

export interface Session {
  id: number
  topic: string
  total_questions: number
  score: number
  completed: boolean
  use_ai: boolean
}

export interface TopicStat {
  topic: string
  questions: number
  correct: number
  accuracy: number
  skill_level: 'pemula' | 'berkembang' | 'mahir' | 'ahli'
}

export interface RecentSession {
  session_id: number
  topic: string
  score: number
  total: number
  created_at: string | null
}

export interface UserStats {
  total_sessions: number
  total_questions: number
  overall_accuracy: number
  topics: TopicStat[]
  recent_sessions: RecentSession[]
}

// ─── API key types ────────────────────────────────────────────────────────────

export interface ApiKeyInfo {
  has_key: boolean
  preview: string | null
}

export interface ApiKeysResponse {
  claude: ApiKeyInfo
  gemini: ApiKeyInfo
}

// ─── Auth endpoints ────────────────────────────────────────────────────────────

export async function login(username: string, password: string): Promise<LoginResponse> {
  const form = new URLSearchParams()
  form.append('username', username)
  form.append('password', password)
  const res = await api.post<LoginResponse>('/api/users/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return res.data
}

export async function sendOtp(phone: string): Promise<void> {
  await api.post('/api/users/send-otp', { phone })
}

export async function register(data: {
  username: string
  email: string
  full_name?: string
  password: string
  phone_number: string
  otp_code: string
  birth_date: string
}): Promise<User> {
  const res = await api.post<User>('/api/users/register', data)
  return res.data
}

export async function getMe(): Promise<User> {
  const res = await api.get<User>('/api/users/me')
  return res.data
}

export async function updateMe(data: { full_name?: string; email?: string; birth_date?: string }): Promise<User> {
  const res = await api.put<User>('/api/users/me', data)
  return res.data
}

export async function deleteMe(): Promise<void> {
  await api.delete('/api/users/me')
}

export async function googleLogin(
  idToken: string,
  username?: string,
  birthDate?: string,
  phone?: string,
  otp?: string,
  fullName?: string,
): Promise<{ needs_username?: boolean; google_email?: string; google_name?: string; access_token?: string; token_type?: string; user?: User }> {
  const res = await api.post('/api/users/google-login', {
    id_token: idToken,
    username,
    full_name: fullName,
    birth_date: birthDate,
    phone_number: phone,
    otp_code: otp,
  })
  return res.data
}

export async function getApiKeys(): Promise<ApiKeysResponse> {
  const res = await api.get<ApiKeysResponse>('/api/users/me/api-keys')
  return res.data
}

export async function updateApiKey(provider: 'claude' | 'gemini', key: string): Promise<void> {
  await api.put(`/api/users/me/api-keys/${provider}`, { key })
}

export async function deleteApiKey(provider: 'claude' | 'gemini'): Promise<void> {
  await api.delete(`/api/users/me/api-keys/${provider}`)
}

export async function uploadAvatar(file: File): Promise<{ avatar_url: string; cartoon_url: string | null }> {
  const form = new FormData()
  form.append('file', file)
  const res = await api.post<{ avatar_url: string; cartoon_url: string | null }>('/api/users/me/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

// ─── Quiz endpoints ────────────────────────────────────────────────────────────

export type Grade = 'Dasar' | 'Menengah' | 'Atas'
export type TopicsByGrade = Record<Grade, string[]>

export async function getTopics(): Promise<{ topics: string[]; topics_by_grade: TopicsByGrade }> {
  const res = await api.get<{ topics: string[]; topics_by_grade: TopicsByGrade }>('/api/quiz/topics')
  return res.data
}

export async function createSession(data: {
  topic: string
  total_questions: number
  use_ai: boolean
  include_images: boolean
  difficulty_level?: string
  client: string
}): Promise<CreateSessionResponse> {
  const res = await api.post<CreateSessionResponse>('/api/quiz/sessions', data)
  return res.data
}

export async function submitAnswer(data: {
  question_id: number
  session_id: number
  user_answer: string
  time_seconds?: number
}): Promise<SubmitAnswerResponse> {
  const res = await api.post<SubmitAnswerResponse>('/api/quiz/submit-answer', data)
  return res.data
}

export async function getSession(sessionId: number): Promise<Session> {
  const res = await api.get<Session>(`/api/quiz/sessions/${sessionId}`)
  return res.data
}

export async function getUserStats(): Promise<UserStats> {
  const res = await api.get<UserStats>('/api/quiz/stats')
  return res.data
}

// ─── Admin endpoints ──────────────────────────────────────────────────────────

export interface UserAnalytics {
  id: number
  user_id: number | null
  ip_address: string | null
  user_agent: string | null
  os: string | null
  device: string | null
  browser: string | null
  location: string | null
  country: string | null
  city: string | null
  latitude: string | null
  longitude: string | null
  referrer: string | null
  source: string | null
  endpoint: string | null
  method: string | null
  status_code: number | null
  response_time_ms: number | null
  created_at: string
}

export interface AnalyticsSummary {
  total_requests: number
  unique_ips: number
  unique_users: number
  top_endpoints: Array<{ name: string; count: number }>
  top_devices: Array<{ name: string; count: number }>
  top_os: Array<{ name: string; count: number }>
  top_browsers: Array<{ name: string; count: number }>
  top_sources: Array<{ name: string; count: number }>
  top_countries: Array<{ name: string; count: number }>
  top_cities: Array<{ name: string; count: number }>
  avg_response_time: number
  status_codes: Record<string, number>
}

export async function adminGetUsers(): Promise<User[]> {
  const res = await api.get<User[]>('/api/admin/users')
  return res.data
}

export async function adminUpdateUser(
  userId: number,
  data: { is_active?: boolean; is_admin?: boolean; ai_access?: boolean }
): Promise<User> {
  const res = await api.patch<User>(`/api/admin/users/${userId}`, data)
  return res.data
}

export async function adminDeleteUser(userId: number): Promise<void> {
  await api.delete(`/api/admin/users/${userId}`)
}

export async function adminGetAnalyticsSummary(): Promise<AnalyticsSummary> {
  const res = await api.get<AnalyticsSummary>('/api/admin/analytics/summary')
  return res.data
}

export async function adminGetAnalytics(
  skip?: number,
  limit?: number,
  user_id?: number,
  ip_address?: string
): Promise<UserAnalytics[]> {
  const params = new URLSearchParams()
  if (skip !== undefined) params.append('skip', String(skip))
  if (limit !== undefined) params.append('limit', String(limit))
  if (user_id !== undefined) params.append('user_id', String(user_id))
  if (ip_address !== undefined) params.append('ip_address', ip_address)
  
  const res = await api.get<UserAnalytics[]>(`/api/admin/analytics?${params.toString()}`)
  return res.data
}

export async function adminGetUserAnalytics(userId: number): Promise<UserAnalytics[]> {
  const res = await api.get<UserAnalytics[]>(`/api/admin/analytics/user/${userId}`)
  return res.data
}

export interface QuestionBankItem {
  id: number
  topic: string
  difficulty: Difficulty
  question_text: string
  choices: string[]
  correct_answer: string
  explanation: string | null
  image_url: string | null
  is_active: boolean
  created_at: string
}

export async function adminGetQuestions(): Promise<QuestionBankItem[]> {
  const res = await api.get<QuestionBankItem[]>('/api/admin/questions')
  return res.data
}

export async function adminDeleteQuestion(questionId: number): Promise<void> {
  await api.delete(`/api/admin/questions/${questionId}`)
}

export default api
