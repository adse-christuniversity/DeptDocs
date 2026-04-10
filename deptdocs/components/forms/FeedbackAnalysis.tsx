"use client";

import React, { useState } from 'react';
import { ChevronRight, Upload, X, BarChart3, FileText, Image as ImageIcon, Save } from 'lucide-react';

export default function FeedbackAnalysis({ data, onUpdate, onFinish, onSave }: any) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // Initialize files array from state or empty
    const feedbackFiles = data.feedbackFiles || [];

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

        if (selectedFiles.length === 0) return;

        setIsProcessing(true);

        try {
            const processedFiles = await Promise.all(selectedFiles.map(async (file) => {
                const fileType = file.name.split('.').pop()?.toLowerCase();
                let pages: string[] = [];

                // CASE 1: Image (Convert to Base64 for React-PDF)
                if (['jpg', 'jpeg', 'png'].includes(fileType || '')) {
                    const base64String = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(file);
                    });
                    pages = [base64String];
                }
                // CASE 2: PDF (Safely guarded for Browser-Only execution)
                else if (fileType === 'pdf') {
                    // This strictly prevents Next.js from running this block on the server during build
                    if (typeof window !== 'undefined') {
                        const pdfjs = await import('pdfjs-dist');
                        pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

                        const arrayBuffer = await file.arrayBuffer();
                        const pdfDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise;

                        for (let i = 1; i <= pdfDoc.numPages; i++) {
                            const page = await pdfDoc.getPage(i);
                            const viewport = page.getViewport({ scale: 2.0 });
                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');

                            canvas.height = viewport.height;
                            canvas.width = viewport.width;

                            const renderContext = {
                                canvasContext: context,
                                viewport: viewport
                            };
                            await page.render(renderContext as any).promise;

                            pages.push(canvas.toDataURL('image/png'));
                        }
                    }
                }

                return {
                    id: Math.random().toString(36).substring(7),
                    name: file.name,
                    type: fileType,
                    pages: pages
                };
            }));

            // Append new files to existing ones and update parent state
            onUpdate({ feedbackFiles: [...feedbackFiles, ...processedFiles] });

        } catch (error) {
            console.error("Error processing files:", error);
            alert("Failed to process some files. Check console for details.");
        } finally {
            setIsProcessing(false);
        }
    };

    const removeFile = (id: string) => {
        onUpdate({ feedbackFiles: feedbackFiles.filter((f: any) => f.id !== id) });
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500 max-w-2xl">
            <h3 className="text-xl font-bold text-[#1a365d] border-b-2 border-[#1a365d] inline-block pb-1">
                Feedback Analysis
            </h3>

            <div className="space-y-6">
                <div>
                    <label htmlFor="feedback-upload" className="text-sm font-bold text-gray-700 cursor-pointer">
                        Upload Feedback Charts / Documents
                    </label>
                    <p className="text-[10px] text-gray-400 font-medium mt-1 uppercase tracking-wider">
                        Supported Format: JPG, PNG, PDF *
                    </p>
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
                        id="feedback-upload"
                        name="feedback_upload"
                        type="file"
                        multiple
                        className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={handleFileChange}
                        disabled={isProcessing}
                    />

                    <div className="mb-4 p-4 bg-white rounded-full shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                        <Upload size={24} className={dragActive ? "text-[#4F65F6]" : "text-gray-400"} />
                    </div>

                    <div className="bg-[#4F65F6] text-white px-8 py-2.5 rounded-full font-bold text-xs mb-3 shadow-md group-hover:bg-[#3d50c2] transition-colors">
                        {isProcessing ? "Processing..." : "Browse Files"}
                    </div>

                    <p className="text-xs text-gray-400 text-center font-medium">
                        Drag and drop your files here <br /> JPG, PNG, PDF
                    </p>
                </div>

                {/* File Preview List */}
                {feedbackFiles.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-gray-100">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest pb-2">Attached Feedback Reports</h4>
                        <div className="grid grid-cols-1 gap-3">
                            {feedbackFiles.map((file: any) => (
                                <div key={file.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                                    <div className="flex items-center space-x-3 overflow-hidden">
                                        <div className="p-2 bg-gray-50 rounded-lg">
                                            {file.type === 'pdf' ? (
                                                <FileText size={20} className="text-red-500" />
                                            ) : (
                                                <BarChart3 size={20} className="text-[#3b5998]" />
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                                                {file.name}
                                            </span>
                                            {file.pages && file.type === 'pdf' && (
                                                <span className="text-[10px] text-blue-600 font-bold">
                                                    ✓ Processed ({file.pages.length} pages)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeFile(file.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors z-20"
                                        title="Remove file"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end items-center gap-4 pt-6">
                <button
                    onClick={onSave}
                    className="flex-1 max-w-[180px] bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all active:scale-95 border border-gray-200"
                >
                    <Save size={18} />
                    <span>Save Draft</span>
                </button>
                <button
                    onClick={onFinish}
                    className="flex-1 bg-green-600 text-white px-12 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-md active:scale-95"
                >
                    <span>Finish & Submit</span>
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
}