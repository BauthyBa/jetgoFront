import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Hash, TrendingUp } from 'lucide-react'
import { getTrendingHashtags, extractHashtags } from '@/services/hashtags'
import { supabase } from '@/services/supabase'

export default function TrendingHashtags() {
  const [hashtags, setHashtags] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTrendingHashtags()
  }, [])

  const loadTrendingHashtags = async () => {
    try {
      // 1) Intentar con la tabla hashtags (si existe y tiene datos)
      const data = await getTrendingHashtags(5)
      if (Array.isArray(data) && data.length > 0) {
        setHashtags(data)
        return
      }

      // 2) Fallback real: calcular tendencias desde posts recientes públicos
      const { data: recentPosts, error } = await supabase
        .from('posts')
        .select('id, content, created_at, is_public')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error

      const usageByTag = {}
      for (const p of recentPosts || []) {
        const tags = extractHashtags(p?.content || '')
        for (const raw of tags) {
          const name = raw.replace('#', '').toLowerCase()
          usageByTag[name] = (usageByTag[name] || 0) + 1
        }
      }

      const top = Object.entries(usageByTag)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, usage_count]) => ({ id: name, name, usage_count }))

      setHashtags(top)
    } catch (error) {
      console.error('Error loading trending hashtags:', error)
      setHashtags([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white">Tendencias</h3>
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (hashtags.length === 0) {
    return null
  }

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-5 h-5 text-blue-400" />
        <h3 className="font-semibold text-white">Tendencias</h3>
      </div>
      
      <div className="space-y-2">
        {hashtags.map((hashtag, index) => (
          <Link
            key={hashtag.id}
            to={`/hashtag/${hashtag.name}`}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/50 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm font-bold">
                #{index + 1}
              </span>
              <div className="flex items-center gap-1">
                <Hash className="w-3 h-3 text-blue-400" />
                <span className="text-white font-medium">
                  {hashtag.name}
                </span>
              </div>
            </div>
            <span className="text-slate-400 text-xs">
              {hashtag.usage_count} posts
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
