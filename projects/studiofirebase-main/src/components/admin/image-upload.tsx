"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Image as ImageIcon, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface ImageUploadProps {
    label: string;
    description?: string;
    currentImageUrl?: string;
    onImageChange: (url: string) => void;
    aspectRatio?: "square" | "wide" | "tall";
}

export default function ImageUpload({ 
    label, 
    description, 
    currentImageUrl, 
    onImageChange, 
    aspectRatio = "square" 
}: ImageUploadProps) {
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [urlInput, setUrlInput] = useState(currentImageUrl || '');
    const { toast } = useToast();

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        
        const files = Array.from(e.dataTransfer.files);
        const imageFile = files.find(file => file.type.startsWith('image/'));
        
        if (imageFile) {
            handleFileUpload(imageFile);
        }
    };

    const handleFileUpload = async (file: File) => {
        setUploading(true);
        
        try {
            // Criar URL temporária para preview
            const tempUrl = URL.createObjectURL(file);
            onImageChange(tempUrl);
            
            // Upload real para Firebase Storage
            const timestamp = Date.now();
            const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const storagePath = `uploads/${fileName}`;
            const storageRef = ref(storage, storagePath);
            
            console.log(`⬆️ Uploading to: ${storagePath}`);
            
            // Upload do arquivo
            await uploadBytes(storageRef, file, {
                contentType: file.type,
                customMetadata: {
                    uploadedAt: new Date().toISOString(),
                    originalName: file.name
                }
            });
            
            // Obter URL pública
            const downloadURL = await getDownloadURL(storageRef);
            console.log(`✅ Upload completo: ${downloadURL}`);
            
            // Atualizar com URL real do Firebase
            onImageChange(downloadURL);
            
            toast({
                title: "Imagem carregada!",
                description: "A imagem foi enviada para o Firebase Storage."
            });
        } catch (error) {
            console.error('Erro no upload:', error);
            toast({
                variant: "destructive",
                title: "Erro no upload",
                description: error instanceof Error ? error.message : "Não foi possível carregar a imagem."
            });
        } finally {
            setUploading(false);
        }
    };

    const handleUrlSubmit = () => {
        if (urlInput && isValidUrl(urlInput)) {
            onImageChange(urlInput);
            toast({
                title: "URL da imagem definida!",
                description: "A URL da imagem foi atualizada."
            });
        } else {
            toast({
                variant: "destructive",
                title: "URL inválida",
                description: "Por favor, insira uma URL válida."
            });
        }
    };

    const isValidUrl = (string: string) => {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    };

    const getAspectRatioClass = () => {
        switch (aspectRatio) {
            case "wide": return "aspect-[16/9]";
            case "tall": return "aspect-[3/4]";
            default: return "aspect-square";
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    {label}
                </CardTitle>
                {description && (
                    <CardDescription>{description}</CardDescription>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Preview da imagem atual */}
                {currentImageUrl && (
                    <div className="relative">
                        <div className={`${getAspectRatioClass()} w-full max-w-xs mx-auto overflow-hidden rounded-lg border`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                                src={currentImageUrl} 
                                alt={label}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => onImageChange('')}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* Área de upload por drag & drop */}
                <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        dragOver 
                            ? 'border-primary bg-primary/10' 
                            : 'border-muted-foreground/25 hover:border-primary/50'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                        Arraste uma imagem aqui ou clique para selecionar
                    </p>
                    <Input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id={`file-upload-${label}`}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file);
                        }}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        asChild
                        disabled={uploading}
                    >
                        <label htmlFor={`file-upload-${label}`} className="cursor-pointer">
                            {uploading ? 'Carregando...' : 'Selecionar Arquivo'}
                        </label>
                    </Button>
                </div>

                {/* Input para URL */}
                <div className="space-y-2">
                    <Label htmlFor={`url-input-${label}`}>Ou insira uma URL:</Label>
                    <div className="flex gap-2">
                        <Input
                            id={`url-input-${label}`}
                            placeholder="https://exemplo.com/imagem.jpg"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                        />
                        <Button 
                            onClick={handleUrlSubmit}
                            disabled={!urlInput}
                        >
                            Usar URL
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
