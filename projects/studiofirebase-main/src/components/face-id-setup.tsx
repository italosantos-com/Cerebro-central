
"use client";

import { useRef, useEffect, useState } from 'react';
import { useFaceIDAuth } from '@/contexts/face-id-auth-context';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FaceIDSetupProps {
    onRegistrationSuccess: () => void;
    userEmail: string;
}

export default function FaceIDSetup({ onRegistrationSuccess, userEmail }: FaceIDSetupProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        async function setupCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setIsCameraReady(true);
                }
            } catch (err) {
                console.error("Error accessing camera: ", err);
                toast({ variant: "destructive", title: "Erro ao acessar a câmera", description: "Por favor, verifique as permissões da câmera no seu navegador." });
            }
        }
        setupCamera();
    }, [toast]);

    const handleRegister = async () => {
        setIsRegistering(true);
        // Simulate face registration
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Here you would add the actual face registration logic
        
        setIsRegistering(false);
        onRegistrationSuccess();
    };

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-full max-w-sm h-64 bg-gray-200 rounded-lg overflow-hidden">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                {!isCameraReady && <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50"><Loader2 className="h-8 w-8 text-white animate-spin" /></div>}
            </div>
            <Button onClick={handleRegister} disabled={!isCameraReady || isRegistering} className="mt-4 w-full">
                {isRegistering ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando...</> : 'Registrar Rosto'}
            </Button>
        </div>
    );
}
