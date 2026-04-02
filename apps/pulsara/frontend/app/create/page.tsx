'use client'

import { useState, useEffect, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Image, Calendar, Send, Sparkles, Hash, Clock, BarChart3, Lightbulb, AlertCircle, Brain, TrendingUp, User } from 'lucide-react'
import Link from 'next/link'

const postSchema = z.object({
  content: z.string().min(1, 'Content is required').max(500, 'Content must be less than 500 characters'),
  scheduledAt: z.string().optional(),
})

type PostForm = z.infer<typeof postSchema>

interface AIFeature {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  loading: boolean
}

function CreatePostInner() {
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [preview, setPreview] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [selectedTone, setSelectedTone] = useState('casual')

  // Personality & trending context passed from /analyze
  const [personalitySummary, setPersonalitySummary] = useState(searchParams.get('personality') || '')
  const [trendingTopics, setTrendingTopics] = useState<string[]>(
    searchParams.get('trending') ? searchParams.get('trending')!.split(',') : []
  )
  const [generatingPersonalized, setGeneratingPersonalized] = useState(false)
  const [aiFeatures, setAiFeatures] = useState<AIFeature[]>([
    { id: 'generate', name: 'Generate Content', icon: <Sparkles className="w-4 h-4" />, description: 'Create content from prompt', loading: false },
    { id: 'hashtags', name: 'Generate Hashtags', icon: <Hash className="w-4 h-4" />, description: 'Add relevant hashtags', loading: false },
    { id: 'optimize', name: 'Optimize Content', icon: <BarChart3 className="w-4 h-4" />, description: 'Improve engagement', loading: false },
    { id: 'timing', name: 'Suggest Timing', icon: <Clock className="w-4 h-4" />, description: 'Best posting times', loading: false },
    { id: 'sentiment', name: 'Analyze Sentiment', icon: <Lightbulb className="w-4 h-4" />, description: 'Check tone & mood', loading: false },
  ])
  const [aiResults, setAiResults] = useState<any>(null)
  const [bedrockStatus, setBedrockStatus] = useState<any>(null)

  useEffect(() => {
    // Check Bedrock configuration status
    const checkBedrockStatus = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/health/bedrock`)
        const status = await response.json()
        setBedrockStatus(status)
      } catch (error) {
        console.error('Failed to check Bedrock status:', error)
      }
    }
    
    checkBedrockStatus()
  }, [])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PostForm>({
    resolver: zodResolver(postSchema),
  })

  const content = watch('content', '')

  const updateFeatureLoading = (featureId: string, loading: boolean) => {
    setAiFeatures(prev => prev.map(f => f.id === featureId ? { ...f, loading } : f))
  }

  const handleAIFeature = async (featureId: string) => {
    updateFeatureLoading(featureId, true)
    
    try {
      let endpoint = ''
      let payload = {}

      switch (featureId) {
        case 'generate':
          if (!aiPrompt.trim()) {
            alert('Please enter a prompt for content generation')
            return
          }
          endpoint = '/api/ai/generate-content'
          payload = {
            prompt: aiPrompt,
            tone: selectedTone,
            maxLength: 500
          }
          break
        case 'hashtags':
          if (!content.trim()) {
            alert('Please enter some content first')
            return
          }
          endpoint = '/api/ai/generate-hashtags'
          payload = { content, maxHashtags: 5 }
          break
        case 'optimize':
          if (!content.trim()) {
            alert('Please enter some content first')
            return
          }
          endpoint = '/api/ai/optimize-content'
          payload = { content, targetAudience: 'general' }
          break
        case 'timing':
          if (!content.trim()) {
            alert('Please enter some content first')
            return
          }
          endpoint = '/api/ai/suggest-posting-time'
          payload = { content, targetAudience: 'general' }
          break
        case 'sentiment':
          if (!content.trim()) {
            alert('Please enter some content first')
            return
          }
          endpoint = '/api/ai/analyze-sentiment'
          payload = { content }
          break
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (response.ok && !result.error) {
        setAiResults({ type: featureId, data: result })
        
        // Auto-apply results for certain features
        if (featureId === 'generate' && result.content) {
          setValue('content', result.content)
        } else if (featureId === 'hashtags' && result.hashtags) {
          const currentContent = content
          const hashtags = result.hashtags.join(' ')
          setValue('content', `${currentContent}\n\n${hashtags}`.trim())
        }
      } else {
        // Handle both HTTP errors and application errors
        const errorMessage = result.detail || result.error || 'Failed to process request'
        alert(`Error: ${errorMessage}`)
        console.error('AI API Error:', result)
      }
    } catch (error) {
      console.error('AI feature error:', error)
      alert('Error processing AI request')
    } finally {
      updateFeatureLoading(featureId, false)
    }
  }

  const handleGeneratePersonalized = async () => {
    if (!aiPrompt.trim()) {
      alert('Please enter a prompt first')
      return
    }
    setGeneratingPersonalized(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai/generate-personalized`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          personality_summary: personalitySummary || null,
          trending_topics: trendingTopics.length ? trendingTopics : null,
          tone: selectedTone,
          maxLength: 500,
        }),
      })
      const result = await response.json()
      if (response.ok && result.content) {
        setValue('content', result.content)
        setAiResults({ type: 'personalized', data: result })
      } else {
        alert(`Error: ${result.detail || result.error || 'Failed to generate'}`)
      }
    } catch (e) {
      alert('Error generating personalized content')
    } finally {
      setGeneratingPersonalized(false)
    }
  }

  const onSubmit = async (data: PostForm) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        alert('Post created successfully!')
        // Reset form or redirect
      } else {
        alert('Failed to create post')
      }
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Error creating post')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-8">
            <Link href="/" className="mr-4">
              <ArrowLeft className="w-6 h-6 text-gray-600 hover:text-gray-800" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Create Threads Post</h1>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content Creation */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div>
                    <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                      Post Content
                    </label>
                    <textarea
                      {...register('content')}
                      id="content"
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="What's on your mind?"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-gray-500">
                        {content.length}/500 characters
                      </span>
                      {errors.content && (
                        <span className="text-sm text-red-500">{errors.content.message}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      type="button"
                      className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <Image className="w-4 h-4" />
                      <span>Add Image</span>
                    </button>
                    
                    <button
                      type="button"
                      className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Schedule</span>
                    </button>
                  </div>

                  <div>
                    <label htmlFor="scheduledAt" className="block text-sm font-medium text-gray-700 mb-2">
                      Schedule for later (optional)
                    </label>
                    <input
                      {...register('scheduledAt')}
                      type="datetime-local"
                      id="scheduledAt"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {preview && content && (
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
                      <div className="bg-white rounded-lg p-4 border">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">Your Account</div>
                            <div className="mt-1 text-gray-900 whitespace-pre-wrap">{content}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => setPreview(!preview)}
                      className="btn-secondary"
                    >
                      {preview ? 'Hide Preview' : 'Show Preview'}
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary flex items-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSubmitting ? 'Creating...' : 'Create Post'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* AI Assistant Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-blue-500" />
                  AI Assistant
                </h3>

                {/* Bedrock Status Indicator */}
                {bedrockStatus && (
                  <div className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${
                    bedrockStatus.bedrock_configured 
                      ? 'bg-green-50 text-green-800' 
                      : 'bg-yellow-50 text-yellow-800'
                  }`}>
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">
                      {bedrockStatus.bedrock_configured 
                        ? 'AWS Bedrock is configured and ready' 
                        : 'AWS Bedrock not configured - AI features unavailable'}
                    </span>
                  </div>
                )}

                {/* Personality & Trending Context (from /analyze) */}
                {(personalitySummary || trendingTopics.length > 0) && (
                  <div className="mb-4 p-3 bg-purple-50 rounded-lg space-y-2">
                    <p className="text-xs font-medium text-purple-800 flex items-center space-x-1">
                      <Brain className="w-3 h-3" />
                      <span>Personalization Active</span>
                    </p>
                    {personalitySummary && (
                      <div className="flex items-start space-x-1">
                        <User className="w-3 h-3 text-purple-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-purple-700 line-clamp-2">{personalitySummary}</p>
                      </div>
                    )}
                    {trendingTopics.length > 0 && (
                      <div className="flex items-start space-x-1">
                        <TrendingUp className="w-3 h-3 text-purple-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-purple-700">{trendingTopics.join(', ')}</p>
                      </div>
                    )}
                    <button
                      onClick={() => { setPersonalitySummary(''); setTrendingTopics([]) }}
                      className="text-xs text-purple-500 hover:text-purple-700"
                    >
                      Clear context
                    </button>
                  </div>
                )}

                {/* Content Generation */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Generate Content
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={4}
                    placeholder="Describe what you want to post about..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                  />
                  <span className="text-xs text-gray-500">{aiPrompt.length}/500 characters</span>
                  <select
                    value={selectedTone}
                    onChange={(e) => setSelectedTone(e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="casual">Casual</option>
                    <option value="professional">Professional</option>
                    <option value="humorous">Humorous</option>
                    <option value="inspirational">Inspirational</option>
                    <option value="educational">Educational</option>
                  </select>
                </div>

                {/* Generate with My Style button */}
                <button
                  onClick={handleGeneratePersonalized}
                  disabled={generatingPersonalized}
                  className="w-full mb-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center space-x-2 text-sm font-medium"
                >
                  {generatingPersonalized ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <Brain className="w-4 h-4" />
                  )}
                  <span>{generatingPersonalized ? 'Generating...' : 'Generate with My Style'}</span>
                </button>

                <div className="border-t border-gray-100 pt-4 mb-4">
                  <Link href="/analyze" className="text-xs text-purple-600 hover:text-purple-800 flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>Go to Threads Analyzer to load your profile & trends</span>
                  </Link>
                </div>

                {/* AI Features */}
                <div className="space-y-2">
                  {aiFeatures.map((feature) => (
                    <button
                      key={feature.id}
                      onClick={() => handleAIFeature(feature.id)}
                      disabled={feature.loading}
                      className="w-full flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {feature.loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      ) : (
                        feature.icon
                      )}
                      <div className="text-left">
                        <div className="text-sm font-medium text-gray-900">{feature.name}</div>
                        <div className="text-xs text-gray-500">{feature.description}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* AI Results */}
                {aiResults && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">AI Result</h4>
                    <div className="text-sm text-blue-800">
                      {aiResults.type === 'generate' && aiResults.data.content && (
                        <div>
                          <p className="mb-2">Generated content:</p>
                          <p className="italic">"{aiResults.data.content}"</p>
                        </div>
                      )}
                      {aiResults.type === 'hashtags' && aiResults.data.hashtags && (
                        <div>
                          <p className="mb-2">Suggested hashtags:</p>
                          <p>{aiResults.data.hashtags.join(' ')}</p>
                        </div>
                      )}
                      {aiResults.type === 'optimize' && aiResults.data.optimization_result && (
                        <div>
                          <p className="mb-2">Optimization suggestions:</p>
                          <p className="whitespace-pre-wrap">{aiResults.data.optimization_result}</p>
                        </div>
                      )}
                      {aiResults.type === 'timing' && aiResults.data.suggestions && (
                        <div>
                          <p className="mb-2">Posting time suggestions:</p>
                          <p className="whitespace-pre-wrap">{aiResults.data.suggestions}</p>
                        </div>
                      )}
                      {aiResults.type === 'sentiment' && aiResults.data.analysis && (
                        <div>
                          <p className="mb-2">Sentiment analysis:</p>
                          <p className="whitespace-pre-wrap">{aiResults.data.analysis}</p>
                        </div>
                      )}
                      {aiResults.type === 'personalized' && aiResults.data.content && (
                        <div>
                          <p className="mb-1 font-medium">Generated in your style:</p>
                          {aiResults.data.used_personality && (
                            <span className="inline-flex items-center space-x-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full mr-1 mb-2">
                              <User className="w-3 h-3" /><span>Personality</span>
                            </span>
                          )}
                          {aiResults.data.used_trending && (
                            <span className="inline-flex items-center space-x-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mb-2">
                              <TrendingUp className="w-3 h-3" /><span>Trending</span>
                            </span>
                          )}
                          <p className="italic mt-1">"{aiResults.data.content}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CreatePost() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>}>
      <CreatePostInner />
    </Suspense>
  )
}