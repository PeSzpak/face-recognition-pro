import React from 'react';
import { User, Calendar, Camera, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Person } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface PersonCardProps {
  person: Person;
  onEdit: (person: Person) => void;
  onDelete: (person: Person) => void;
  onViewDetails: (person: Person) => void;
}

const PersonCard: React.FC<PersonCardProps> = ({ 
  person, 
  onEdit, 
  onDelete, 
  onViewDetails 
}) => {
  const [showMenu, setShowMenu] = React.useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="card hover:shadow-md transition-shadow duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center">
            <span className="text-white font-medium">
              {getInitials(person.name)}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{person.name}</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>
                Added {formatDistanceToNow(new Date(person.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        {/* Status & Menu */}
        <div className="flex items-center space-x-2">
          <span className={`
            px-2 py-1 text-xs font-medium rounded-full
            ${person.active 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
            }
          `}>
            {person.active ? 'Active' : 'Inactive'}
          </span>
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-md hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4 text-gray-500" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                <button
                  onClick={() => {
                    onViewDetails(person);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <User className="h-4 w-4 mr-3" />
                  View Details
                </button>
                <button
                  onClick={() => {
                    onEdit(person);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Edit className="h-4 w-4 mr-3" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    onDelete(person);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-3" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {person.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {person.description}
        </p>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Camera className="h-4 w-4" />
          <span>{person.photo_count} photos</span>
        </div>

        <button
          onClick={() => onViewDetails(person)}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View Details →
        </button>
      </div>
    </div>
  );
};

export default PersonCard;