import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SidebarProps {
    activeView: string;
    onViewChange: (view: string) => void;
    userEmail: string;
    userRole?: string;
    onLogout: () => void;
    onOpenOptimization: () => void;
}

interface Notification {
    id: string;
    title: string;
    message: string | null;
    is_read: boolean;
    created_at: string;
}

/* ===== Menu Groups ===== */
const personalMenu = [
    { id: "work", icon: "edit_note", label: "Bàn làm việc" },
    { id: "journey", icon: "trending_up", label: "Hành trình của tôi" },
    { id: "ideas", icon: "lightbulb", label: "Kho sáng kiến" },
];

const managerMenu = [
    { id: "team-overview", icon: "groups", label: "Tổng quan Team" },
    { id: "team-journal", icon: "auto_stories", label: "Nhật ký Đội nhóm" },
];

const adminMenu = [
    { id: "admin-users", icon: "manage_accounts", label: "Quản lý Nhân sự" },
];

const systemMenu = [
    { id: "handbook", icon: "menu_book", label: "Cẩm nang" },
    { id: "settings", icon: "settings", label: "Cài đặt" },
];

export const Sidebar = ({ activeView, onViewChange, userEmail, userRole = "member", onLogout, onOpenOptimization }: SidebarProps) => {
    const [showPopup, setShowPopup] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);

    // === Notification state ===
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const notifRef = useRef<HTMLDivElement>(null);

    const isManager = userRole === "manager" || userRole === "executive" || userRole === "admin";
    const isAdmin = userRole === "admin";

    // Close popup on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                setShowPopup(false);
            }
        };
        if (showPopup) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showPopup]);

    // Close notification dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotifDropdown(false);
            }
        };
        if (showNotifDropdown) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showNotifDropdown]);

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

    const handleBellClick = async () => {
        setShowNotifDropdown((prev) => !prev);
        if (!showNotifDropdown) {
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

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Vừa xong";
        if (mins < 60) return `${mins} phút trước`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs} giờ trước`;
        return `${Math.floor(hrs / 24)} ngày trước`;
    };

    const initial = userEmail ? userEmail.charAt(0).toUpperCase() : "S";

    /* Render a menu button */
    const MenuButton = ({ item }: { item: { id: string; icon: string; label: string } }) => (
        <button
            onClick={() => onViewChange(item.id)}
            className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${activeView === item.id
                ? "text-indigo-600 bg-indigo-50/70 sidebar-item-active"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50/80"
                }`}
        >
            <span className="material-symbols-outlined text-[20px] flex-shrink-0">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
        </button>
    );

    /* Group label */
    const GroupLabel = ({ label }: { label: string }) => (
        <div className="px-4 pt-4 pb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300">
                {label}
            </span>
        </div>
    );

    const roleName = isAdmin ? "Admin" : isManager ? "Quản lý" : "Nhân viên";

    return (
        <aside className="sidebar flex flex-col relative" onMouseLeave={() => { setShowPopup(false); setShowNotifDropdown(false); }}>
            <div className="sidebar-inner bg-white border-r border-slate-100/80 flex flex-col h-full">
                {/* Logo */}
                <div className="h-14 flex items-center gap-3 px-5 border-b border-slate-200 flex-shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/25">
                        <span className="material-symbols-outlined text-white text-[18px]">check</span>
                    </div>
                    <span className="sidebar-label font-extrabold text-slate-800 text-sm tracking-tight">
                        MITs Daily
                    </span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-2 px-2.5 space-y-0.5 overflow-y-auto">
                    {/* ── CÁ NHÂN ── */}
                    <GroupLabel label="Cá nhân" />
                    {personalMenu.map((item) => (
                        <MenuButton key={item.id} item={item} />
                    ))}

                    {/* ── QUẢN LÝ TEAM ── (only for manager/executive) */}
                    {isManager && (
                        <>
                            <div className="mx-3 my-2 border-t border-slate-100" />
                            <GroupLabel label="Quản lý Team" />
                            {managerMenu.map((item) => (
                                <MenuButton key={item.id} item={item} />
                            ))}
                        </>
                    )}

                    {/* ── ADMIN ── (only for admin) */}
                    {isAdmin && (
                        <>
                            <div className="mx-3 my-2 border-t border-slate-100" />
                            <GroupLabel label="Quản trị Hệ thống" />
                            {adminMenu.map((item) => (
                                <MenuButton key={item.id} item={item} />
                            ))}
                        </>
                    )}

                    {/* ── HỆ THỐNG ── */}
                    <div className="mx-3 my-2 border-t border-slate-100" />
                    <GroupLabel label="Hệ thống" />
                    {systemMenu.map((item) => (
                        <MenuButton key={item.id} item={item} />
                    ))}
                </nav>

                {/* CTA: Đề xuất Tối ưu */}
                <div className="mx-3 mb-3">
                    <button
                        onClick={onOpenOptimization}
                        className="w-full flex justify-center items-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[13px] shadow-md shadow-indigo-500/25 hover:-translate-y-0.5 transition-all"
                    >
                        <span className="text-[14px] flex-shrink-0">⚡</span>
                        <span className="sidebar-label">Đề xuất Tối ưu</span>
                    </button>
                </div>

                {/* User Profile + Bell */}
                <div className="border-t border-slate-100/80 px-2.5 py-3 relative" ref={popupRef}>
                    {/* User Popup */}
                    {showPopup && (
                        <div className="user-popup anim-slide-up">
                            <button
                                onClick={() => { setShowPopup(false); onLogout(); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-500 hover:bg-red-50 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[18px]">logout</span>
                                <span>Đăng xuất</span>
                            </button>
                        </div>
                    )}

                    {/* Avatar + Bell row */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setShowPopup(!showPopup)}
                            className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors flex-1 min-w-0"
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${isManager
                                ? "bg-gradient-to-br from-amber-400 to-orange-400"
                                : "bg-gradient-to-br from-indigo-400 to-violet-400"
                                }`}>
                                <span className="text-white text-xs font-bold">{initial}</span>
                            </div>
                            <div className="sidebar-label text-left min-w-0">
                                <p className="text-xs font-semibold text-slate-700 truncate">{userEmail || "Nhân viên"}</p>
                                <p className="text-[10px] text-slate-400">{roleName}</p>
                            </div>
                        </button>

                        {/* Notification Bell */}
                        <div className="relative flex-shrink-0" ref={notifRef}>
                            <button
                                onClick={handleBellClick}
                                className="relative w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                            >
                                <span className="material-symbols-outlined text-[20px]">notifications</span>
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">
                                        {unreadCount > 9 ? "9+" : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {showNotifDropdown && (
                                <div className="absolute left-full bottom-0 ml-3 w-80 bg-white rounded-xl shadow-lg border border-slate-100 z-50 overflow-hidden anim-slide-up">
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
                    </div>
                </div>
            </div>
        </aside>
    );
};
