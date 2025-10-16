import React, { useState, useEffect } from 'react'
import { supabase } from '@/services/supabase'
import { 
  Heart, 
  MessageCircle, 
  Share, 
  MoreHorizontal, 
  Plus, 
  Camera,
  Users,
  Bell,
  Search,
  Send,
  Image as ImageIcon,
  Video,
  MapPin,
  Globe,
  Lock
} from 'lucide-react'

export default function SocialPage() {
  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('feed')
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostLocation, setNewPostLocation] = useState('')
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)

  useEffect(() => {
    getCurrentUser()
    loadPosts()
    loadStories()
  }, [])

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error('Error getting user:', error)
    }
  }

  const loadPosts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/social/posts', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })
      const data = await response.json()
      setPosts(data.posts || [])
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStories = async () => {
    try {
      const response = await fetch('/api/social/stories', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })
      const data = await response.json()
      setStories(data.stories || [])
    } catch (error) {
      console.error('Error loading stories:', error)
    }
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setFilePreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  const createPost = async () => {
    try {
      const formData = new FormData()
      formData.append('content', newPostContent)
      formData.append('location', newPostLocation)
      formData.append('is_public', 'true')
      
      if (selectedFile) {
        formData.append('file', selectedFile)
      }

      const response = await fetch('/api/social/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: formData
      })

      if (response.ok) {
        setNewPostContent('')
        setNewPostLocation('')
        setSelectedFile(null)
        setFilePreview(null)
        setShowCreatePost(false)
        loadPosts()
      }
    } catch (error) {
      console.error('Error creating post:', error)
    }
  }

  const likePost = async (postId) => {
    try {
      const response = await fetch(`/api/social/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })
      
      if (response.ok) {
        loadPosts()
      }
    } catch (error) {
      console.error('Error liking post:', error)
    }
  }

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)
    
    if (diffInSeconds < 60) return 'hace un momento'
    if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)}m`
    if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)}h`
    if (diffInSeconds < 2592000) return `hace ${Math.floor(diffInSeconds / 86400)}d`
    return date.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-40 glass-nav border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-white">Social</h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('feed')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    activeTab === 'feed' 
                      ? 'bg-blue-500 text-white' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Feed
                </button>
                <button
                  onClick={() => setActiveTab('stories')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    activeTab === 'stories' 
                      ? 'bg-blue-500 text-white' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Stories
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-full bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 transition-colors">
                <Search className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-full bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowCreatePost(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Crear
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'feed' && (
          <div className="space-y-6">
            {/* Stories Bar */}
            {stories.length > 0 && (
              <div className="glass-card p-4">
                <div className="flex items-center gap-4 overflow-x-auto pb-2">
                  <div className="flex-shrink-0 text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg mb-1">
                      {user?.user_metadata?.full_name?.charAt(0) || 'U'}
                    </div>
                    <p className="text-xs text-slate-400">Tu historia</p>
                  </div>
                  {stories.map((story) => (
                    <div key={story.id} className="flex-shrink-0 text-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg mb-1">
                        {story.author.nombre.charAt(0)}
                      </div>
                      <p className="text-xs text-slate-400 truncate w-16">
                        {story.author.nombre}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Posts */}
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="glass-card p-6 animate-pulse">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-slate-700"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-slate-700 rounded w-32 mb-2"></div>
                        <div className="h-3 bg-slate-700 rounded w-24"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-700 rounded w-full"></div>
                      <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post.id} className="glass-card p-6">
                    {/* Post Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {post.author.nombre.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {post.author.nombre} {post.author.apellido}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <span>{formatTimeAgo(post.created_at)}</span>
                            {post.location && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  <span>{post.location}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <button className="p-2 rounded-full hover:bg-slate-700/50 transition-colors">
                        <MoreHorizontal className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>

                    {/* Post Content */}
                    {post.content && (
                      <p className="text-white mb-4 whitespace-pre-wrap">{post.content}</p>
                    )}

                    {/* Post Media */}
                    {post.image_url && (
                      <div className="mb-4">
                        <img
                          src={post.image_url}
                          alt="Post content"
                          className="w-full rounded-lg"
                        />
                      </div>
                    )}

                    {post.video_url && (
                      <div className="mb-4">
                        <video
                          src={post.video_url}
                          controls
                          className="w-full rounded-lg"
                        />
                      </div>
                    )}

                    {/* Post Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                      <div className="flex items-center gap-6">
                        <button
                          onClick={() => likePost(post.id)}
                          className={`flex items-center gap-2 transition-colors ${
                            post.is_liked 
                              ? 'text-red-500' 
                              : 'text-slate-400 hover:text-red-500'
                          }`}
                        >
                          <Heart className={`w-5 h-5 ${post.is_liked ? 'fill-current' : ''}`} />
                          <span>{post.likes_count}</span>
                        </button>
                        <button className="flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-colors">
                          <MessageCircle className="w-5 h-5" />
                          <span>{post.comments_count}</span>
                        </button>
                        <button className="flex items-center gap-2 text-slate-400 hover:text-green-500 transition-colors">
                          <Share className="w-5 h-5" />
                          <span>Compartir</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stories' && (
          <div className="glass-card p-6 text-center">
            <Camera className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Stories</h3>
            <p className="text-slate-400 mb-6">
              Comparte momentos que duran 24 horas
            </p>
            <button className="px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors">
              Crear Story
            </button>
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Crear Post</h3>
              <button
                onClick={() => setShowCreatePost(false)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="¿Qué estás pensando?"
                className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 resize-none"
                rows={4}
              />

              <input
                type="text"
                value={newPostLocation}
                onChange={(e) => setNewPostLocation(e.target.value)}
                placeholder="Ubicación (opcional)"
                className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400"
              />

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-slate-400 hover:text-white cursor-pointer">
                  <ImageIcon className="w-5 h-5" />
                  <span>Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
                <label className="flex items-center gap-2 text-slate-400 hover:text-white cursor-pointer">
                  <Video className="w-5 h-5" />
                  <span>Video</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>

              {filePreview && (
                <div className="relative">
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="w-full rounded-lg"
                  />
                  <button
                    onClick={() => {
                      setSelectedFile(null)
                      setFilePreview(null)
                    }}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <Globe className="w-4 h-4" />
                  <span className="text-sm">Público</span>
                </div>
                <button
                  onClick={createPost}
                  disabled={!newPostContent.trim()}
                  className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Publicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
