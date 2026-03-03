"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import {
    Users, Activity, ArrowLeft, Clock, UserCheck, ShieldAlert, FileCheck, ExternalLink, CloudUpload, Loader2, X, MessageSquareX, PlusCircle, Send
} from 'lucide-react';

import LivePreview from '@/components/LivePreview';

// --- TYPESCRIPT INTERFACES ---
interface ReportProfile {
    id: string;
    full_name: string;
    department: string;
}

interface Report {
    id: string;
    title: string;
    status: 'draft' | 'completed';
    owner_id: string;
    updated_at: string;
    data: any; 
    admin_feedback?: string;
    profiles?: ReportProfile;
}

interface UserProfile {
    id: string;
    full_name: string;
    email: string;
    designation: string;
    department: string;
}

interface ActivityLog {
    id: string;
    user_name: string;
    description: string;
    created_at: string;
}

export default function AdminDashboard() {
    const router = useRouter();
    const supabase = createClient();

    // Added 'Drafts' and 'Delegation' tabs with explicit Types
    const [activeTab, setActiveTab] = useState<'Reports' | 'Drafts' | 'Delegation' | 'Feed'>('Reports');
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [completedReports, setCompletedReports] = useState<Report[]>([]);
    const [draftReports, setDraftReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadingId, setUploadingId] = useState<string | null>(null);

    // Modal & Reject States
    const [previewReport, setPreviewReport] = useState<Report | null>(null);
    const [isRejecting, setIsRejecting] = useState(false);
    const [rejectComment, setRejectComment] = useState("");
    const [processingReject, setProcessingReject] = useState(false);

    // Delegation States
    const [assignUser, setAssignUser] = useState("");
    const [assignEvent, setAssignEvent] = useState("");

    useEffect(() => {
        fetchAdminData();
    }, []);

    const fetchAdminData = async () => {
        setLoading(true);
        try {
            const { data: profilesData } = await supabase.from('profiles').select('*');
            if (profilesData) setProfiles(profilesData as UserProfile[]);

            const { data: logsData } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(50);
            if (logsData) setLogs(logsData as ActivityLog[]);

            // Fetch ALL reports, then filter in memory for quick tab switching
            const { data: reportsData } = await supabase
                .from('reports')
                .select('*, profiles!reports_owner_id_fkey(id, full_name, department)')
                .order('updated_at', { ascending: false });

            if (reportsData) {
                // Explicitly cast to Report[] so the compiler knows the structure
                const typedReports = reportsData as Report[];
                setCompletedReports(typedReports.filter((r: Report) => r.status === 'completed'));
                setDraftReports(typedReports.filter((r: Report) => r.status === 'draft'));
            }
        } catch (error) {
            console.error("Error fetching admin data:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(dateString));
    };

    // --- PUSH TO DRIVE ---
    const handlePushToDrive = async (reportId: string) => {
        setUploadingId(reportId);
        try {
            const response = await fetch('/api/drive/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reportId })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to push to Google Drive");

            alert(`Success! Report pushed to Google Drive.\n\nLink: ${data.link}`);
            fetchAdminData();
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setUploadingId(null);
            setPreviewReport(null);
        }
    };

    // --- NEW: REJECT & RETURN TO USER ---
    const handleRejectReport = async () => {
        if (!rejectComment.trim()) {
            alert("Please provide a reason for the revision.");
            return;
        }
        if (!previewReport) return;

        setProcessingReject(true);
        try {
            // 1. Change status back to draft and save the comment
            const { error: updateError } = await supabase
                .from('reports')
                .update({
                    status: 'draft',
                    admin_feedback: rejectComment,
                    updated_at: new Date().toISOString()
                })
                .eq('id', previewReport.id);

            if (updateError) throw updateError;

            // 2. Send Live Notification to the Owner
            await supabase.from('notifications').insert({
                user_id: previewReport.owner_id,
                title: "Report Revision Required",
                message: `Admin requested changes on "${previewReport.title}": ${rejectComment}`,
                link: `/home/new?id=${previewReport.id}`
            });

            alert("Report sent back to user successfully.");
            setPreviewReport(null);
            setIsRejecting(false);
            setRejectComment("");
            fetchAdminData();

        } catch (error: any) {
            alert(`Failed to return report: ${error.message}`);
        } finally {
            setProcessingReject(false);
        }
    };

    // --- NEW: DELEGATE REPORT ---
    const handleDelegateReport = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // 1. Create a blank draft assigned to the user
            const { data: newReport, error } = await supabase
                .from('reports')
                .insert([{
                    owner_id: assignUser,
                    title: assignEvent,
                    status: 'draft',
                    data: { activityTitle: assignEvent } // Pre-fill the form title
                }])
                .select('id')
                .single();

            if (error) throw error;

            // 2. Notify the user of the assignment
            await supabase.from('notifications').insert({
                user_id: assignUser,
                title: "New Report Assigned",
                message: `You have been assigned to prepare the report for: ${assignEvent}`,
                link: `/home/new?id=${newReport.id}`
            });

            alert("Task delegated successfully!");
            setAssignEvent("");
            fetchAdminData();
        } catch (error: any) {
            alert(`Failed to assign report: ${error.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-[#F4F7FE] font-sans text-black relative overflow-x-hidden">
            <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-40">
                <div className="flex items-center space-x-6">
                    <button onClick={() => router.push('/home')} className="p-2 bg-gray-50 text-gray-500 rounded-full hover:bg-gray-200">
                        <ArrowLeft size={20} />
                    </button>
                    <Image src="/christ-logo.png" alt="Christ University" width={140} height={40} className="object-contain" />
                </div>
                <div className="flex items-center space-x-3">
                    <ShieldAlert size={20} className="text-red-500" />
                    <h1 className="text-sm font-bold text-gray-800 tracking-wide uppercase">Department Admin</h1>
                </div>
            </header>

            <main className="max-w-7xl mx-auto pt-8 px-6 pb-20">
                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                        <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center text-orange-500">
                            <FileCheck size={28} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-bold">Pending Review</p>
                            <h2 className="text-3xl font-black text-gray-900">{completedReports.length}</h2>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                        <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-[#3b5998]">
                            <Clock size={28} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-bold">Active Drafts</p>
                            <h2 className="text-3xl font-black text-gray-900">{draftReports.length}</h2>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                        <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                            <Users size={28} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-bold">Total Staff</p>
                            <h2 className="text-3xl font-black text-gray-900">{profiles.length}</h2>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex space-x-2 mb-6 border-b border-gray-200 overflow-x-auto">
                    {['Reports', 'Drafts', 'Delegation', 'Feed'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'border-[#3b5998] text-[#3b5998]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            {tab === 'Reports' ? 'Review Queue' : tab === 'Delegation' ? 'Assign Tasks' : `Live ${tab}`}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT COLUMN: Main Content Area */}
                    <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[600px]">

                        {/* VIEW 1: REPORT REVIEW QUEUE */}
                        {activeTab === 'Reports' && (
                            <div className="flex-1 flex flex-col">
                                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <FileCheck size={20} className="text-[#3b5998]" /> Awaiting Admin Approval
                                    </h2>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                    {loading ? (
                                        <p className="text-center text-gray-400 font-medium py-10">Loading...</p>
                                    ) : completedReports.length === 0 ? (
                                        <p className="text-center text-gray-400 font-medium py-10">Queue is empty. Great job!</p>
                                    ) : (
                                        completedReports.map((report) => (
                                            <div key={report.id} className="border border-gray-200 rounded-2xl p-5 hover:border-[#3b5998] transition-colors flex justify-between items-center">
                                                <div>
                                                    <h3 className="font-bold text-lg text-gray-900">{report.title}</h3>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        Submitted by <span className="font-bold text-gray-700">{report.profiles?.full_name || 'Unknown'}</span> • {formatTime(report.updated_at)}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setPreviewReport(report);
                                                        setIsRejecting(false);
                                                    }}
                                                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 flex items-center gap-2 transition-colors"
                                                >
                                                    <ExternalLink size={16} /> Review
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* VIEW 2: ACTIVE DRAFTS */}
                        {activeTab === 'Drafts' && (
                            <div className="flex-1 flex flex-col">
                                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <Clock size={20} className="text-orange-500" /> Work in Progress
                                    </h2>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                    {draftReports.length === 0 ? (
                                        <p className="text-center text-gray-400 font-medium py-10">No active drafts found.</p>
                                    ) : (
                                        draftReports.map((report) => (
                                            <div key={report.id} className="border border-gray-100 rounded-2xl p-5 bg-gray-50/30 flex justify-between items-center">
                                                <div>
                                                    <h3 className="font-bold text-gray-900">{report.title}</h3>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Owner: {report.profiles?.full_name || 'Unknown'} • Last edit: {formatTime(report.updated_at)}
                                                    </p>
                                                </div>
                                                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-[10px] font-black uppercase tracking-wider">Draft</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* VIEW 3: TASK DELEGATION */}
                        {activeTab === 'Delegation' && (
                            <div className="flex-1 p-8">
                                <h2 className="text-2xl font-black text-[#112a53] mb-2 flex items-center gap-2">
                                    <PlusCircle size={24} className="text-[#3b5998]" /> Assign a Report
                                </h2>
                                <p className="text-gray-500 mb-8 text-sm">Create a draft and assign it directly to a faculty member's dashboard.</p>

                                <form onSubmit={handleDelegateReport} className="space-y-6 max-w-lg">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Select Faculty / Organizer</label>
                                        <select
                                            required
                                            value={assignUser}
                                            onChange={(e) => setAssignUser(e.target.value)}
                                            className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-[#3b5998]"
                                        >
                                            <option value="">-- Choose User --</option>
                                            {profiles.map(p => (
                                                <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Event / Activity Title</label>
                                        <input
                                            required
                                            type="text"
                                            value={assignEvent}
                                            onChange={(e) => setAssignEvent(e.target.value)}
                                            placeholder="e.g., Annual Tech Symposium 2026"
                                            className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-[#3b5998]"
                                        />
                                    </div>
                                    <button type="submit" className="w-full bg-[#3b5998] text-white py-3 rounded-xl font-bold hover:bg-[#2d4373] transition-colors flex items-center justify-center gap-2">
                                        <Send size={18} /> Assign Task
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* VIEW 4: ACTIVITY FEED */}
                        {activeTab === 'Feed' && (
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {logs.map((log) => (
                                    <div key={log.id} className="flex gap-4">
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center shrink-0 border border-gray-200">
                                            <Activity size={18} className="text-gray-500" />
                                        </div>
                                        <div className="pt-1">
                                            <p className="text-sm text-gray-800"><span className="font-bold text-[#112a53]">{log.user_name}</span> {log.description}</p>
                                            <p className="text-xs text-gray-400 mt-1">{formatTime(log.created_at)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: User Directory */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[600px]">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Users size={20} className="text-[#3b5998]" /> Staff Directory
                            </h2>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {profiles.map(p => (
                                <div key={p.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                                    <div className="w-10 h-10 bg-[#112a53] rounded-full text-white flex items-center justify-center font-bold text-sm shrink-0">
                                        {p.full_name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="overflow-hidden">
                                        <h4 className="font-bold text-sm text-gray-900 truncate">{p.full_name}</h4>
                                        <p className="text-xs text-gray-500 truncate">{p.designation}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {/* --- PDF PREVIEW MODAL --- */}
            {previewReport && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">

                        {/* Modal Header */}
                        <div className="flex justify-between items-start p-6 border-b border-gray-100 bg-gray-50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{previewReport.title}</h2>
                                <p className="text-sm text-gray-500 font-medium mt-1">
                                    Author: {previewReport.profiles?.full_name} • Dept: {previewReport.profiles?.department}
                                </p>
                            </div>

                            <div className="flex flex-col items-end gap-3">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setIsRejecting(!isRejecting)}
                                        className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors border ${isRejecting ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-red-600 border-red-100 hover:bg-red-50'}`}
                                    >
                                        <MessageSquareX size={18} /> Request Revision
                                    </button>

                                    <button
                                        onClick={() => handlePushToDrive(previewReport.id)}
                                        disabled={uploadingId === previewReport.id || isRejecting}
                                        className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
                                    >
                                        {uploadingId === previewReport.id ? (
                                            <><Loader2 size={18} className="animate-spin" /> Uploading...</>
                                        ) : (
                                            <><CloudUpload size={18} /> Approve & Push</>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => { setPreviewReport(null); setIsRejecting(false); }}
                                        className="w-10 h-10 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors ml-2"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* REJECT REASON INPUT */}
                                {isRejecting && (
                                    <div className="w-[400px] bg-white border border-red-100 rounded-xl shadow-lg p-4 animate-in slide-in-from-top-2 relative z-50">
                                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">What needs to be fixed?</label>
                                        <textarea
                                            autoFocus
                                            rows={3}
                                            className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 resize-none mb-3"
                                            placeholder="e.g. Missing signatures on page 3, incorrect event date..."
                                            value={rejectComment}
                                            onChange={(e) => setRejectComment(e.target.value)}
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setIsRejecting(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                                            <button
                                                onClick={handleRejectReport}
                                                disabled={processingReject}
                                                className="px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {processingReject ? <Loader2 size={14} className="animate-spin" /> : "Return to Sender"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Body: The PDF Viewer */}
                        <div className={`flex-1 bg-gray-100 p-6 overflow-hidden transition-opacity ${isRejecting ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="w-full h-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">
                                <LivePreview data={previewReport.data} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
