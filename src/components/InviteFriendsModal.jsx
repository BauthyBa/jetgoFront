import { useState, useEffect } from 'react'
import { getFriends, inviteFriendToTrip } from '@/services/friends'
import { X, UserPlus, Users } from 'lucide-react'

export default function InviteFriendsModal({ isOpen, onClose, tripId, organizerId, tripTitle }) {
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviting, setInviting] = useState({})

  useEffect(() => {
    if (isOpen && organizerId) {
      loadFriends()
    }
  }, [isOpen, organizerId])

  const loadFriends = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await getFriends(organizerId)
      
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

  const handleInviteFriend = async (friendId, friendName) => {
    try {
      setInviting(prev => ({ ...prev, [friendId]: true }))
      
      const response = await inviteFriendToTrip(tripId, friendId, organizerId)
      
      if (response.ok) {
        alert(`¡${friendName} fue invitado exitosamente al viaje!`)
        onClose()
      } else {
        alert(response.error || 'Error invitando amigo')
      }
    } catch (error) {
      console.error('Error invitando amigo:', error)
      alert('Error invitando amigo al viaje')
    } finally {
      setInviting(prev => ({ ...prev, [friendId]: false }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="glass-card p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-white">Invitar Amigos</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-gray-400 mb-4">
          Invita a tus amigos al viaje "{tripTitle}"
        </p>

        {error ? (
          <div className="text-red-400 text-center mb-4">
            <p>{error}</p>
            <button
              onClick={loadFriends}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400 mt-2">Cargando amigos...</p>
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No tienes amigos para invitar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map((friend) => (
              <div key={friend.id} className="glass-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-medium">
                      {friend.full_name?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                    <div>
                      <h4 className="font-medium text-white">
                        {friend.full_name || 'Amigo'}
                      </h4>
                      <p className="text-sm text-gray-400">
                        Amigos desde {new Date(friend.friendship_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleInviteFriend(friend.id, friend.full_name)}
                    disabled={inviting[friend.id]}
                    className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                      inviting[friend.id]
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {inviting[friend.id] ? 'Enviando...' : 'Invitar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
