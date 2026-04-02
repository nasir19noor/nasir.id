'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Image, Calendar, Send, Sparkles, Hash, Clock, BarChart3, Lightbulb } from 'lucide-react'
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

export default function CreatePost() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [preview, setPreview] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [selectedTone, setSelectedTone] = useState('casual')
  const [aiFeatures, setAiFeatures] = useState<AIFeature[]>([
    { id: 'generate', name: 'Generate Content', icon: <Sparkles className="w-4 h-4" />, description: 'Create content from prompt', loading: false },
    { id: 'hashtags', name: 'Generate Hashtags', icon: <Hash className="w-4 h-4" />, description: 'Add relevant hashtags', loading: false },
    { id: 'optimize', name: 'Optimize Content', icon: <BarChart3 className="w-4 h-4" />, description: 'Improve engagement', loading: false },
    { id: 'timing', name: 'Suggest Timing', icon: <Clock className="w-4 h-4" />, description: 'Best posting times', loading: false },
    { id: 'sentiment', name: 'Analyze Sentiment', icon: <Lightbulb className="w-4 h-4" />, description: 'Check tone & mood', loading: false },
  ])
  const [aiResults, setAiResults] = useState<any>(null)

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

      if (response.ok) {
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
        alert(`Error: ${result.error || 'Failed to process request'}`)
      }
    } catch (error) {
      console.error('AI feature error:', error)
      alert('Error processing AI request')
    } finally {
      updateFeatureLoading(featureId, false)
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

                {/* Content Generation */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Generate Content
                  </label>
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Describe what you want to post about..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
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