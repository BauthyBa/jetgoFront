import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFriends, removeFriend } from '@/services/friends'
import { Users, User } from 'lucide-react'

export default function FriendsList({ userId, currentUserId }) {
  const navigate = useNavigate()
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) return
    loadFriends()
  }, [userId])

  const loadFriends = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await getFriends(userId)
      if (response.ok) {
        setFriends(response.friends || [])
      } else {
        setError(response.error || 'Error cargando amigos')
      }
    } catch (err) {
      console.error('Error cargando amigos:', err)
      setError('Error cargando amigos')
    } finally {
      setLoading(false)
    }
  }

  const [confirmState, setConfirmState] = useState({ open: false, friendId: null, friendName: '' })
  const requestRemove = (friendId, friendName) => {
    if (userId !== currentUserId) return
    setConfirmState({ open: true, friendId, friendName: friendName || 'este usuario' })
  }
  const confirmRemove = async () => {
    try {
      setLoading(true)
      const resp = await removeFriend(currentUserId, confirmState.friendId)
      if (resp?.ok) {
        setFriends((prev) => prev.filter((f) => f.id !== confirmState.friendId))
      }
    } catch (e) {
      console.error('Error eliminando amigo:', e)
    } finally {
      setLoading(false)
      setConfirmState({ open: false, friendId: null, friendName: '' })
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm">Cargando amigos...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card p-4">
        <div className="text-red-400 text-center text-sm">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (friends.length === 0) {
    return (
      <div className="glass-card p-4">
        <div className="text-center text-gray-400">
          <Users className="w-8 h-8 mx-auto mb-2 text-gray-500" />
          <p className="text-sm">No tiene amigos aún</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-blue-500" />
        <h4 className="font-medium text-white">Amigos ({friends.length})</h4>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {friends.map((friend) => (
          <div
            key={friend.id}
            className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg cursor-pointer"
            onClick={() => navigate(`/profile/${friend.id}`)}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium">
              {friend.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {friend.full_name || 'Usuario'}
              </p>
              <p className="text-xs text-gray-400">
                Amigos desde {new Date(friend.friendship_date).toLocaleDateString()}
              </p>
            </div>
            {friend.id === currentUserId && (
              <div className="text-xs text-blue-400 font-medium">
                Tú
              </div>
            )}
            {userId === currentUserId && friend.id !== currentUserId && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); requestRemove(friend.id, friend.full_name) }}
                className="text-xs px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white"
              >
                Eliminar
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
    {/* Confirm modal (embedded usage) */}
    {confirmState.open && (
      <div className="fixed inset-0 z-[160] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmState({ open: false, friendId: null, friendName: '' })} />
        <div className="relative z-[170] w-[92vw] max-w-sm rounded-2xl border border-slate-700 bg-slate-900/95 shadow-2xl p-5">
          <h3 className="text-white text-base font-semibold mb-1">Eliminar amigo</h3>
          <p className="text-slate-300 text-sm mb-4">
            ¿Seguro que querés eliminar a <span className="text-white font-semibold">{confirmState.friendName}</span> de tus amigos?
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg text-sm bg-slate-700 hover:bg-slate-600 text-white transition"
              onClick={() => setConfirmState({ open: false, friendId: null, friendName: '' })}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg text-sm bg-red-600 hover:bg-red-700 text-white transition"
              onClick={confirmRemove}
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    )}
  )
}
