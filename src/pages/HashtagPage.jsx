import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/services/supabase'
import { ArrowLeft, Hash, TrendingUp, Users, Calendar } from 'lucide-react'
import HashtagParser from '@/components/HashtagParser'

export default function HashtagPage() {
  const { hashtag } = useParams()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [hashtagInfo, setHashtagInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    getCurrentUser()
    loadHashtagData()
  }, [hashtag])

  const getCurrentUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: userData } = await supabase
          .from('User')
          .select('userid, nombre, apellido, avatar_url')
          .eq('userid', authUser.id)
          .single()
        
        setUser(userData ? { ...authUser, ...userData } : authUser)
      }
    } catch (error) {
      console.error('Error getting user:', error)
    }
  }

  const loadHashtagData = async () => {
    if (!hashtag) return
    
    setLoading(true)
    try {
      // Obtener información del hashtag
      const { data: hashtagData } = await supabase
        .from('hashtags')
        .select('*')
        .eq('name', hashtag)
        .single()

      setHashtagInfo(hashtagData)

      // Obtener posts con este hashtag
      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          User!posts_user_fk(nombre, apellido, avatar_url),
          post_hashtags(
            hashtag_id,
            hashtags(name)
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      // Filtrar posts que contengan el hashtag en el contenido o en post_hashtags
      const filteredPosts = (postsData || []).filter(post => {
        // Verificar si el hashtag está en el contenido
        const contentHasHashtag = post.content && post.content.toLowerCase().includes(`#${hashtag.toLowerCase()}`)
        
        // Verificar si está en post_hashtags
        const hasHashtagRelation = post.post_hashtags && post.post_hashtags.some(ph => 
          ph.hashtags && ph.hashtags.name.toLowerCase() === hashtag.toLowerCase()
        )
        
        return contentHasHashtag || hasHashtagRelation
      })

      // Si faltan perfiles, resolverlos por userid
      const missingUserIds = filteredPosts
        .filter(p => !p.User)
        .map(p => p.user_id)
        .filter(Boolean)
        .filter((id, i, arr) => arr.indexOf(id) === i)

      let userMap = {}
      if (missingUserIds.length > 0) {
        const { data: usersRows } = await supabase
          .from('User')
          .select('userid, nombre, apellido, avatar_url')
          .in('userid', missingUserIds)
        for (const u of usersRows || []) {
          userMap[u.userid] = u
        }
      }

      const withUsers = filteredPosts.map(p => (
        p.User ? p : { ...p, User: userMap[p.user_id] || null }
      ))

      setPosts(withUsers)
    } catch (error) {
      console.error('Error loading hashtag data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const LoadingSkeleton = () => (
    <div className="min-h-screen bg-slate-950">
      <div className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <div className="h-6 w-28 bg-slate-800 rounded animate-pulse" />
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-blue-500/15 p-3 rounded-xl">
            <Hash className="w-6 h-6 text-blue-400" />
          </div>
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-40 bg-slate-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="h-4 w-24 bg-slate-800 rounded animate-pulse mb-2" />
              <div className="h-6 w-16 bg-slate-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-slate-800 animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 w-40 bg-slate-800 rounded animate-pulse mb-2" />
                  <div className="h-3 w-28 bg-slate-800 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-4 w-3/4 bg-slate-800 rounded animate-pulse mb-2" />
              <div className="h-4 w-1/2 bg-slate-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      </div>
    )

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Back bar lo maneja Layout (compact), aquí no renderizamos barra superior */}

      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/30">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-500/15 p-3 rounded-xl">
              <Hash className="w-6 h-6 text-blue-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-white truncate">#{hashtag}</h2>
              <p className="text-slate-400 text-sm mt-1">
                {hashtagInfo?.usage_count || 0} publicaciones • {new Set(posts.map(p => p.user_id)).size} usuarios
                </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800">
                <div className="flex items-center gap-2 text-slate-300">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Popularidad</span>
                </div>
                <div className="text-2xl font-bold text-white mt-1">
                {hashtagInfo?.usage_count || 0}
              </div>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800">
                <div className="flex items-center gap-2 text-slate-300">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Usuarios activos</span>
                </div>
                <div className="text-2xl font-bold text-white mt-1">
                  {new Set(posts.map(p => p.user_id)).size}
                </div>
              </div>
            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800">
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Creado</span>
                </div>
                <div className="text-sm text-white mt-1">
                {hashtagInfo?.created_at ? formatDate(hashtagInfo.created_at) : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <LoadingSkeleton />
        ) : posts.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl">
            <Hash className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No hay publicaciones</h3>
            <p className="text-slate-400 text-sm">Aún no hay publicaciones con este hashtag.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <article key={post.id} className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800">
                <header className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center ring-1 ring-slate-700">
                    {post.User?.avatar_url ? (
                      <img src={post.User.avatar_url} alt={post.User?.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-lg">
                        {post.User?.nombre?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white truncate">
                      {post.User?.nombre} {post.User?.apellido}
                    </h4>
                    <p className="text-xs text-slate-400">{formatDate(post.created_at)}</p>
                  </div>
                </header>
                {post.content && (
                  <div className="mb-3">
                    <HashtagParser text={post.content} className="text-white leading-relaxed" />
                  </div>
                )}
                {post.image_url && (
                  <div className="mb-3">
                    <img src={post.image_url} alt="Post content" className="w-full rounded-xl object-cover max-h-96 border border-slate-800" />
                  </div>
                )}
                {post.location && (
                  <div className="text-xs text-slate-400">📍 {post.location}</div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
