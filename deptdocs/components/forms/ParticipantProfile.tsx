"use client";

import React from 'react';
import { PlusCircle, Trash2, ChevronRight, Users } from 'lucide-react';

const PARTICIPANT_TYPES = ["Faculty", "Student", "Research Scholar", "Others"];

export default function ParticipantProfile({ data, onUpdate, onNext }: any) {
    // Initialize with one group if empty
    const profiles = data.participantProfiles || [
        { id: Date.now(), type: '', count: '' }
    ];

    const updateProfile = (id: number, field: string, value: string) => {
        const updated = profiles.map((p: any) =>
            p.id === id ? { ...p, [field]: value } : p
        );
        onUpdate({ participantProfiles: updated });
    };

    const addProfile = () => {
        onUpdate({
            participantProfiles: [
                ...profiles,
                { id: Date.now(), type: '', count: '' }
            ]
        });
    };

    const removeProfile = (id: number) => {
        if (profiles.length > 1) {
            onUpdate({ participantProfiles: profiles.filter((p: any) => p.id !== id) });
        }
    };

    return (
        <div className="space-y-10 animate-in slide-in-from-right duration-500">
            <h3 className="text-xl font-bold text-[#1a365d] mb-6 border-b-2 border-[#1a365d] inline-block pb-1">
                Participant Profile
            </h3>

            <div className="space-y-8">
                {profiles.map((profile: any, index: number) => (
                    <div key={profile.id} className="relative p-6 border border-gray-100 rounded-xl bg-gray-50/50">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="font-bold text-gray-500 text-sm flex items-center gap-2">
                                Profile {index + 1}:
                            </h4>
                            {profiles.length > 1 && (
                                <button
                                    onClick={() => removeProfile(profile.id)}
                                    className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Type of Participants</label>
                                <select
                                    value={profile.type}
                                    onChange={(e) => updateProfile(profile.id, 'type', e.target.value)}
                                    className="w-full p-3 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#3b5998] appearance-none cursor-pointer"
                                >
                                    <option value="">Select Type</option>
                                    {PARTICIPANT_TYPES.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">No. of Participants</label>
                                <input
                                    type="number"
                                    placeholder="Enter count"
                                    value={profile.count}
                                    onChange={(e) => updateProfile(profile.id, 'count', e.target.value)}
                                    className="w-full p-3 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#3b5998]"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Action Footer */}
            <div className="mt-10 flex justify-between items-center pt-6 border-t border-gray-100">
                <button
                    onClick={addProfile}
                    className="flex items-center gap-2 bg-[#3b5998] text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-md hover:bg-[#2d4373] transition-all"
                >
                    <PlusCircle size={18} />
                    Add Profile
                </button>

                <button
                    onClick={onNext}
                    className="bg-[#1a365d] text-white px-10 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 transition-all"
                >
                    <span>Next</span>
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
}