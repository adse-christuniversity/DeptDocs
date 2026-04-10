"use client";

import React, { useState } from 'react';
import { ChevronRight, Upload, X, Image as ImageIcon } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function ActivityPhotos({ data, onUpdate, onNext, reportId }: any) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // Use existing photos from master state or start with an empty array
    const photos = data.activityPhotos || [];

    const supabase = createClient();

    // Handle Drag Events for styling
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    // Handle Real File Upload to Supabase instead of Base64
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);

        let selectedFiles;
        if ('dataTransfer' in e) {
            selectedFiles = Array.from((e as React.DragEvent).dataTransfer.files);
        } else {
            selectedFiles = (e as React.ChangeEvent<HTMLInputElement>).target.files
                ? Array.from((e as React.ChangeEvent<HTMLInputElement>).target.files!)
                : [];
        }

        // Filter only images
        const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
        if (imageFiles.length === 0) return;

        setIsProcessing(true);

        try {
            const processedPhotos = await Promise.all(imageFiles.map(async (file) => {
                const folder = reportId || 'temp_uploads';
                const filePath = `${folder}/activityPhotos/${Date.now()}_${file.name}`;
                
                const { error } = await supabase.storage.from('reports').upload(filePath, file);
                if (error) throw error;
                
                const { data: { publicUrl } } = supabase.storage.from('reports').getPublicUrl(filePath);

                return {
                    id: Math.random().toString(36).substring(7),
                    name: file.name,
                    type: file.type,
                    url: publicUrl,
                    caption: ''        // Start with an empty caption
                };
            }));

            // Append new photos to master state
            onUpdate({ activityPhotos: [...photos, ...processedPhotos] });

        } catch (error) {
            console.error("Error processing images:", error);
            alert("Failed to upload some images to storage.");
        } finally {
            setIsProcessing(false);
        }
    };

    const removePhoto = (id: string) => {
        onUpdate({ activityPhotos: photos.filter((p: any) => p.id !== id) });
    };

    const updateCaption = (id: string, caption: string) => {
        const updated = photos.map((p: any) => p.id === id ? { ...p, caption } : p);
        onUpdate({ activityPhotos: updated });
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500 max-w-3xl">
            <h3 className="text-xl font-bold text-[#1a365d] border-b-2 border-[#1a365d] inline-block pb-1">
                Activity Photos
            </h3>

            <div className="space-y-6">
                <div>
                    <label htmlFor="photo-upload" className="text-sm font-bold text-gray-700 cursor-pointer">
                        Upload Photos
                    </label>
                    <p className="text-xs text-red-500 font-medium italic mt-1">At least 2 photos required *</p>
                </div>

                {/* Upload Zone */}
                <div
                    className={`relative border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center transition-all group
                        ${dragActive ? 'border-[#4F65F6] bg-[#4F65F6]/5' : 'border-gray-200 bg-gray-50/30 hover:border-[#4F65F6]'}`}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleFileChange}
                >
                    <input
                        id="photo-upload"
                        name="photo_upload"
                        type="file"
                        multiple
                        className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={isProcessing}
                    />

                    <div className="mb-4 p-4 bg-white rounded-full shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                        <ImageIcon size={24} className={dragActive ? "text-[#4F65F6]" : "text-gray-400"} />
                    </div>

                    <div className="bg-[#4F65F6] text-white px-8 py-2.5 rounded-full font-bold text-xs mb-3 shadow-md group-hover:bg-[#3d50c2] transition-colors">
                        {isProcessing ? "Processing..." : "Browse Images"}
                    </div>

                    <p className="text-xs text-gray-400 text-center font-medium">
                        Drag and drop your images here <br /> JPG, PNG, WEBP
                    </p>
                </div>

                {/* Photo Preview Grid */}
                {photos.length > 0 && (
                    <div className="grid grid-cols-2 gap-6 mt-8">
                        {photos.map((photo: any) => (
                            <div key={photo.id} className="relative group border rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col">
                                <button
                                    onClick={() => removePhoto(photo.id)}
                                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-md hover:bg-red-600"
                                    title="Remove photo"
                                >
                                    <X size={14} />
                                </button>
                                <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden relative">
                                    <img src={photo.url} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                                <div className="p-3 bg-white border-t">
                                    <input
                                        type="text"
                                        placeholder="Add a caption..."
                                        value={photo.caption}
                                        onChange={(e) => updateCaption(photo.id, e.target.value)}
                                        className="w-full text-xs p-2 border-b outline-none focus:border-[#4F65F6] bg-transparent text-gray-800"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-end pt-6">
                <button
                    onClick={onNext}
                    disabled={photos.length < 2}
                    className={`px-10 py-3 rounded-lg font-bold flex items-center space-x-2 transition-all ${photos.length >= 2
                        ? 'bg-[#4F65F6] text-white hover:bg-[#3d50c2]'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    <span>Next</span>
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
}