import { useState, useRef, useEffect } from "react";

interface SidebarProps {
    activeView: string;
    onViewChange: (view: string) => void;
    userEmail: string;
    userRole?: string;
    onLogout: () => void;
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
    { id: "admin-tickets", icon: "confirmation_number", label: "Quản lý Ticket" },
];

const systemMenu = [
    { id: "handbook", icon: "menu_book", label: "Cẩm nang" },
    { id: "settings", icon: "settings", label: "Cài đặt" },
];

export const Sidebar = ({ activeView, onViewChange, userEmail, userRole = "member", onLogout }: SidebarProps) => {
    const [showPopup, setShowPopup] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);


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
        <aside className="sidebar flex flex-col relative" onMouseLeave={() => { setShowPopup(false); }}>
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

                    {/* Avatar row */}
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
                    </div>
                </div>
            </div>
        </aside>
    );
};
