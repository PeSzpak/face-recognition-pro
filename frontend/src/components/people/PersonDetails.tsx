import React, { useState, useEffect } from 'react';
import { User, Calendar, Camera, Activity, Edit, ToggleLeft, ToggleRight } from 'lucide-react';
import { Person } from '@/types';
import { personsService } from '@/services/persons';
import { formatDistanceToNow, format } from 'date-fns';
import Loading from '@/components/ui/Loading';
import toast from 'react-hot-toast';

interface PersonDetailsProps {
  person: Person;
  onEdit: () => void;
  onClose: () => void;
}

interface PersonStats {
  total_recognitions: number;
  successful_recognitions: number;
  last_recognition: string | null;
}

const PersonDetails: React.FC<PersonDetailsProps> = ({ person, onEdit, onClose }) => {
  const [stats, setStats] = useState<PersonStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [currentPerson, setCurrentPerson] = useState(person);

  useEffect(() => {
    loadPersonStats();
  }, [person.id]);

  const loadPersonStats = async () => {
    try {
      setIsLoadingStats(true);
      const personStats = await personsService.getPersonStats(person.id);
      setStats(personStats);
    } catch (error) {
      console.error('Failed to load person stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const togglePersonStatus = async () => {
    try {
      setIsTogglingStatus(true);
      const updatedPerson = await personsService.togglePersonStatus(
        currentPerson.id,
        !currentPerson.active
      );
      setCurrentPerson(updatedPerson);
      toast.success(`Person ${updatedPerson.active ? 'activated' : 'deactivated'} successfully`);
    } catch (error: any) {
      console.error('Failed to toggle person status:', error);
      toast.error('Failed to update person status');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-semibold">
              {getInitials(currentPerson.name)}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{currentPerson.name}</h2>
            <div className="flex items-center space-x-4 mt-1">
              <span className={`
                px-2 py-1 text-xs font-medium rounded-full
                ${currentPerson.active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
                }
              `}>
                {currentPerson.active ? 'Active' : 'Inactive'}
              </span>
              <span className="text-sm text-gray-500">
                ID: {currentPerson.id}
              </span>
            </div>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={togglePersonStatus}
            disabled={isTogglingStatus}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${currentPerson.active
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
              }
              ${isTogglingStatus ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {currentPerson.active ? (
              <ToggleLeft className="h-4 w-4" />
            ) : (
              <ToggleRight className="h-4 w-4" />
            )}
            <span>{currentPerson.active ? 'Deactivate' : 'Activate'}</span>
          </button>

          <button
            onClick={onEdit}
            className="btn-secondary flex items-center space-x-2"
          >
            <Edit className="h-4 w-4" />
            <span>Edit</span>
          </button>
        </div>
      </div>

      {/* Description */}
      {currentPerson.description && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
          <p className="text-gray-700">{currentPerson.description}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Basic Info */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <User className="h-5 w-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">Basic Information</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="font-medium">
                {format(new Date(currentPerson.created_at), 'MMM dd, yyyy')}
              </p>
              <p className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(currentPerson.created_at), { addSuffix: true })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="font-medium">
                {format(new Date(currentPerson.updated_at), 'MMM dd, yyyy')}
              </p>
              <p className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(currentPerson.updated_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>

        {/* Photo Stats */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <Camera className="h-5 w-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">Photos</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Total Photos</p>
              <p className="text-2xl font-bold text-gray-900">
                {currentPerson.photo_count}
              </p>
            </div>
            {currentPerson.photo_count > 0 && (
              <div className="text-xs text-gray-500">
                Photos are used to train the recognition model
              </div>
            )}
          </div>
        </div>

        {/* Recognition Stats */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <Activity className="h-5 w-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">Recognition Stats</h3>
          </div>
          
          {isLoadingStats ? (
            <Loading size="sm" text="Loading stats..." />
          ) : stats ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Total Recognitions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total_recognitions}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Successful</p>
                <p className="font-medium text-green-600">
                  {stats.successful_recognitions}
                </p>
              </div>
              {stats.last_recognition && (
                <div>
                  <p className="text-sm text-gray-500">Last Recognition</p>
                  <p className="text-xs text-gray-600">
                    {formatDistanceToNow(new Date(stats.last_recognition), { addSuffix: true })}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No recognition data available</p>
          )}
        </div>
      </div>

      {/* Recent Activity (placeholder for future implementation) */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="text-center py-8 text-gray-500">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Recent activity will be displayed here</p>
        </div>
      </div>
    </div>
  );
};

export default PersonDetails;