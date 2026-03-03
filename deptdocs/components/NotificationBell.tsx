'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Bell, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

// --- TYPESCRIPT INTERFACE ---
interface Notification {
    id: string;
    user_id: string;
    title: string;
    message?: string;
    link?: string;
    is_read: boolean;
    created_at: string;
}

export default function NotificationBell() {
    // Apply the interface here instead of <any[]>
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)

    const dropdownRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const setup = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // 1. Initial Fetch (Limit to 30 to keep UI snappy)
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(30)

            if (data) {
                // Cast the incoming data to our interface
                const typedData = data as Notification[];
                setNotifications(typedData)
                // Explicitly type 'n' in the filter function
                setUnreadCount(typedData.filter((n: Notification) => !n.is_read).length)
            }

            // 2. REAL-TIME LISTENER
            const channel = supabase
                .channel('schema-db-changes')
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                    (payload) => {
                        const newNotification = payload.new as Notification;
                        setNotifications(prev => [newNotification, ...prev])
                        setUnreadCount(prev => prev + 1)
                    }
                )
                .subscribe()

            return () => { supabase.removeChannel(channel) }
        }
        setup()
    }, [supabase])

    // Close dropdown when clicking outside of it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Toggle dropdown and mark all as read
    const handleToggleDropdown = async () => {
        setIsOpen(!isOpen)

        // If we are opening it and have unread notifications, mark them as read in DB
        if (!isOpen && unreadCount > 0) {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Optimistic UI update (feels instant to the user)
            setUnreadCount(0)
            // Explicitly type 'n' here as well
            setNotifications(prev => prev.map((n: Notification) => ({ ...n, is_read: true })))

            // Actual DB update
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false)
        }
    }

    // Handle clicking a specific notification
    const handleNotificationClick = (link?: string) => {
        setIsOpen(false) // Close the dropdown
        if (link) {
            router.push(link) // Navigate to the assigned report or draft
        }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleToggleDropdown}
                className={`p-2 rounded-full transition-colors ${isOpen ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
            >
                <Bell size={20} className="text-gray-600" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95">
                    <div className="px-4 py-3 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-bold text-sm text-gray-900">Notifications</h3>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-sm text-gray-400 flex flex-col items-center">
                                <CheckCircle2 size={32} className="text-gray-200 mb-3" />
                                You're all caught up!
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif.link)}
                                    className={`px-4 py-4 border-b border-gray-50 last:border-0 transition-colors ${notif.link ? 'cursor-pointer hover:bg-gray-50' : ''} ${notif.is_read ? 'opacity-75' : 'bg-blue-50/30'}`}
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <p className="text-sm font-bold text-gray-900 leading-tight">{notif.title}</p>
                                        {!notif.is_read && <span className="h-2 w-2 rounded-full bg-blue-500 mt-1 shrink-0"></span>}
                                    </div>

                                    {notif.message && (
                                        <p className="text-xs text-gray-600 mt-1.5 line-clamp-3 leading-relaxed">
                                            {notif.message}
                                        </p>
                                    )}

                                    <p className="text-[10px] text-gray-400 mt-2 font-medium">
                                        {new Date(notif.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
