import React, { useRef, useEffect, useState } from "react";
import { Camera, X } from "lucide-react";

interface SimpleWebcamProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

const SimpleWebcam: React.FC<SimpleWebcamProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        console.log("🎥 INICIANDO WEBCAM...");

        // TENTAR DIFERENTES CONFIGURAÇÕES
        const constraints = [
          { video: { width: 640, height: 480, facingMode: "user" } },
          { video: { width: 320, height: 240 } },
          { video: true },
        ];

        for (const constraint of constraints) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraint);
            console.log("✅ STREAM OBTIDO:", constraint);
            break;
          } catch (err) {
            console.log("❌ Tentativa falhou:", constraint, err);
          }
        }

        if (!stream) {
          throw new Error("Não foi possível acessar a webcam");
        }

        if (videoRef.current) {
          const video = videoRef.current;

          // CONFIGURAÇÃO MAIS AGRESSIVA
          video.srcObject = stream;
          video.muted = true;
          video.playsInline = true;
          video.autoplay = true;
          video.controls = false;

          // FORÇAR REPRODUÇÃO
          const forcePlay = async () => {
            try {
              await video.play();
              console.log("▶️ VIDEO REPRODUZINDO!");
              setIsReady(true);
            } catch (err) {
              console.error("❌ ERRO AO REPRODUZIR:", err);
              setError("Erro ao reproduzir video");
            }
          };

          video.onloadedmetadata = forcePlay;
          video.onloadeddata = forcePlay;
          video.oncanplay = forcePlay;

          // TIMEOUT DE SEGURANÇA
          setTimeout(forcePlay, 1000);
        }
      } catch (err: any) {
        console.error("❌ ERRO WEBCAM:", err);
        setError(err.message);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.8);
      onCapture(imageData);
    }
  };

  return (
    <div className="bg-white border-4 border-blue-500 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-blue-600">
          🎥 WEBCAM {isReady ? "ATIVA" : "CARREGANDO"}
        </h3>
        <button
          onClick={onClose}
          className="bg-red-500 text-white px-3 py-1 rounded"
        >
          ❌ Fechar
        </button>
      </div>

      <div
        className="relative bg-black rounded overflow-hidden"
        style={{ minHeight: "300px" }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "300px",
            objectFit: "cover",
            transform: "scaleX(-1)",
            backgroundColor: "black",
          }}
        />

        {isReady && (
          <button
            onClick={capture}
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-2 rounded-full hover:bg-green-600"
          >
            📸 CAPTURAR
          </button>
        )}

        {!isReady && !error && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
              <p>Carregando webcam...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-red-900 bg-opacity-50 flex items-center justify-center text-white">
            <div className="text-center p-4">
              <p className="font-bold">❌ Erro:</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default SimpleWebcam;
