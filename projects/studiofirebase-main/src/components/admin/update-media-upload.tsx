'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Image as ImageIcon, Video, Camera, X, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface MediaFile {
  url: string;
  type: 'image' | 'video';
  file?: File;
}

interface UpdateMediaUploadProps {
  onMediaChange: (media: MediaFile[]) => void;
  currentMedia?: MediaFile[];
}

export function UpdateMediaUpload({ onMediaChange, currentMedia = [] }: UpdateMediaUploadProps) {
  const [media, setMedia] = useState<MediaFile[]>(currentMedia);
  const [uploading, setUploading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await handleFilesUpload(files);
  };

  const handleFilesUpload = async (files: File[]) => {
    setUploading(true);
    
    try {
      const uploadedMedia: MediaFile[] = [];

      for (const file of files) {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        if (!isImage && !isVideo) {
          toast({
            variant: 'destructive',
            title: 'Arquivo inválido',
            description: 'Apenas imagens e vídeos são permitidos',
          });
          continue;
        }

        // Upload to Firebase Storage
        const timestamp = Date.now();
        // Sanitize filename: remove all special chars except extension dot
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_').replace(/\.+/g, '.');
        const fileName = `${timestamp}-${sanitizedName}`;
        const storagePath = `updates/${fileName}`;
        const storageRef = ref(storage, storagePath);

        await uploadBytes(storageRef, file, {
          contentType: file.type,
          customMetadata: {
            uploadedAt: new Date().toISOString(),
            originalName: file.name,
          },
        });

        const downloadURL = await getDownloadURL(storageRef);

        uploadedMedia.push({
          url: downloadURL,
          type: isImage ? 'image' : 'video',
          file,
        });
      }

      const updatedMedia = [...media, ...uploadedMedia];
      setMedia(updatedMedia);
      onMediaChange(updatedMedia);

      toast({
        title: 'Mídia carregada!',
        description: `${uploadedMedia.length} arquivo(s) enviado(s) com sucesso`,
      });
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        variant: 'destructive',
        title: 'Erro no upload',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setUploading(false);
    }
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      
      streamRef.current = stream;
      setIsCameraOpen(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao acessar câmera',
        description: 'Não foi possível acessar a câmera. Verifique as permissões.',
      });
    }
  };

  // Effect to connect stream to video element when camera opens
  useEffect(() => {
    if (isCameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraOpen]);

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
      await handleFilesUpload([file]);
      closeCamera();
    }, 'image/jpeg', 0.95);
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const removeMedia = (index: number) => {
    const updatedMedia = media.filter((_, i) => i !== index);
    setMedia(updatedMedia);
    onMediaChange(updatedMedia);
  };

  return (
    <div className="space-y-4">
      {/* Media Preview */}
      {media.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {media.map((item, index) => (
            <div key={index} className="relative group">
              {item.type === 'image' ? (
                <img
                  src={item.url}
                  alt={`Media ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
              ) : (
                <video
                  src={item.url}
                  className="w-full h-32 object-cover rounded-lg"
                />
              )}
              <Button
                size="sm"
                variant="destructive"
                className="absolute top-1 right-1 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeMedia(index)}
              >
                <X className="w-4 h-4" />
              </Button>
              <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-2 py-1 rounded">
                {item.type === 'image' ? <ImageIcon className="w-3 h-3" /> : <Video className="w-3 h-3" />}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Camera Modal */}
      {isCameraOpen && (
        <Card className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4">
          <div className="relative w-full max-w-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg"
            />
            <div className="flex gap-3 mt-4 justify-center">
              <Button onClick={capturePhoto} size="lg">
                <Camera className="w-5 h-5 mr-2" />
                Capturar Foto
              </Button>
              <Button onClick={closeCamera} variant="outline" size="lg">
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Upload Controls */}
      <div className="flex flex-wrap gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? 'Carregando...' : 'Adicionar Mídia'}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={openCamera}
          disabled={uploading}
        >
          <Camera className="w-4 h-4 mr-2" />
          Abrir Câmera
        </Button>
      </div>

      <p className="text-xs text-gray-500">
        Adicione fotos ou vídeos à sua atualização. Você pode selecionar múltiplos arquivos.
      </p>
    </div>
  );
}
