import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/services/supabase'
import { ArrowLeft, Hash, TrendingUp, Users, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navbar simple */}
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold text-white">JetGo</h1>
            </div>
          </div>
        </div>
      </nav>

      {/* Header del hashtag */}
      <div className="bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-500/20 p-3 rounded-full">
              <Hash className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">#{hashtag}</h1>
              {hashtagInfo && (
                <p className="text-slate-400">
                  {hashtagInfo.usage_count || 0} publicaciones
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          {hashtagInfo && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-slate-300">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Popularidad</span>
                </div>
                <div className="text-2xl font-bold text-white mt-1">
                  {hashtagInfo.usage_count || 0}
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-slate-300">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Usuarios activos</span>
                </div>
                <div className="text-2xl font-bold text-white mt-1">
                  {new Set(posts.map(p => p.user_id)).size}
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Creado</span>
                </div>
                <div className="text-sm text-white mt-1">
                  {formatDate(hashtagInfo.created_at)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Posts */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <Hash className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No hay publicaciones
            </h3>
            <p className="text-slate-400">
              Aún no hay publicaciones con este hashtag.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post.id} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                {/* Header del post */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center">
                    {post.User?.avatar_url ? (
                      <img
                        src={post.User.avatar_url}
                        alt={post.User?.nombre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-lg">
                        {post.User?.nombre?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white">
                      {post.User?.nombre} {post.User?.apellido}
                    </h4>
                    <p className="text-sm text-slate-400">
                      {formatDate(post.created_at)}
                    </p>
                  </div>
                </div>

                {/* Contenido del post */}
                {post.content && (
                  <div className="mb-4">
                    <HashtagParser 
                      text={post.content} 
                      className="text-white leading-relaxed"
                    />
                  </div>
                )}

                {/* Imagen del post */}
                {post.image_url && (
                  <div className="mb-4">
                    <img
                      src={post.image_url}
                      alt="Post content"
                      className="w-full rounded-lg object-cover max-h-96"
                    />
                  </div>
                )}

                {/* Ubicación */}
                {post.location && (
                  <div className="text-sm text-slate-400 mb-4">
                    📍 {post.location}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
