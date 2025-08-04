import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Clock, User } from 'lucide-react';
import { RecognitionResult as ResultType } from '@/types';

interface RecognitionResultProps {
  result: ResultType;
  onNewRecognition?: () => void;
}

const RecognitionResult: React.FC<RecognitionResultProps> = ({ 
  result, 
  onNewRecognition 
}) => {
  const getStatusIcon = () => {
    switch (result.status) {
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-600" />;
      case 'no_match':
        return <XCircle className="h-12 w-12 text-orange-600" />;
      case 'no_face':
        return <AlertCircle className="h-12 w-12 text-red-600" />;
      case 'error':
      default:
        return <XCircle className="h-12 w-12 text-red-600" />;
    }
  };

  const getStatusColor = () => {
    switch (result.status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'no_match':
        return 'bg-orange-50 border-orange-200';
      case 'no_face':
        return 'bg-red-50 border-red-200';
      case 'error':
      default:
        return 'bg-red-50 border-red-200';
    }
  };

  const getStatusTitle = () => {
    switch (result.status) {
      case 'success':
        return 'Person Identified!';
      case 'no_match':
        return 'No Match Found';
      case 'no_face':
        return 'No Face Detected';
      case 'error':
      default:
        return 'Recognition Failed';
    }
  };

  const getStatusMessage = () => {
    switch (result.status) {
      case 'success':
        return `Successfully identified ${result.person_name} with ${(result.confidence * 100).toFixed(1)}% confidence.`;
      case 'no_match':
        return 'No matching person found in the database. The person may not be registered.';
      case 'no_face':
        return 'No face was detected in the image. Please ensure the image contains a clear, visible face.';
      case 'error':
      default:
        return result.message || 'An error occurred during recognition. Please try again.';
    }
  };

  return (
    <div className={`card border-2 ${getStatusColor()}`}>
      <div className="text-center space-y-6">
        {/* Status Icon */}
        <div className="flex justify-center">
          {getStatusIcon()}
        </div>

        {/* Status Title */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {getStatusTitle()}
          </h3>
          <p className="text-gray-600">
            {getStatusMessage()}
          </p>
        </div>

        {/* Details */}
        {result.status === 'success' && result.person_name && (
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <User className="h-8 w-8 text-primary-600" />
              <div className="text-left">
                <h4 className="font-semibold text-gray-900">
                  {result.person_name}
                </h4>
                <p className="text-sm text-gray-500">
                  Person ID: {result.person_id}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <p className="text-gray-500">Confidence</p>
                <p className="font-semibold text-green-600">
                  {(result.confidence * 100).toFixed(1)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-500">Processing Time</p>
                <p className="font-semibold text-gray-900">
                  {(result.processing_time * 1000).toFixed(0)}ms
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Processing Time (for non-success cases) */}
        {result.status !== 'success' && (
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>Processed in {(result.processing_time * 1000).toFixed(0)}ms</span>
          </div>
        )}

        {/* Action Button */}
        {onNewRecognition && (
          <button
            onClick={onNewRecognition}
            className="btn-primary"
          >
            Try Another Recognition
          </button>
        )}
      </div>
    </div>
  );
};

export default RecognitionResult;