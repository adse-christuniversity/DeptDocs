"use client";

import React, { useState, useRef } from 'react';
import { ChevronRight, CheckCircle2, Upload } from 'lucide-react';

// Adjust this import path based on your Next.js project structure
import { createClient } from '@/utils/supabase/client';

export default function PreparedBy({ data, onUpdate, onNext }: any) {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize organizersList if not exists, focusing on the first element for this single-step form
    const organizers = data.organizersList || [
        { name: '', designation: '', signatureImage: '' }
    ];

    const updateOrganizer = (field: string, value: string) => {
        const updated = [...organizers];
        updated[0] = { ...updated[0], [field]: value };
        onUpdate({ organizersList: updated });
    };

    // Function to handle "Use saved info from profile" with actual Supabase DB fetch
    const handleToggleProfile = async (checked: boolean) => {
        if (checked) {
            setLoading(true);

            try {
                const supabase = createClient();

                // 1. Get the current authenticated user
                const { data: { user }, error: authError } = await supabase.auth.getUser();

                if (authError || !user) {
                    throw new Error("User not authenticated");
                }

                // 2. Fetch the profile data matching your profiles table schema
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('full_name, designation, signature_url')
                    .eq('id', user.id)
                    .single();

                if (profileError) {
                    throw profileError;
                }

                // 3. Update the state with actual database values
                const updated = [...organizers];
                updated[0] = {
                    name: profile.full_name || '',
                    designation: profile.designation || '',
                    signatureImage: profile.signature_url || ''
                };

                onUpdate({
                    organizersList: updated,
                    useProfile: true
                });

            } catch (error) {
                console.error("Error fetching profile data:", error);
                // Revert the checkbox if the fetch fails so the user isn't stuck
                onUpdate({ useProfile: false });
            } finally {
                setLoading(false);
            }
        } else {
            // Clear the fields when unchecked
            const updated = [...organizers];
            updated[0] = { name: '', designation: '', signatureImage: '' };
            onUpdate({
                organizersList: updated,
                useProfile: false
            });
        }
    };

    const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadError(null);

        try {
            const supabase = createClient();

            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) throw new Error("User not authenticated");

            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}-${Math.random()}.${fileExt}`;

            const { error: uploadErr } = await supabase.storage
                .from('signatures')
                .upload(filePath, file);

            if (uploadErr) throw uploadErr;

            const { data: { publicUrl } } = supabase.storage
                .from('signatures')
                .getPublicUrl(filePath);

            const updated = [...organizers];
            updated[0] = { ...updated[0], signatureImage: publicUrl };
            onUpdate({ organizersList: updated });
        } catch (err: any) {
            console.error("Signature upload error:", err);
            setUploadError(err.message || "Failed to upload signature.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveSignature = () => {
        const updated = [...organizers];
        updated[0] = { ...updated[0], signatureImage: '' };
        onUpdate({ organizersList: updated });
    };

    const handleToggleCollaborators = (checked: boolean) => {
        onUpdate({ useCollaborators: checked });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <h3 className="text-xl font-bold text-[#1a365d] border-b-2 border-[#1a365d] inline-block pb-1">
                Report Prepared By
            </h3>

            <div className="space-y-6">
                {/* Name Input */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Name</label>
                    <input
                        type="text"
                        value={organizers[0].name || ''}
                        onChange={(e) => updateOrganizer('name', e.target.value)}
                        className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-[#3b5998]"
                        disabled={loading}
                    />
                </div>

                {/* Designation Input */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Designation</label>
                    <input
                        type="text"
                        value={organizers[0].designation || ''}
                        onChange={(e) => updateOrganizer('designation', e.target.value)}
                        className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-[#3b5998]"
                        disabled={loading}
                    />
                </div>

                {/* Digital Signature Display */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Digital Signature</label>
                    <div
                        onClick={() => !uploading && !organizers[0].signatureImage && fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all ${organizers[0].signatureImage ? 'border-green-300 bg-green-50/30' : 'border-gray-200 bg-gray-50/30 cursor-pointer hover:border-[#3b5998] hover:bg-blue-50/40'}`}
                    >
                        <input
                            type="file"
                            hidden
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleSignatureUpload}
                        />

                        {organizers[0].signatureImage ? (
                            <div className="flex flex-col items-center text-[#3b5998]">
                                <CheckCircle2 size={32} className="mb-2" />
                                <span className="text-xs font-bold uppercase tracking-wider">Signature Loaded</span>
                                <button
                                    type="button"
                                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleRemoveSignature(); }}
                                    className="mt-2 text-xs text-red-500 hover:underline font-bold"
                                >
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <button
                                    type="button"
                                    disabled={uploading}
                                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                    className="bg-[#4F65F6] text-white px-6 py-2 rounded-full font-bold text-xs mb-4 hover:bg-[#3b5998] transition-colors disabled:opacity-60"
                                >
                                    {uploading ? "Uploading..." : "Upload"}
                                </button>
                                <p className="text-xs text-gray-400 text-center">
                                    Click to browse or <br /> drag and drop your files
                                </p>
                            </div>
                        )}
                    </div>
                    {uploadError && (
                        <p className="text-xs text-red-500 font-medium">{uploadError}</p>
                    )}
                </div>

                {/* Checkbox Options */}
                <div className="space-y-4 pt-4 border-t border-gray-100">
                    <label className="flex items-center space-x-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={data.useProfile || false}
                            onChange={(e) => handleToggleProfile(e.target.checked)}
                            disabled={loading}
                            className="w-5 h-5 accent-[#3b5998] cursor-pointer disabled:opacity-50"
                        />
                        <span className="text-sm font-medium text-gray-600 group-hover:text-black">
                            {loading ? "Fetching Profile..." : "Use saved info from profile"}
                        </span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={data.useCollaborators || false}
                            onChange={(e) => handleToggleCollaborators(e.target.checked)}
                            className="w-5 h-5 accent-[#3b5998] cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-600 group-hover:text-black">
                            Add Collaborators Details
                        </span>
                    </label>
                </div>
            </div>

            <div className="flex justify-end pt-6">
                <button
                    onClick={onNext}
                    className="bg-[#3b5998] text-white px-10 py-3 rounded-lg font-bold flex items-center space-x-2 shadow-lg hover:shadow-xl transition-all"
                >
                    <span>Next</span>
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
}