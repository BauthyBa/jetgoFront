import TripCardHorizontal from './TripCardHorizontal'

export default function TripListHorizontal({ trips, onJoin, onLeave, joiningId, leavingId, onEdit, canEdit, isMemberFn, isOwnerFn, onApply, hasAppliedFn }) {
  return (
    <div className="space-y-4 w-full">
      {(trips || []).map((trip) => (
        <TripCardHorizontal
          key={trip.id}
          trip={trip}
          joining={joiningId === trip.id}
          leaving={leavingId === trip.id}
          onJoin={() => onJoin(trip)}
          onLeave={() => onLeave && onLeave(trip)}
          onEdit={onEdit ? () => onEdit(trip) : undefined}
          canEdit={!!canEdit && canEdit(trip)}
          isMember={!!isMemberFn && isMemberFn(trip)}
          isOwner={!!isOwnerFn && isOwnerFn(trip)}
          onApply={onApply ? () => onApply(trip) : undefined}
          hasApplied={!!hasAppliedFn && hasAppliedFn(trip)}
        />
      ))}
    </div>
  )
}
