import React, { useRef, useEffect, useState, useCallback } from "react";
import { Camera, X, Shield, AlertTriangle } from "lucide-react";
import { recognitionService } from "../services/recognition";

interface LiveDetectionProps {
  onResult: (result: any) => void;
  onClose: () => void;
}

const LiveDetection: React.FC<LiveDetectionProps> = ({ onResult, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [livenessScore, setLivenessScore] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detecção contínua de movimento (anti-spoofing básico)
  const [motionHistory, setMotionHistory] = useState<number[]>([]);
  const lastFrameRef = useRef<ImageData | null>(null);

  const detectMotion = useCallback(() => {
    if (!videoRef.current || !isReady) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (lastFrameRef.current) {
      // Calcular diferença entre frames
      let totalDiff = 0;
      for (let i = 0; i < currentFrame.data.length; i += 4) {
        const diff = Math.abs(
          currentFrame.data[i] - lastFrameRef.current.data[i]
        );
        totalDiff += diff;
      }

      const motionLevel = totalDiff / (canvas.width * canvas.height);

      // Atualizar histórico de movimento
      setMotionHistory((prev) => {
        const newHistory = [...prev, motionLevel].slice(-10); // Últimos 10 frames
        const avgMotion =
          newHistory.reduce((a, b) => a + b, 0) / newHistory.length;

        // Calcular score de "vida" baseado no movimento
        const liveness = Math.min(avgMotion / 50, 1); // Normalizar
        setLivenessScore(liveness);

        return newHistory;
      });
    }

    lastFrameRef.current = currentFrame;
  }, [isReady]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let motionInterval: NodeJS.Timeout;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
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
              setIsReady(true);
              // Iniciar detecção de movimento
              motionInterval = setInterval(detectMotion, 100); // 10 FPS
            });
          };
        }
      } catch (err: any) {
        setError(err.message);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (motionInterval) {
        clearInterval(motionInterval);
      }
    };
  }, [detectMotion]);

  const processFrame = async () => {
    if (!videoRef.current || isProcessing) return;

    setIsProcessing(true);

    try {
      // Verificar se há movimento suficiente (anti-spoofing)
      if (livenessScore < 0.1) {
        onResult({
          recognized: false,
          status: "spoofing_detected",
          message: "Movimento insuficiente detectado. Mova levemente a cabeça.",
          liveness_score: livenessScore,
          spoofing_detected: true,
        });
        return;
      }

      // Processar frame atual
      const result = await recognitionService.identifyFaceFromWebcam(
        videoRef.current
      );
      onResult({
        ...result,
        liveness_score: livenessScore,
        motion_history: motionHistory,
      });
    } catch (error) {
      onResult({
        recognized: false,
        status: "error",
        message: "Erro ao processar detecção",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getLivenessColor = () => {
    if (livenessScore > 0.3) return "text-green-500";
    if (livenessScore > 0.1) return "text-yellow-500";
    return "text-red-500";
  };

  const getLivenessStatus = () => {
    if (livenessScore > 0.3) return "✅ Pessoa real detectada";
    if (livenessScore > 0.1) return "⚠️ Mova levemente a cabeça";
    return "❌ Movimento insuficiente";
  };

  return (
    <div className="bg-white border-4 border-purple-500 rounded-lg p-4 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-purple-600 flex items-center">
          <Shield className="h-5 w-5 mr-2" />
          🛡️ DETECÇÃO SEGURA
        </h3>
        <button
          onClick={onClose}
          className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* STATUS DE SEGURANÇA */}
      <div className="mb-4 p-3 bg-gray-100 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">🔍 Detecção de Vida:</span>
          <span className={`text-sm font-bold ${getLivenessColor()}`}>
            {(livenessScore * 100).toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-300 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              livenessScore > 0.3
                ? "bg-green-500"
                : livenessScore > 0.1
                ? "bg-yellow-500"
                : "bg-red-500"
            }`}
            style={{ width: `${Math.max(livenessScore * 100, 5)}%` }}
          />
        </div>
        <p className={`text-xs mt-1 ${getLivenessColor()}`}>
          {getLivenessStatus()}
        </p>
      </div>

      <div className="relative bg-black rounded overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-80 object-cover"
          style={{ transform: "scaleX(-1)" }}
        />

        {/* OVERLAY DE DETECÇÃO */}
        <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
          {isReady ? "📹 Câmera ativa" : "⏳ Carregando..."}
        </div>

        {/* BOTÃO DE PROCESSAR */}
        {isReady && (
          <button
            onClick={processFrame}
            disabled={isProcessing || livenessScore < 0.1}
            className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full text-white font-bold transition-all ${
              isProcessing
                ? "bg-gray-500 cursor-not-allowed"
                : livenessScore >= 0.1
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-red-500 cursor-not-allowed"
            }`}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block mr-2" />
                Processando...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 inline mr-2" />
                🔍 Reconhecer
              </>
            )}
          </button>
        )}

        {!isReady && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
              <p>Iniciando detecção segura...</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <AlertTriangle className="h-4 w-4 inline mr-2" />
          {error}
        </div>
      )}
    </div>
  );
};

export default LiveDetection;
