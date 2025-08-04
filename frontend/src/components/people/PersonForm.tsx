import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Upload, X, Plus } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Person, PersonCreateRequest, PersonUpdateRequest } from '@/types';
import { personsService } from '@/services/persons';
import ImageUtils from '@/utils/imageUtils';
import Loading from '@/components/ui/Loading';
import toast from 'react-hot-toast';

interface PersonFormProps {
  person?: Person;
  onSave: () => void;
  onCancel: () => void;
}

interface FormData {
  name: string;
  description: string;
}

const PersonForm: React.FC<PersonFormProps> = ({ person, onSave, onCancel }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const isEditing = !!person;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError
  } = useForm<FormData>({
    defaultValues: {
      name: person?.name || '',
      description: person?.description || '',
    }
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const validFiles: File[] = [];
    const validImages: string[] = [];

    for (const file of acceptedFiles) {
      const validation = ImageUtils.validateImage(file);
      if (validation.isValid) {
        validFiles.push(file);
        try {
          const preview = await ImageUtils.createImagePreview(file);
          validImages.push(preview);
        } catch (error) {
          console.error('Failed to create preview:', error);
        }
      } else {
        toast.error(`${file.name}: ${validation.error}`);
      }
    }

    setImageFiles(prev => [...prev, ...validFiles]);
    setSelectedImages(prev => [...prev, ...validImages]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    multiple: true,
    maxFiles: 10,
    disabled: isLoading,
  });

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);

      if (isEditing) {
        // Update existing person
        const updateData: PersonUpdateRequest = {
          name: data.name,
          description: data.description || undefined,
        };

        await personsService.updatePerson(person.id, updateData);

        // Add new photos if any
        if (selectedImages.length > 0) {
          await personsService.addPersonPhotos(person.id, selectedImages);
        }

        toast.success('Person updated successfully!');
      } else {
        // Create new person
        if (selectedImages.length === 0) {
          setError('root', {
            type: 'manual',
            message: 'Please add at least one photo of the person'
          });
          return;
        }

        const createData: PersonCreateRequest = {
          name: data.name,
          description: data.description || undefined,
        };

        const newPerson = await personsService.createPerson(createData);

        // Add photos
        await personsService.addPersonPhotos(newPerson.id, selectedImages);

        toast.success('Person created successfully!');
      }

      onSave();
    } catch (error: any) {
      console.error('Failed to save person:', error);
      const message = error.message || 'Failed to save person';
      toast.error(message);
      setError('root', {
        type: 'manual',
        message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Name Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Full Name *
        </label>
        <input
          type="text"
          {...register('name', {
            required: 'Name is required',
            minLength: {
              value: 2,
              message: 'Name must be at least 2 characters'
            },
            maxLength: {
              value: 100,
              message: 'Name must be less than 100 characters'
            }
          })}
          className={`input-field ${errors.name ? 'border-red-500' : ''}`}
          placeholder="Enter person's full name"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Description Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          {...register('description', {
            maxLength: {
              value: 500,
              message: 'Description must be less than 500 characters'
            }
          })}
          rows={3}
          className={`input-field ${errors.description ? 'border-red-500' : ''}`}
          placeholder="Add a description or notes about this person (optional)"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Photo Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Photos {!isEditing && '*'}
        </label>
        
        {/* Upload Zone */}
        <div
          {...getRootProps()}
          className={`
            upload-zone cursor-pointer mb-4
            ${isDragActive ? 'dragover' : ''}
            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          
          <div className="text-center">
            <Upload className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900 mb-1">
              {isDragActive ? 'Drop photos here' : 'Upload photos'}
            </p>
            <p className="text-xs text-gray-600">
              Drag & drop or click to select multiple photos
            </p>
            <p className="text-xs text-gray-500 mt-1">
              JPEG, PNG • Max 10MB each • Multiple faces will be extracted
            </p>
          </div>
        </div>

        {/* Image Previews */}
        {selectedImages.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {selectedImages.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {!isEditing && selectedImages.length === 0 && (
          <p className="text-sm text-red-600 mt-1">
            Please add at least one photo
          </p>
        )}
      </div>

      {/* Global Error */}
      {errors.root && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">
            {errors.root.message}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="btn-secondary"
        >
          Cancel
        </button>
        
        <button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="btn-primary flex items-center space-x-2"
        >
          {isLoading ? (
            <Loading size="sm" text="" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          <span>{isEditing ? 'Update Person' : 'Add Person'}</span>
        </button>
      </div>
    </form>
  );
};

export default PersonForm;