import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import InviteModal from './InviteModal'

/**
 * InviteButton Component
 * Button that opens the invite modal for adding collaborators to canvas
 */
const InviteButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-150"
        title="Invite collaborators"
      >
        <UserPlus className="w-4 h-4" />
        <span className="text-sm font-medium">Invite</span>
      </button>

      {isModalOpen && (
        <InviteModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  )
}

export default InviteButton

