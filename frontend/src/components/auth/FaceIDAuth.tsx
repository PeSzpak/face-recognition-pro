import React, { useState, useRef, useEffect } from "react";
import {
  Shield,
  Camera,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Scan,
} from "lucide-react";
import toast from "react-hot-toast";
import { recognitionService } from "../../services/recognition";
import { authService } from "../../services/auth";

interface FaceIDAuthProps {
  onSuccess: (user: any) => void;
  onError: (error: string) => void;
}

type AuthState =
  | "idle"
  | "initializing"
  | "scanning"
  | "processing"
  | "success"
  | "error";

const FaceIDAuth: React.FC<FaceIDAuthProps> = ({ onSuccess, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [authState, setAuthState] = useState<AuthState>("idle");
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [detectionQuality, setDetectionQuality] = useState(0);
  const [user, setUser] = useState<any>(null);

  const startFaceID = async () => {
    setAuthState("initializing");
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setAuthState("scanning");
            startCountdown();
          });
        };
      }
    } catch (err: any) {
      setError("Erro ao acessar câmera. Verifique as permissões.");
      setAuthState("error");
      onError("Camera access denied");
    }
  };

  const startCountdown = () => {
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          processFaceID();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const processFaceID = async () => {
    setAuthState("processing");

    try {
      // Capturar frame da webcam
      if (!videoRef.current) {
        throw new Error('Câmera não disponível');
      }

      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Erro ao processar imagem');
      }

      ctx.drawImage(videoRef.current, 0, 0);

      // Converter para blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Erro ao converter imagem'));
        }, 'image/jpeg', 0.95);
      });

      // Criar arquivo
      const file = new File([blob], 'face-auth.jpg', { type: 'image/jpeg' });

      // Enviar para reconhecimento
      const result = await recognitionService.identifyFace(file);

      if (result.recognized && result.person_id) {
        // Buscar dados completos do usuário
        const userResponse = await authService.getCurrentUser();
        
        const authenticatedUser = {
          id: userResponse.id,
          name: userResponse.full_name || userResponse.username,
          role: 'user',
          lastAccess: new Date().toISOString(),
          confidence: result.confidence || 0,
        };

        setUser(authenticatedUser);
        setAuthState("success");

        setTimeout(() => {
          onSuccess(authenticatedUser);
          toast.success(`Bem-vindo, ${authenticatedUser.name}!`);
        }, 1500);
      } else {
        setError("Rosto não reconhecido no sistema. Use login tradicional.");
        setAuthState("error");
        onError("Face not recognized");
      }
    } catch (error: any) {
      console.error('Erro no Face ID:', error);
      setError(error.message || "Erro ao processar Face ID");
      setAuthState("error");
      onError(error.message || "Face ID processing failed");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const resetAuth = () => {
    stopCamera();
    setAuthState("idle");
    setError(null);
    setCountdown(0);
    setUser(null);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const getStateIcon = () => {
    switch (authState) {
      case "idle":
        return <Shield className="h-12 w-12 text-mmtec-accent" />;
      case "initializing":
        return <Camera className="h-12 w-12 text-blue-400 animate-pulse" />;
      case "scanning":
        return <Scan className="h-12 w-12 text-mmtec-accent animate-pulse" />;
      case "processing":
        return <div className="loading-mmtec-lg" />;
      case "success":
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case "error":
        return <XCircle className="h-12 w-12 text-red-500" />;
      default:
        return <Shield className="h-12 w-12 text-mmtec-accent" />;
    }
  };

  const getStateMessage = () => {
    switch (authState) {
      case "idle":
        return "Clique para iniciar autenticação Face ID";
      case "initializing":
        return "Inicializando câmera...";
      case "scanning":
        return countdown > 0
          ? `Preparando escaneamento... ${countdown}`
          : "Mantenha o rosto no centro";
      case "processing":
        return "Processando identificação facial...";
      case "success":
        return `Bem-vindo, ${user?.name}!`;
      case "error":
        return error || "Erro na autenticação";
      default:
        return "";
    }
  };

  return (
    <div className="auth-layout">
      {/* Brand Panel */}
      <div className="hidden lg:flex lg:flex-1 auth-brand">
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-8">
            <Shield className="h-10 w-10 text-mmtec-primary" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">MMTec</h1>
          <h2 className="text-xl font-medium text-blue-100 mb-6">
            Face Recognition Pro
          </h2>
          <p className="text-blue-200 max-w-md leading-relaxed">
            Sistema avançado de reconhecimento facial com tecnologia de ponta.
            Segurança, precisão e inovação em cada acesso.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-2xl font-bold text-white">99.8%</div>
              <div className="text-blue-200 text-sm">Precisão</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">&lt;2s</div>
              <div className="text-blue-200 text-sm">Velocidade</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">24/7</div>
              <div className="text-blue-200 text-sm">Disponível</div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Panel */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile Brand */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 bg-mmtec-gradient rounded-xl mx-auto mb-4 flex items-center justify-center">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-mmtec-primary">
              MMTec Face ID
            </h1>
            <p className="text-slate-600 mt-2">
              Autenticação segura por reconhecimento facial
            </p>
          </div>

          {/* Face ID Container */}
          <div className="card-mmtec p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Autenticação Face ID
              </h2>
              <p className="text-slate-600">{getStateMessage()}</p>
            </div>

            {/* Face ID Scanner */}
            <div className="faceid-container mb-8">
              <div className="faceid-scanner">
                {authState === "idle" || authState === "error" ? (
                  <div className="text-center">
                    <div className="mb-6">{getStateIcon()}</div>
                    <button onClick={startFaceID} className="btn-mmtec-primary">
                      <Camera className="h-5 w-5 mr-2" />
                      Iniciar Face ID
                    </button>
                  </div>
                ) : (
                  <div
                    className={`faceid-frame ${
                      authState === "scanning" ? "faceid-scanning" : ""
                    }`}
                  >
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{ transform: "scaleX(-1)" }}
                    />

                    {/* Overlay States */}
                    {authState === "initializing" && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="text-center text-white">
                          <div className="loading-mmtec mb-2" />
                          <p className="text-sm">Iniciializando...</p>
                        </div>
                      </div>
                    )}

                    {authState === "scanning" && countdown > 0 && (
                      <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                        <div className="text-6xl font-bold text-white animate-pulse">
                          {countdown}
                        </div>
                      </div>
                    )}

                    {authState === "processing" && (
                      <div className="absolute inset-0 bg-mmtec-primary bg-opacity-80 flex items-center justify-center">
                        <div className="text-center text-white">
                          <div className="loading-mmtec-lg mb-4" />
                          <p className="font-medium">Processando...</p>
                        </div>
                      </div>
                    )}

                    {authState === "success" && (
                      <div className="absolute inset-0 bg-green-500 bg-opacity-80 flex items-center justify-center">
                        <div className="text-center text-white">
                          <CheckCircle className="h-16 w-16 mx-auto mb-4" />
                          <p className="font-bold text-lg">
                            Acesso Autorizado!
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Status & Controls */}
            {authState !== "idle" && (
              <div className="space-y-4">
                {/* Status Indicator */}
                <div className="flex items-center justify-center space-x-2">
                  {authState === "success" && (
                    <span className="status-success">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Autenticado com sucesso
                    </span>
                  )}
                  {authState === "error" && (
                    <span className="status-error">
                      <XCircle className="h-4 w-4 mr-1" />
                      Falha na autenticação
                    </span>
                  )}
                  {authState === "processing" && (
                    <span className="status-warning">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Processando...
                    </span>
                  )}
                </div>

                {/* Controls */}
                {(authState === "error" || authState === "scanning") && (
                  <div className="text-center">
                    <button onClick={resetAuth} className="btn-mmtec-outline">
                      Tentar Novamente
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-slate-500">
            <p>
              Tecnologia MMTec © 2024 - Sistema seguro de autenticação facial
            </p>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default FaceIDAuth;
