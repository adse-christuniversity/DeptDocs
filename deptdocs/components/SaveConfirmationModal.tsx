"use client";

import React from 'react';
import { X, Save, AlertCircle } from 'lucide-react';

interface SaveConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    reportTitle: string;
}

export default function SaveConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    reportTitle
}: SaveConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                        <Save size={24} className="text-[#3168d8]" />
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">Save Draft?</h2>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                    Are you sure you want to save the current progress of <span className="font-semibold text-gray-700">"{reportTitle || 'this report'}"</span> as a draft?
                </p>

                <div className="space-y-3">
                    {/* Confirm Save */}
                    <button
                        onClick={() => {
                            onClose();
                            onConfirm();
                        }}
                        className="w-full flex items-center justify-center gap-3 bg-[#112a53] hover:bg-[#1a3a6e] text-white px-6 py-4 rounded-2xl transition-all group shadow-sm"
                    >
                        <Save size={18} />
                        <span className="font-bold text-sm">Yes, Save Draft</span>
                    </button>

                    {/* Cancel */}
                    <button
                        onClick={onClose}
                        className="w-full text-center text-sm font-medium text-gray-400 hover:text-gray-600 py-3 transition-colors border-2 border-transparent hover:border-gray-100 rounded-2xl"
                    >
                        Cancel and Go Back
                    </button>
                </div>
            </div>
        </div>
    );
}
