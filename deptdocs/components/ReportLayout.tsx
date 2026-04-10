"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
    Home, FolderOpen, Save, UserPlus, Download, Menu, Eye, UserCircle, X, AlertCircle, FileText, File as FileWord, CheckCircle, User, Settings as SettingsIcon, LogOut
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';

// --- UPDATED IMPORTS FOR ROOT COMPONENTS ---
import LivePreview from './LivePreview';
import { ReportPDF } from './ReportPDF';
import ManageAccessModal from './ManageAccessModal';
import NotificationBell from '@/components/NotificationBell';
import { logActivity } from '@/lib/logger';
import { createClient } from '@/utils/supabase/client';

interface Props {
    children: React.ReactNode;
    activeSection: string;
    onSectionChange: (name: string) => void;
    sections: any[];
    previewData: any;
    onSaveDraft?: (data: any) => void;
    onMarkCompleted?: (data: any) => void;
    onRequestSubmit?: () => void;
    onRequestSave?: () => void;
    reportId?: string | null;

    // NEW PROPS FOR TOGGLE TABS (File | Insert)
    viewMode?: 'editor' | 'assets';
    onViewModeChange?: (mode: 'editor' | 'assets') => void;
}

export default function ReportLayout({
    children,
    activeSection,
    onSectionChange,
    sections,
    previewData,
    onSaveDraft,
    onMarkCompleted,
    onRequestSubmit,
    onRequestSave,
    reportId,
    viewMode = 'editor',
    onViewModeChange
}: Props) {
    const router = useRouter();
    const supabase = createClient();

    const [showCollabModal, setShowCollabModal] = useState(false);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [user, setUser] = useState<any>(null);

    // Fetch user on mount for logging
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, []);

    // Action Handlers with Logging
    const handleActionWithLog = async (action: 'SAVE' | 'COMPLETE') => {
        if (!user) return;
        const title = previewData.activityTitle?.trim() || "Untitled Activity Report";

        try {
            if (action === 'SAVE' && onSaveDraft) {
                await onSaveDraft(previewData);
                await logActivity('REPORT_SAVED', `Saved draft: ${title}`, reportId || undefined);
            } else if (action === 'COMPLETE' && onMarkCompleted) {
                await onMarkCompleted(previewData);
                await logActivity('REPORT_COMPLETED', `Report finalized: ${title}`, reportId || undefined);
            }
        } catch (err) {
            console.error("Action failed:", err);
        }
    };

    const downloadAsPDF = async () => {
        setIsDownloading(true);
        try {
            const blob = await pdf(<ReportPDF data={previewData} />).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${previewData.activityTitle ? previewData.activityTitle.replace(/\s+/g, '_') : 'Activity'}_Report.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to generate PDF:", error);
        } finally {
            setIsDownloading(false);
            setShowDownloadMenu(false);
        }
    };

    return (
        <div className="flex h-screen bg-[#F4F7FE] text-black overflow-hidden font-sans">

            {/* COLUMN 1: UTILITY BAR */}
            <aside className="w-16 bg-[#0B2244] flex flex-col items-center py-6 shrink-0 space-y-8 border-r border-white/5 relative z-50">
                <button className="text-white/60 hover:text-white transition-colors"><Menu size={24} /></button>
                <button onClick={() => router.push('/home')} className="text-white/60 hover:text-white transition-colors" title="Home"><Home size={24} /></button>
                <button onClick={() => router.push('/home/open')} className="text-white/60 hover:text-white transition-colors" title="Reports"><FolderOpen size={24} /></button>

                {/* Logged Action Buttons */}
                <button onClick={() => onRequestSave ? onRequestSave() : handleActionWithLog('SAVE')} className="text-white/60 hover:text-white transition-colors" title="Save Draft"><Save size={24} /></button>
                <button onClick={() => onRequestSubmit ? onRequestSubmit() : onMarkCompleted && onMarkCompleted(previewData)} className="text-white/60 hover:text-green-400 transition-colors" title="Submit Report"><CheckCircle size={24} /></button>
                <button onClick={() => setShowCollabModal(true)} className="text-white/60 hover:text-white transition-colors" title="Collab"><UserPlus size={24} /></button>

                <div className="relative flex flex-col items-center">
                    <button onClick={() => setShowDownloadMenu(!showDownloadMenu)} className="text-white/60 hover:text-white transition-colors" title="Download"><Download size={24} /></button>
                    {showDownloadMenu && (
                        <div className="absolute left-14 top-0 bg-white shadow-xl rounded-xl py-2 w-48 border border-gray-100 animate-in fade-in zoom-in-95">
                            <button onClick={downloadAsPDF} disabled={isDownloading} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3">
                                <FileText size={16} className="text-red-500" />
                                <span className="font-medium">{isDownloading ? "Generating..." : "Download PDF"}</span>
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* COLUMN 2: SECTION NAVIGATION */}
            <aside className="w-64 bg-[#1a365d] text-white flex flex-col shrink-0">
                <div className="p-6 border-b border-white/10 flex justify-center">
                    <Image src="/christ-logo-white.png" alt="Christ University" width={150} height={40} className="brightness-0 invert object-contain" />
                </div>
                <nav className="flex-1 py-4 overflow-y-auto">
                    {sections.map((sec) => (
                        <button
                            key={sec.name}
                            onClick={() => onSectionChange(sec.name)}
                            className={`w-full flex items-center space-x-3 px-6 py-4 transition-all text-xs font-medium text-left ${activeSection === sec.name ? 'bg-[#3b5998] border-l-4 border-white' : 'hover:bg-white/5 opacity-60'}`}
                        >
                            <sec.icon size={16} />
                            <span>{sec.name}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            {/* RIGHT AREA: HEADER + CONTENT */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-14 bg-white border-b flex items-center justify-between px-8 shrink-0 relative z-40">
                    <h2 className="text-sm font-bold text-gray-800 uppercase tracking-tight">
                        {previewData.activityTitle || "Untitled Activity Report"}
                    </h2>
                    <div className="flex items-center space-x-4">
                        <button className="flex items-center space-x-2 bg-gray-100 px-4 py-1.5 rounded-full text-[10px] font-bold text-gray-500 hover:bg-gray-200">
                            <span>LIVE PREVIEW</span> <Eye size={14} />
                        </button>

                        <NotificationBell />

                        <div className="relative">
                            <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center border border-gray-300">
                                <UserCircle size={20} className="text-gray-500" />
                            </button>

                            {/* --- RESTORED PROFILE DROPDOWN --- */}
                            {isProfileOpen && (
                                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                                    <button onClick={() => router.push('/settings')} className="w-full text-left px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                                        <User size={18} className="text-gray-400" /> Profile
                                    </button>
                                    <button onClick={() => router.push('/settings')} className="w-full text-left px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                                        <SettingsIcon size={18} className="text-gray-400" /> Settings
                                    </button>
                                    <button onClick={() => router.push('/settings')} className="w-full text-left px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                                        <UserPlus size={18} className="text-gray-400" /> Requests
                                    </button>

                                    <div className="h-px bg-gray-100 my-1 mx-2"></div>

                                    <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="w-full text-left px-5 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors">
                                        <LogOut size={18} /> Log Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-6 flex space-x-6 overflow-hidden">

                    {/* LEFT PANE: FORM & ASSET EDITOR */}
                    <div className="w-[450px] bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">

                        {/* --- CORRECTED TOGGLE HEADER --- */}
                        {onViewModeChange && (
                            <div className="flex items-center gap-2 p-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                                {/* FILE -> Opens Editor */}
                                <button
                                    onClick={() => onViewModeChange('editor')}
                                    className={`px-6 py-2 rounded-full font-bold text-xs transition-colors ${viewMode === 'editor' ? 'bg-[#3b5998] text-white shadow-sm' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                                >
                                    File
                                </button>
                                {/* INSERT -> Opens Assets */}
                                <button
                                    onClick={() => onViewModeChange('assets')}
                                    className={`px-6 py-2 rounded-full font-bold text-xs transition-colors ${viewMode === 'assets' ? 'bg-[#3b5998] text-white shadow-sm' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                                >
                                    Insert
                                </button>
                            </div>
                        )}

                        {/* CONTENT AREA */}
                        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
                            {children}
                        </div>
                    </div>

                    {/* RIGHT PANE: LIVE PREVIEW */}
                    <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col">
                        <div className="flex-1 overflow-hidden rounded-xl border border-gray-200">
                            <LivePreview data={previewData} />
                        </div>
                    </div>
                </main>
            </div>

            <ManageAccessModal isOpen={showCollabModal} onClose={() => setShowCollabModal(false)} reportId={reportId} />

        </div>
    );
}