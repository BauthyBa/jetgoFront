import { Heart, MessageCircle, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function SharedPostPreview({ sharedPostData }) {
  const navigate = useNavigate()

  const handleClick = () => {
    // Navegar a la página social con el post específico
    navigate(`/social?post=${sharedPostData.post_id}`)
  }

  return (
    <div 
      onClick={handleClick}
      className="w-full max-w-md bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 rounded-xl overflow-hidden cursor-pointer hover:border-blue-500 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02]"
    >
      {/* Header del post compartido */}
      <div className="p-4 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ring-2 ring-blue-500/30">
            {sharedPostData.author?.avatar_url ? (
              <img 
                src={sharedPostData.author.avatar_url} 
                alt={`${sharedPostData.author.nombre} ${sharedPostData.author.apellido}`}
                className="w-10 h-10 object-cover"
              />
            ) : (
              <span className="text-white text-base font-bold">
                {sharedPostData.author?.nombre?.charAt(0) || 'U'}
              </span>
            )}
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-base">
              {sharedPostData.author?.nombre} {sharedPostData.author?.apellido}
            </p>
            <p className="text-blue-400 text-xs font-medium">📱 Post compartido</p>
          </div>
        </div>
      </div>

      {/* Contenido del post */}
      {sharedPostData.content && (
        <div className="p-4 bg-slate-900/30">
          <p className="text-slate-200 text-sm leading-relaxed line-clamp-3">
            {sharedPostData.content}
          </p>
        </div>
      )}

      {/* Media (imagen o video) */}
      {sharedPostData.media?.image_url && (
        <div className="relative w-full aspect-video bg-slate-900">
          <img 
            src={sharedPostData.media.image_url} 
            alt="Post preview"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      {sharedPostData.media?.video_url && (
        <div className="relative w-full aspect-video bg-slate-900">
          <video 
            src={sharedPostData.media.video_url}
            className="w-full h-full object-cover"
            controls={false}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
              <div className="w-0 h-0 border-l-8 border-l-slate-800 border-y-6 border-y-transparent ml-1" />
            </div>
          </div>
        </div>
      )}

      {/* Footer con stats */}
      <div className="p-4 bg-gradient-to-r from-slate-800/90 to-slate-900/90 flex items-center gap-6 text-sm border-t border-slate-700/50">
        <div className="flex items-center gap-2 text-red-400">
          <Heart className="w-4 h-4 fill-current" />
          <span className="font-medium">{sharedPostData.likes_count || 0}</span>
        </div>
        <div className="flex items-center gap-2 text-blue-400">
          <MessageCircle className="w-4 h-4" />
          <span className="font-medium">{sharedPostData.comments_count || 0}</span>
        </div>
        <div className="flex items-center gap-2 ml-auto text-emerald-400 font-semibold">
          <Eye className="w-5 h-5" />
          <span>Ver post completo</span>
        </div>
      </div>
    </div>
  )
}

