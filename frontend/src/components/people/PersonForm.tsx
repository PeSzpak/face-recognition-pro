import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Upload, X, Plus, Camera, Image as ImageIcon, Video } from 'lucide-react';
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

type CaptureMode = 'upload' | 'camera';

const PersonForm: React.FC<PersonFormProps> = ({ person, onSave, onCancel }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [captureMode, setCaptureMode] = useState<CaptureMode>('upload');
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to load
        await videoRef.current.play();
        streamRef.current = stream;
        setIsCameraActive(true);
        toast.success('Câmera ativada com sucesso!');
      }
    } catch (error: any) {
      console.error('Erro ao acessar câmera:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Permissão de câmera negada. Permita o acesso nas configurações.');
      } else if (error.name === 'NotFoundError') {
        toast.error('Nenhuma câmera encontrada no dispositivo.');
      } else {
        toast.error('Erro ao acessar câmera. Verifique as permissões.');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error('Câmera não está pronta');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Check if video is ready
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      toast.error('Aguarde a câmera carregar...');
      return;
    }
    
    const context = canvas.getContext('2d');
    if (!context) {
      toast.error('Erro ao processar imagem');
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    setSelectedImages(prev => [...prev, imageData]);
    
    const photoNumber = selectedImages.length + 1;
    toast.success(`Foto ${photoNumber} capturada!`);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    toast.success('Foto removida');
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const validImages: string[] = [];

    for (const file of acceptedFiles) {
      const validation = ImageUtils.validateImage(file);
      if (validation.isValid) {
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

  const removeUploadedImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);

      // Stop camera if active
      if (isCameraActive) {
        stopCamera();
      }

      if (isEditing) {
        const updateData: PersonUpdateRequest = {
          name: data.name,
          description: data.description || undefined,
        };

        await personsService.updatePerson(person.id, updateData);

        if (selectedImages.length > 0) {
          await personsService.addPersonPhotos(person.id, selectedImages);
        }

        toast.success('Pessoa atualizada com sucesso!');
      } else {
        if (selectedImages.length === 0) {
          toast.error('Adicione pelo menos uma foto da pessoa');
          setError('root', {
            type: 'manual',
            message: 'Adicione pelo menos uma foto da pessoa'
          });
          setIsLoading(false);
          return;
        }

        const createData: PersonCreateRequest = {
          name: data.name,
          description: data.description || undefined,
        };

        const newPerson = await personsService.createPerson(createData);
        await personsService.addPersonPhotos(newPerson.id, selectedImages);

        toast.success('Pessoa cadastrada com sucesso!');
      }

      onSave();
    } catch (error: any) {
      console.error('Failed to save person:', error);
      const message = error.response?.data?.detail || error.message || 'Erro ao salvar pessoa';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">
            {isEditing ? 'Editar Pessoa' : 'Nova Pessoa'}
          </h2>
          <p className="text-slate-600 mt-1">
            Preencha os dados e adicione fotos para cadastro
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nome Completo *
            </label>
            <input
              type="text"
              {...register('name', {
                required: 'Nome é obrigatório',
                minLength: {
                  value: 2,
                  message: 'Nome deve ter pelo menos 2 caracteres'
                },
                maxLength: {
                  value: 100,
                  message: 'Nome deve ter menos de 100 caracteres'
                }
              })}
              className={`input-mmtec ${errors.name ? 'border-red-500' : ''}`}
              placeholder="Digite o nome completo"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Descrição / Cargo
            </label>
            <textarea
              {...register('description', {
                maxLength: {
                  value: 500,
                  message: 'Descrição deve ter menos de 500 caracteres'
                }
              })}
              rows={3}
              className={`input-mmtec ${errors.description ? 'border-red-500' : ''}`}
              placeholder="Ex: Gerente de TI, Funcionário do RH, etc."
              disabled={isLoading}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Photo Capture Tabs */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Fotos {!isEditing && '*'}
            </label>

            {/* Mode Selection Tabs */}
            <div className="flex space-x-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setCaptureMode('upload');
                  if (isCameraActive) stopCamera();
                }}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                  captureMode === 'upload'
                    ? 'bg-mmtec-gradient text-white shadow-lg'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                disabled={isLoading}
              >
                <ImageIcon className="h-5 w-5" />
                <span>Upload de Fotos</span>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setCaptureMode('camera');
                  if (!isCameraActive) startCamera();
                }}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                  captureMode === 'camera'
                    ? 'bg-mmtec-gradient text-white shadow-lg'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                disabled={isLoading}
              >
                <Camera className="h-5 w-5" />
                <span>Capturar com Câmera</span>
              </button>
            </div>

            {/* Upload Mode */}
            {captureMode === 'upload' && (
              <div>
                <div
                  {...getRootProps()}
                  className={`
                    border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                    ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400'}
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <input {...getInputProps()} />
                  
                  <Upload className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                  <p className="text-base font-medium text-slate-900 mb-1">
                    {isDragActive ? 'Solte as fotos aqui' : 'Arraste fotos ou clique para selecionar'}
                  </p>
                  <p className="text-sm text-slate-600">
                    JPEG, PNG • Máx 10MB • Múltiplas fotos recomendadas
                  </p>
                </div>
              </div>
            )}

            {/* Camera Mode */}
            {captureMode === 'camera' && (
              <div className="space-y-4">
                <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video">
                  {isCameraActive ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      
                      {/* Camera Controls Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                        <div className="flex items-center justify-center space-x-4">
                          <button
                            type="button"
                            onClick={capturePhoto}
                            className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:bg-blue-50 transition-all shadow-lg"
                          >
                            <Camera className="h-8 w-8 text-blue-600" />
                          </button>
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-medium"
                          >
                            Parar Câmera
                          </button>
                        </div>
                        <p className="text-white text-center mt-3 text-sm">
                          {selectedImages.length} foto(s) capturada(s)
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-8">
                      <Video className="h-16 w-16 text-slate-500 mb-4" />
                      <p className="text-slate-400 text-center mb-4">
                        Câmera não ativada
                      </p>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="btn-mmtec-primary"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Ativar Câmera
                      </button>
                    </div>
                  )}
                </div>

                {/* Photos captured in camera mode */}
                {captureMode === 'camera' && selectedImages.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">
                      Fotos Capturadas ({selectedImages.length})
                    </p>
                    <div className="grid grid-cols-4 gap-3">
                      {selectedImages.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={photo}
                            alt={`Captura ${index + 1}`}
                            className="w-full aspect-square object-cover rounded-lg border-2 border-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* All Selected Images Preview (from both modes) */}
            {selectedImages.length > 0 && captureMode === 'upload' && (
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Fotos Selecionadas ({selectedImages.length})
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {selectedImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Preview ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg border-2 border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isEditing && selectedImages.length === 0 && (
              <p className="text-sm text-red-600 mt-2">
                Adicione pelo menos uma foto
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
          <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onCancel();
              }}
              disabled={isLoading}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all font-medium"
            >
              Cancelar
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="btn-mmtec-primary flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="loading-mmtec mr-2" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>{isEditing ? 'Atualizar' : 'Cadastrar'} Pessoa</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PersonForm;
