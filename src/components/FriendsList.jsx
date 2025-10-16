import { useState, useEffect } from 'react'
import { getFriends } from '@/services/friends'
import { Users, User } from 'lucide-react'

export default function FriendsList({ userId, currentUserId }) {
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
          <div key={friend.id} className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg">
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
          </div>
        ))}
      </div>
    </div>
  )
}
