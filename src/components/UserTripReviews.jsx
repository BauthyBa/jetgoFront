import { useState, useEffect } from 'react'
import TripReviewsList from './TripReviewsList'
import TripReviewStats from './TripReviewStats'
import { Button } from '@/components/ui/button'

export default function UserTripReviews({ 
  userId, 
  showStats = true,
  showAsOrganizer = false,
  limit = 10 
}) {
  const [activeTab, setActiveTab] = useState('received')
  const [loading, setLoading] = useState(false)

  const tabs = [
    { 
      id: 'received', 
      label: 'Reseñas recibidas', 
      description: 'Reseñas que otros han dejado sobre tus viajes'
    },
    { 
      id: 'given', 
      label: 'Reseñas dadas', 
      description: 'Reseñas que has dejado sobre viajes'
    }
  ]

  const renderTabContent = () => {
    if (activeTab === 'received') {
      return (
        <div className="space-y-6">
          {showStats && (
            <TripReviewStats 
              organizerId={userId}
              showDetailed={true}
            />
          )}
          
          <TripReviewsList
            organizerId={userId}
            showTripInfo={true}
            showOrganizerInfo={false}
            canEdit={false}
            canDelete={false}
            canRespond={true}
            limit={limit}
          />
        </div>
      )
    }

    if (activeTab === 'given') {
      return (
        <div className="space-y-6">
          <TripReviewsList
            userId={userId}
            showTripInfo={true}
            showOrganizerInfo={true}
            canEdit={true}
            canDelete={true}
            canRespond={false}
            limit={limit}
          />
        </div>
      )
    }

    return null
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Description */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600">
          {tabs.find(tab => tab.id === activeTab)?.description}
        </p>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  )
}
