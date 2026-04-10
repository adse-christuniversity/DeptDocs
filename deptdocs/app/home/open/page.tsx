"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
    Home, FilePlus, FolderOpen, Search, UserCircle, User, Settings as SettingsIcon, LogOut,
    FileText, Clock, Edit3, Trash2, CheckCircle, Loader2, AlertCircle, Menu
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import ManageAccessModal from '@/components/ManageAccessModal';

export default function OpenFileDashboard() {
    const router = useRouter();
    const supabase = createClient();

    const [activeTab, setActiveTab] = useState<'Recent' | 'Drafts' | 'Completed' | 'Shared'>('Recent');
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const tabs = ['Recent', 'Drafts', 'Completed', 'Shared'];

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/');
                return;
            }

            setUserId(user.id);

            // 1. Fetch reports owned by the current user (Using correct 'owner_id' column)
            const { data: ownedReports, error: ownedError } = await supabase
                .from('reports')
                .select('*')
                .eq('owner_id', user.id)
                .order('updated_at', { ascending: false });

            if (ownedError) console.error("Error fetching owned reports:", ownedError);

            // 2. Fetch shared reports (Filtering for status is removed so all shared reports show up instantly)
            const { data: sharedData, error: sharedError } = await supabase
                .from('collaborators')
                .select('reports(*)')
                .eq('user_id', user.id);

            if (sharedError) console.error("Error fetching shared reports:", sharedError);

            // Safely extract the reports from the joined collaborators query
            let sharedReports = [];
            if (sharedData) {
                sharedReports = sharedData.map((item: any) => {
                    // Supabase joins sometimes return an array or a single object depending on the relationship setup
                    return Array.isArray(item.reports) ? item.reports[0] : item.reports;
                }).filter(Boolean); // Filter out any nulls if a report was deleted
            }

            // Combine owned and shared reports
            const allReports = [...(ownedReports || []), ...sharedReports];

            // Deduplicate just in case (if a user is somehow owner and collaborator)
            const uniqueReports = Array.from(new Map(allReports.map(r => [r.id, r])).values());

            // Sort everything by updated_at descending (newest first)
            uniqueReports.sort((a, b) => new Date(b?.updated_at || 0).getTime() - new Date(a?.updated_at || 0).getTime());

            setReports(uniqueReports);
        } catch (err) {
            console.error("Critical error in fetchReports:", err);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredReports = () => {
        if (activeTab === 'Recent') return reports.slice(0, 10);
        if (activeTab === 'Drafts') return reports.filter(r => r.status === 'draft');
        if (activeTab === 'Completed') return reports.filter(r => r.status === 'completed');
        // Logic updated to use 'owner_id' as defined in your schema
        if (activeTab === 'Shared') return reports.filter(r => r.owner_id !== userId);
        return reports;
    };

    const filteredReports = getFilteredReports();

    return (
        <div className="flex h-screen bg-[#F4F7FE] text-black font-sans overflow-hidden">

            {/* SIDEBAR - Aligned with /home */}
            <aside className="w-64 bg-[#112a53] text-white flex flex-col shrink-0 relative z-50">
                <div className="p-6 flex items-center justify-center border-b border-white/10">
                    <Image
                        src="/christ-logo-white.png"
                        alt="Christ University"
                        width={160}
                        height={50}
                        className="brightness-0 invert object-contain"
                    />
                </div>

                <nav className="flex-1 mt-6 px-4 space-y-2">
                    <button onClick={() => router.push('/home')} className="w-full flex items-center space-x-4 px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors">
                        <Home size={20} />
                        <span>Home</span>
                    </button>
                    <button onClick={() => router.push('/home/new')} className="w-full flex items-center space-x-4 px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors">
                        <FilePlus size={20} />
                        <span>New</span>
                    </button>
                    <button className="w-full flex items-center space-x-4 px-4 py-3 rounded-xl bg-[#3168d8] text-white shadow-md transition-colors">
                        <FolderOpen size={20} />
                        <span>Open</span>
                    </button>
                </nav>
            </aside>

            {/* MAIN CONTENT Area */}
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Header aligned with /home */}
                <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-10 shrink-0 relative z-40">
                    <div className="flex flex-col">
                        <h2 className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Department of AI & Data Science</h2>
                        <h1 className="text-2xl font-black text-[#112a53]">Document Library</h1>
                    </div>

                    <div className="flex items-center space-x-6">
                        <button className="text-gray-400 hover:text-gray-900 transition-colors">
                            <Search size={22} />
                        </button>

                        <div className="relative">
                            <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="text-gray-400 hover:text-gray-900 transition-colors">
                                <UserCircle size={28} />
                            </button>

                            {isProfileOpen && (
                                <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 animate-in fade-in zoom-in-95 z-50">
                                    <button onClick={() => router.push('/settings')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm font-medium flex items-center gap-2"><User size={14} /> Profile</button>
                                    <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="w-full text-left px-4 py-2 hover:bg-red-50 text-sm font-medium text-red-600 flex items-center gap-2"><LogOut size={14} /> Log Out</button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-8 overflow-hidden flex flex-col">

                    {/* Centered Tab Navigation */}
                    <div className="flex justify-center mb-8 shrink-0">
                        <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex gap-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab ? 'bg-[#3168d8] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Report Table Area */}
                    <div className="flex-1 bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">

                        <div className="grid grid-cols-4 bg-gray-50/50 border-b border-gray-100 px-8 py-5 shrink-0">
                            <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Report Name</div>
                            <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Last Modified</div>
                            <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Current Status</div>
                            <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Collaborators</div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <Loader2 size={32} className="animate-spin text-[#3168d8] mb-4" />
                                    <p className="font-bold text-xs uppercase tracking-widest">Fetching documents...</p>
                                </div>
                            ) : filteredReports.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                                    <FolderOpen size={48} className="opacity-20" />
                                    <p className="font-bold text-xs uppercase tracking-widest">No reports found in {activeTab}</p>
                                </div>
                            ) : (
                                filteredReports.map((file) => (
                                    <div
                                        key={file.id}
                                        onClick={() => router.push(`/home/new?id=${file.id}`)}
                                        className="grid grid-cols-4 items-center border-b border-gray-50 px-8 py-5 hover:bg-blue-50/30 transition-all group cursor-pointer"
                                    >
                                        <div className="text-sm font-bold text-gray-900 flex items-center space-x-4">
                                            <div className="p-2 bg-blue-50 text-[#3168d8] rounded-lg group-hover:bg-[#3168d8] group-hover:text-white transition-colors">
                                                <FileText size={18} />
                                            </div>
                                            <span className="truncate pr-4">{file.title || "Untitled Report"}</span>
                                        </div>
                                        <div className="text-xs font-medium text-gray-500 flex items-center gap-2">
                                            <Clock size={14} />
                                            {new Date(file.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                        <div>
                                            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter flex w-fit items-center gap-1 ${file.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {file.status === 'completed' ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                                                {file.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-center">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedReportId(file.id);
                                                    setIsAccessModalOpen(true);
                                                }}
                                                className="text-[10px] font-bold text-[#3168d8] bg-blue-100/50 hover:bg-[#3168d8] hover:text-white px-5 py-2 rounded-full transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                                            >
                                                Manage Access
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </main>
            </div>

            <ManageAccessModal
                isOpen={isAccessModalOpen}
                onClose={() => {
                    setIsAccessModalOpen(false);
                    setSelectedReportId(null);
                }}
                reportId={selectedReportId}
            />
        </div>
    );
}
