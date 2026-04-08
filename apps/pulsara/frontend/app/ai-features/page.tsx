'use client'

import { useState } from 'react'
import { Sparkles, Brain, Hash, Clock, BarChart3, Lightbulb, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface AIDemo {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  example: {
    input: string
    output: string
  }
}

export default function AIFeatures() {
  const [activeDemo, setActiveDemo] = useState<string>('generate')

  const aiDemos: AIDemo[] = [
    {
      id: 'generate',
      title: 'Content Generation',
      description: 'Generate engaging posts from simple prompts with customizable tone and style',
      icon: <Sparkles className="w-6 h-6" />,
      example: {
        input: 'Write about the benefits of morning exercise',
        output: 'Starting your day with exercise is like giving yourself a superpower! 💪 Not only does it boost your energy levels, but it also improves your mood and sets a positive tone for the entire day. Plus, you\'ll feel accomplished before most people even have their first cup of coffee! ☀️ #MorningWorkout #HealthyLiving #FitnessMotivation'
      }
    },
    {
      id: 'optimize',
      title: 'Content Optimization',
      description: 'Improve existing content for better engagement and reach',
      icon: <BarChart3 className="w-6 h-6" />,
      example: {
        input: 'Just finished my workout',
        output: 'Original: "Just finished my workout"\n\nOptimized: "Just crushed another morning workout! 💪 There\'s something magical about starting the day by investing in yourself. What\'s your favorite way to get moving? #MorningMotivation #FitnessJourney"\n\nImprovements:\n• Added emotional language ("crushed", "magical")\n• Included a question to encourage engagement\n• Added relevant hashtags\n• Created a more conversational tone'
      }
    },
    {
      id: 'hashtags',
      title: 'Hashtag Generation',
      description: 'Automatically generate relevant hashtags for better discoverability',
      icon: <Hash className="w-6 h-6" />,
      example: {
        input: 'Sharing my homemade pasta recipe that my grandmother taught me',
        output: '#HomemadePasta #FamilyRecipes #ItalianCooking #GrandmasRecipe #CookingFromScratch'
      }
    },
    {
      id: 'timing',
      title: 'Optimal Timing',
      description: 'AI-powered timing suggestions for maximum audience reach',
      icon: <Clock className="w-6 h-6" />,
      example: {
        input: 'Motivational fitness content for working professionals',
        output: 'Best posting times for your fitness content:\n\n1. **6:30 AM EST** - Catch early risers before their workout\n2. **12:30 PM EST** - Lunch break scrollers looking for motivation\n3. **7:00 PM EST** - Evening crowd planning tomorrow\'s workout\n\nYour motivational content will perform best when people are thinking about their fitness goals!'
      }
    },
    {
      id: 'sentiment',
      title: 'Sentiment Analysis',
      description: 'Analyze tone and mood of your content before posting',
      icon: <Lightbulb className="w-6 h-6" />,
      example: {
        input: 'I can\'t believe how difficult this project has been. Nothing seems to be working right.',
        output: '**Sentiment Analysis:**\n\n• **Overall Sentiment:** Negative\n• **Tone:** Frustrated, discouraged\n• **Emotional Impact:** 7/10 (high negative impact)\n• **Audience Reaction:** May evoke sympathy but could also bring down mood\n\n**Suggestions:**\n• Consider reframing challenges as learning opportunities\n• Add a positive outlook or lesson learned\n• Include a call for support or advice to encourage engagement'
      }
    }
  ]

  const currentDemo = aiDemos.find(demo => demo.id === activeDemo) || aiDemos[0]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">AI-Powered Features</h1>
            <p className="text-xl text-gray-600 mb-8">
              Discover how AWS Bedrock enhances your content creation workflow
            </p>
            <Link href="/create" className="btn-primary flex items-center space-x-2 mx-auto w-fit">
              <span>Try AI Features</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Feature Tabs */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="border-b border-gray-200">
              <div className="flex overflow-x-auto">
                {aiDemos.map((demo) => (
                  <button
                    key={demo.id}
                    onClick={() => setActiveDemo(demo.id)}
                    className={`flex items-center space-x-3 px-6 py-4 whitespace-nowrap border-b-2 transition-colors ${
                      activeDemo === demo.id
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {demo.icon}
                    <span className="font-medium">{demo.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Demo Content */}
            <div className="p-8">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Description */}
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{currentDemo.title}</h3>
                  <p className="text-gray-600 mb-6 text-lg">{currentDemo.description}</p>
                  
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2">How it works:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-gray-600">
                      <li>Enter your content or prompt</li>
                      <li>AI analyzes and processes your input</li>
                      <li>Receive optimized suggestions instantly</li>
                      <li>Apply changes with one click</li>
                    </ol>
                  </div>

                  <Link href="/create" className="btn-primary">
                    Try {currentDemo.title}
                  </Link>
                </div>

                {/* Example */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Example</h4>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-100 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Input:</h5>
                      <p className="text-gray-900">{currentDemo.example.input}</p>
                    </div>

                    <div className="flex justify-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <ArrowRight className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-blue-700 mb-2">AI Output:</h5>
                      <div className="text-blue-900 whitespace-pre-wrap">{currentDemo.example.output}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="mt-16 grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Save Time</h3>
              <p className="text-gray-600">Generate content in seconds instead of spending hours brainstorming</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Boost Engagement</h3>
              <p className="text-gray-600">AI-optimized content performs better and reaches more people</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Brain className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Learn & Improve</h3>
              <p className="text-gray-600">Get insights and suggestions to improve your content strategy</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}