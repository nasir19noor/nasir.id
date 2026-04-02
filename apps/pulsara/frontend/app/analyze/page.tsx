'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Brain, TrendingUp, Sparkles, RefreshCw,
  User, AlertCircle, CheckCircle, ChevronRight, Globe
} from 'lucide-react'

interface PersonalityProfile {
  tone: string
  writing_style: string
  common_topics: string[]
  personality_summary: string
  analyzed_posts_count: number
}

interface TrendingTopic {
  topic: string
  hashtags: string[]
  why_trending: string
}

export default function AnalyzePage() {
  const [personality, setPersonality] = useState<PersonalityProfile | null>(null)
  const [analyzingPersonality, setAnalyzingPersonality] = useState(false)
  const [personalityError, setPersonalityError] = useState('')

  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([])
  const [loadingTrends, setLoadingTrends] = useState(false)
  const [trendCategory, setTrendCategory] = useState('')
  const [trendRegion, setTrendRegion] = useState('')
  const [trendsError, setTrendsError] = useState('')

  const [selectedTopics, setSelectedTopics] = useState<string[]>([])

  const analyzePersonality = async () => {
    setAnalyzingPersonality(true)
    setPersonalityError('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai/analyze-personality`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to analyze personality')
      setPersonality(data.personality)
    } catch (err: any) {
      setPersonalityError(err.message)
    } finally {
      setAnalyzingPersonality(false)
    }
  }

  const fetchTrending = async () => {
    setLoadingTrends(true)
    setTrendsError('')
    try {
      const qs = new URLSearchParams()
      if (trendCategory) qs.set('category', trendCategory)
      if (trendRegion) qs.set('region', trendRegion)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai/trending-topics?${qs.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to fetch trends')
      setTrendingTopics(data.topics || [])
      setSelectedTopics([])
    } catch (err: any) {
      setTrendsError(err.message)
    } finally {
      setLoadingTrends(false)
    }
  }

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    )
  }

  const buildCreateLink = () => {
    const params = new URLSearchParams()
    if (personality) params.set('personality', personality.personality_summary)
    if (selectedTopics.length) params.set('trending', selectedTopics.join(','))
    return `/create?${params.toString()}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center mb-8">
          <Link href="/" className="mr-4">
            <ArrowLeft className="w-6 h-6 text-gray-600 hover:text-gray-800" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Threads Analyzer</h1>
            <p className="text-sm text-gray-500">Understand your voice & what's trending</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* ── Personality Analyzer ── */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Your Writing Profile</h2>
                <p className="text-xs text-gray-500">Analyzes your last 25 Threads posts</p>
              </div>
            </div>

            {!personality && !personalityError && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  Requires <code className="bg-blue-100 px-1 rounded">THREADS_ACCESS_TOKEN</code> in your backend
                  <code className="bg-blue-100 px-1 rounded ml-1">.env</code> file.
                  Get one from the{' '}
                  <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" className="underline">
                    Meta Developer Portal
                  </a>.
                </p>
              </div>
            )}

            {personalityError && (
              <div className="mb-4 p-3 bg-red-50 rounded-lg flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700">{personalityError}</p>
              </div>
            )}

            {personality ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-gray-500">Based on {personality.analyzed_posts_count} posts</span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700 w-24">Tone</span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm capitalize">
                    {personality.tone}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Writing Style</p>
                  <p className="text-sm text-gray-600">{personality.writing_style}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Common Topics</p>
                  <div className="flex flex-wrap gap-2">
                    {personality.common_topics.map(topic => (
                      <span key={topic} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Personality Summary</p>
                  <p className="text-sm text-gray-600 italic">"{personality.personality_summary}"</p>
                </div>

                <button
                  onClick={analyzePersonality}
                  disabled={analyzingPersonality}
                  className="text-xs text-purple-600 hover:text-purple-800 flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Re-analyze</span>
                </button>
              </div>
            ) : (
              <button
                onClick={analyzePersonality}
                disabled={analyzingPersonality}
                className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {analyzingPersonality ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    <span>Analyzing your posts...</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    <span>Analyze My Writing Style</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* ── Trending Topics ── */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Trending Now</h2>
                <p className="text-xs text-gray-500">
                  {trendingTopics.length > 0
                    ? `${trendRegion || 'Global'}${trendCategory ? ` · ${trendCategory}` : ''}`
                    : 'AI-curated topics for Threads'}
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <input
                type="text"
                value={trendCategory}
                onChange={e => setTrendCategory(e.target.value)}
                placeholder="Niche (e.g. tech, fitness, fashion)..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select
                    value={trendRegion}
                    onChange={e => setTrendRegion(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="">Global</option>
                    <optgroup label="Asia Pacific">
                      <option value="Indonesia">Indonesia</option>
                      <option value="Malaysia">Malaysia</option>
                      <option value="Singapore">Singapore</option>
                      <option value="Philippines">Philippines</option>
                      <option value="Thailand">Thailand</option>
                      <option value="Vietnam">Vietnam</option>
                      <option value="Japan">Japan</option>
                      <option value="South Korea">South Korea</option>
                      <option value="India">India</option>
                      <option value="Australia">Australia</option>
                    </optgroup>
                    <optgroup label="Americas">
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="Brazil">Brazil</option>
                      <option value="Mexico">Mexico</option>
                    </optgroup>
                    <optgroup label="Europe">
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Germany">Germany</option>
                      <option value="France">France</option>
                      <option value="Spain">Spain</option>
                      <option value="Italy">Italy</option>
                    </optgroup>
                    <optgroup label="Middle East & Africa">
                      <option value="Saudi Arabia">Saudi Arabia</option>
                      <option value="UAE">UAE</option>
                      <option value="Nigeria">Nigeria</option>
                      <option value="South Africa">South Africa</option>
                    </optgroup>
                  </select>
                </div>
                <button
                  onClick={fetchTrending}
                  disabled={loadingTrends}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-1 whitespace-nowrap"
                >
                  {loadingTrends ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {trendsError && (
              <div className="mb-3 p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-red-700">{trendsError}</p>
              </div>
            )}

            {trendingTopics.length === 0 && !loadingTrends && (
              <button
                onClick={fetchTrending}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-green-400 hover:text-green-600 transition-colors text-sm"
              >
                Load trending topics
              </button>
            )}

            {trendingTopics.length > 0 && (
              <>
                <p className="text-xs text-gray-500 mb-2">
                  Select topics to use when generating content:
                </p>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {trendingTopics.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => toggleTopic(t.topic)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedTopics.includes(t.topic)
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium text-gray-900">{t.topic}</p>
                        {selectedTopics.includes(t.topic) && (
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 ml-2" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{t.why_trending}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {t.hashtags.map(h => (
                          <span key={h} className="text-xs text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                            {h}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Generate CTA ── */}
        {(personality || selectedTopics.length > 0) && (
          <div className="mt-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Ready to create content</h3>
                <div className="flex items-center space-x-4 text-sm text-purple-100">
                  {personality && (
                    <span className="flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span>Personality profile loaded</span>
                    </span>
                  )}
                  {selectedTopics.length > 0 && (
                    <span className="flex items-center space-x-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>{selectedTopics.length} trend{selectedTopics.length > 1 ? 's' : ''} selected</span>
                    </span>
                  )}
                </div>
              </div>
              <Link
                href={buildCreateLink()}
                className="flex items-center space-x-2 bg-white text-purple-700 px-5 py-2.5 rounded-lg font-medium hover:bg-purple-50 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Content</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
