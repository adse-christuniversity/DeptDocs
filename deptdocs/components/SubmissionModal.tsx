"use client";

import React from 'react';
import { X, AlertCircle, CheckCircle, Save } from 'lucide-react';

interface SubmissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmSubmit: () => void;
    onConfirmSave: () => void;
    reportTitle: string;
}

export default function SubmissionModal({
    isOpen,
    onClose,
    onConfirmSubmit,
    onConfirmSave,
    reportTitle
}: SubmissionModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                        <AlertCircle size={24} className="text-[#3168d8]" />
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirm Submission</h2>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                    Choose how you'd like to proceed with <span className="font-semibold text-gray-700">"{reportTitle || 'this report'}"</span>. You can submit it for administrative review or save it as a draft for later.
                </p>

                <div className="space-y-3">
                    {/* Submit to Admin */}
                    <button
                        onClick={() => {
                            onClose();
                            onConfirmSubmit();
                        }}
                        className="w-full flex items-center justify-between bg-[#112a53] hover:bg-[#1a3a6e] text-white px-6 py-4 rounded-2xl transition-all group shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
                                <CheckCircle size={18} />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-sm">Submit to Admin</p>
                                <p className="text-white/60 text-xs">Finalize and send for review</p>
                            </div>
                        </div>
                        <span className="text-white/40 group-hover:text-white transition-colors text-lg">→</span>
                    </button>

                    {/* Save as Draft */}
                    <button
                        onClick={() => {
                            onClose();
                            onConfirmSave();
                        }}
                        className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 text-gray-700 px-6 py-4 rounded-2xl border border-gray-200 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gray-200 rounded-xl flex items-center justify-center">
                                <Save size={18} className="text-gray-500" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-sm">Save as Draft</p>
                                <p className="text-gray-400 text-xs">Keep editing later</p>
                            </div>
                        </div>
                        <span className="text-gray-300 group-hover:text-gray-500 transition-colors text-lg">→</span>
                    </button>

                    {/* Cancel */}
                    <button
                        onClick={onClose}
                        className="w-full text-center text-sm font-medium text-gray-400 hover:text-gray-600 py-3 transition-colors"
                    >
                        Cancel and Go Back
                    </button>
                </div>
            </div>
        </div>
    );
}
