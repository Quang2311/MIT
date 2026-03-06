import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TopHeaderProps {
    onOpenOptimization?: () => void;
    onOpenHistory?: () => void;
}

interface Notification {
    id: string;
    title: string;
    message: string | null;
    is_read: boolean;
    created_at: string;
}

export const TopHeader = (_props: TopHeaderProps) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        if (showDropdown) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showDropdown]);

    // Fetch unread count on mount
    useEffect(() => {
        const fetchUnreadCount = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const { count, error } = await (supabase as any)
                    .from("notifications")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", user.id)
                    .eq("is_read", false);
                if (!error && count !== null) setUnreadCount(count);
            } catch (err) {
                console.error("Notification count error:", err);
            }
        };
        fetchUnreadCount();
    }, []);

    // Fetch notifications list when dropdown opens
    const handleBellClick = async () => {
        setShowDropdown((prev) => !prev);
        if (!showDropdown) {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const { data, error } = await (supabase as any)
                    .from("notifications")
                    .select("id, title, message, is_read, created_at")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false })
                    .limit(10);
                if (data && !error) setNotifications(data as unknown as Notification[]);
            } catch (err) {
                console.error("Notification fetch error:", err);
            }
        }
    };

    // Mark all as read
    const handleMarkAllRead = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            await (supabase as any)
                .from("notifications")
                .update({ is_read: true })
                .eq("user_id", user.id)
                .eq("is_read", false);
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error("Mark read error:", err);
        }
    };

    // Format relative time
    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Vừa xong";
        if (mins < 60) return `${mins} phút trước`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs} giờ trước`;
        return `${Math.floor(hrs / 24)} ngày trước`;
    };

    return (
        <header className="top-header">
            {/* Notification bell with dropdown */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={handleBellClick}
                    className="relative w-9 h-9 rounded-xl bg-white/70 border border-slate-200/60 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                >
                    <span className="material-symbols-outlined text-[20px]">notifications</span>
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </button>

                {/* Dropdown */}
                {showDropdown && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-100 z-50 overflow-hidden anim-slide-up">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                            <h4 className="text-sm font-bold text-slate-800">Thông báo</h4>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
                                >
                                    Đánh dấu đã đọc
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div className="max-h-72 overflow-y-auto">
                            {notifications.length > 0 ? (
                                notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!n.is_read ? "bg-indigo-50/40" : ""}`}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            {!n.is_read && (
                                                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-[13px] ${!n.is_read ? "font-bold text-slate-800" : "font-medium text-slate-600"}`}>
                                                    {n.title}
                                                </p>
                                                {n.message && (
                                                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                                                )}
                                                <p className="text-[10px] text-slate-300 mt-1">{timeAgo(n.created_at)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-8 text-center">
                                    <span className="material-symbols-outlined text-3xl text-slate-200">notifications_off</span>
                                    <p className="text-xs text-slate-400 mt-2">Không có thông báo</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};
