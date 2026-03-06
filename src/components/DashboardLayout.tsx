import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AIAnalysisModal } from "./AIAnalysisModal";
import { HistoryModal } from "./HistoryModal";

interface Task {
    id: string;
    text: string;
    completed: boolean;
}

interface DashboardLayoutProps {
    tasks: Task[];
    onToggleTask: (id: string) => void;
    onLogout: () => void;
    onCheckout: () => Promise<void>;
    isCheckedOut?: boolean;
}

export const DashboardLayout = ({ tasks, onToggleTask, onLogout, onCheckout, isCheckedOut = false }: DashboardLayoutProps) => {
    const [userEmail, setUserEmail] = useState<string>("");
    const [showToast, setShowToast] = useState(true);
    const [showAIModal, setShowAIModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [showOptimizationModal, setShowOptimizationModal] = useState(false);

    // Optimization form state
    const [optProcessName, setOptProcessName] = useState("");
    const [optPainPoints, setOptPainPoints] = useState<string[]>([]);
    const [optTimeWasted, setOptTimeWasted] = useState("1-2 giờ / tuần");
    const [optSoftwareUsed, setOptSoftwareUsed] = useState("");
    const [optWorkflowDesc, setOptWorkflowDesc] = useState("");
    const [isSubmittingOpt, setIsSubmittingOpt] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                setUserEmail(user.email);
            }
            if (user?.id) {
                setUserId(user.id);
            }
        };
        getUser();

        const timer = setTimeout(() => setShowToast(false), 3000);
        return () => clearTimeout(timer);
    }, []);

    // Toggle pain point selection
    const togglePainPoint = (tag: string) => {
        setOptPainPoints(prev =>
            prev.includes(tag) ? prev.filter(p => p !== tag) : [...prev, tag]
        );
    };

    // Reset optimization form
    const resetOptForm = () => {
        setOptProcessName("");
        setOptPainPoints([]);
        setOptTimeWasted("1-2 giờ / tuần");
        setOptSoftwareUsed("");
        setOptWorkflowDesc("");
    };

    // Submit optimization request to Supabase tickets table
    const handleOptimizationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!optProcessName.trim()) {
            alert("Vui lòng nhập tên quy trình!");
            return;
        }
        if (!userId) {
            alert("Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.");
            return;
        }

        setIsSubmittingOpt(true);
        try {
            // Generate ticket code: OPT-YYYYMMDD-XXXX
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
            const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            const ticketCode = `OPT-${dateStr}-${randomSuffix}`;

            // Build structured description with metadata
            const structuredDesc = JSON.stringify({
                workflow_description: optWorkflowDesc,
                pain_points: optPainPoints,
                time_wasted: optTimeWasted,
                software_used: optSoftwareUsed,
            });

            const { error } = await supabase
                .from("tickets")
                .insert({
                    ticket_code: ticketCode,
                    creator_id: userId,
                    department_in_charge: "BOD" as any,
                    title: `[Tối ưu] ${optProcessName.trim()}`,
                    description: structuredDesc,
                    status: "open" as any,
                    priority: "medium" as any,
                });

            if (error) {
                console.error("[OptimizationSubmit] Error:", error);
                alert("Lỗi gửi yêu cầu: " + error.message);
                return;
            }

            // Success: close modal, reset form, show toast
            setShowOptimizationModal(false);
            resetOptForm();
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 3000);

        } catch (err) {
            console.error("[OptimizationSubmit] Catch:", err);
            alert("Có lỗi xảy ra. Vui lòng thử lại.");
        } finally {
            setIsSubmittingOpt(false);
        }
    };

    // Progress calculations
    const completedCount = tasks.filter(t => t.completed).length;
    const totalCount = tasks.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    // SVG donut: radius=42, circumference = 2*PI*42 = ~264
    const circumference = 2 * Math.PI * 42;
    const strokeOffset = circumference - (progressPercent / 100) * circumference;

    const getPerformanceLabel = () => {
        if (progressPercent === 100) return { text: "Excellent", color: "text-green-600" };
        if (progressPercent >= 66) return { text: "Good", color: "text-primary" };
        if (progressPercent >= 33) return { text: "In Progress", color: "text-amber-500" };
        return { text: "Getting Started", color: "text-slate-400" };
    };

    const perf = getPerformanceLabel();

    const todayStr = new Date().toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "numeric",
        month: "long",
    });

    return (
        <div className="mesh-gradient-light font-sans text-slate-800 min-h-screen flex flex-col selection:bg-blue-500/20">
            {/* ===== HEADER ===== */}
            <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-lg border-b border-white/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        {/* Logo */}
                        <div className="flex items-center gap-4">
                            <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                                <span className="material-symbols-outlined text-2xl">check_box</span>
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">MIT Manager</h1>
                                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Focus Dashboard</span>
                            </div>
                        </div>

                        {/* Right actions */}
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => setShowOptimizationModal(true)}
                                className="flex items-center gap-2 text-amber-600 hover:text-amber-700 transition-colors text-sm font-semibold px-3 py-2 rounded-lg hover:bg-amber-50/80"
                            >
                                <span className="text-[16px]">⚡</span>
                                <span className="hidden sm:inline">Đề xuất Tối ưu</span>
                            </button>
                            <button
                                onClick={() => setShowHistoryModal(true)}
                                className="flex items-center gap-2 text-slate-600 hover:text-blue-500 transition-colors text-sm font-semibold px-3 py-2 rounded-lg hover:bg-slate-100/50"
                            >
                                <span className="material-symbols-outlined text-[22px]">history</span>
                                <span className="hidden sm:inline">Lịch sử</span>
                            </button>
                            <div className="h-8 w-px bg-slate-300/50 mx-1"></div>

                            {/* User dropdown */}
                            <div className="relative group py-2">
                                <button className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all group/btn">
                                    <span className="text-sm font-semibold text-slate-700 pl-2">{userEmail ? userEmail.split("@")[0] : "User"}</span>
                                    <div className="size-9 rounded-full bg-gradient-to-tr from-blue-100 to-slate-100 flex items-center justify-center text-blue-500 group-hover/btn:bg-blue-500 group-hover/btn:text-white transition-colors">
                                        <span className="material-symbols-outlined">person</span>
                                    </div>
                                </button>
                                <div className="absolute right-0 top-full pt-2 w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                    <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-2">
                                        <div className="px-3 py-2 text-sm text-gray-500 border-b border-gray-50 mb-1">
                                            {userEmail || "Loading..."}
                                        </div>
                                        <Link
                                            to="/change-password"
                                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2 mb-1 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[18px] text-gray-400">lock</span>
                                            Thay đổi mật khẩu
                                        </Link>
                                        <button
                                            onClick={onLogout}
                                            className="w-full px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">logout</span>
                                            Đăng xuất
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* ===== MAIN CONTENT — Split Pane ===== */}
            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start lg:h-[calc(100vh-80px)] lg:overflow-hidden">
                {/* LEFT — Task List (8 cols) */}
                <div className="lg:col-span-8 flex flex-col lg:h-full overflow-hidden">
                    <div className="glass-panel rounded-3xl p-8 lg:h-full flex flex-col relative overflow-hidden group">
                        {/* Decorative blur */}
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>

                        {/* Header row */}
                        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-8 z-10">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-600 text-[10px] font-bold uppercase tracking-wider border border-orange-200">Today</span>
                                    <span className="text-slate-400 font-medium text-sm capitalize">{todayStr}</span>
                                </div>
                                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Công việc hôm nay</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Hoàn thành</div>
                                    <div className="text-xl font-bold text-slate-800">{completedCount}<span className="text-slate-400 text-lg font-normal">/{totalCount}</span></div>
                                </div>
                                <div className={`size-10 rounded-full flex items-center justify-center border ${progressPercent === 100
                                    ? 'bg-green-50 text-green-600 border-green-100'
                                    : 'bg-blue-50 text-blue-600 border-blue-100'
                                    }`}>
                                    <span className="material-symbols-outlined">{progressPercent === 100 ? 'celebration' : 'trending_up'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Task list */}
                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 z-10 pb-6" style={{ scrollbarWidth: 'none' }}>
                            {tasks.map((task) => (
                                <div
                                    key={task.id}
                                    onClick={() => !isCheckedOut && onToggleTask(task.id)}
                                    className={`group/task rounded-2xl p-5 flex items-center gap-5 transition-all duration-300 ${isCheckedOut
                                        ? 'bg-white/40 border border-slate-100 opacity-70 cursor-default select-none'
                                        : task.completed
                                            ? 'glass-card hover:bg-white/60 hover:shadow-md cursor-pointer'
                                            : 'bg-white border-2 border-blue-500/10 shadow-lg shadow-blue-500/5 hover:border-blue-500/40 hover:shadow-blue-500/10 transform hover:-translate-y-0.5 cursor-pointer'
                                        }`}
                                >
                                    <div className="flex-shrink-0">
                                        <div className={`size-8 rounded-full flex items-center justify-center transition-colors ${task.completed
                                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                            : isCheckedOut
                                                ? 'border-[3px] border-slate-200'
                                                : 'border-[3px] border-slate-300 group-hover/task:border-blue-500'
                                            }`}>
                                            {task.completed && (
                                                <span className="material-symbols-outlined text-lg font-bold">check</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className={`block font-bold truncate transition-colors ${task.completed
                                            ? 'text-lg text-slate-400 line-through decoration-slate-300'
                                            : isCheckedOut
                                                ? 'text-xl text-slate-500'
                                                : 'text-xl text-slate-900 group-hover/task:text-blue-500'
                                            }`}>
                                            {task.text}
                                        </span>
                                    </div>
                                    {!task.completed && !isCheckedOut && (
                                        <div className="size-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-all">
                                            <span className="material-symbols-outlined">arrow_forward</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Checkout button */}
                        <div className="mt-auto pt-6 z-10 border-t border-white/40">
                            {isCheckedOut ? (
                                <div className="w-full bg-green-50 border-2 border-green-200 text-green-700 font-bold py-5 rounded-2xl flex justify-between items-center px-8">
                                    <span className="flex items-center gap-3">
                                        <span className="p-1 rounded bg-green-100">
                                            <span className="material-symbols-outlined text-sm text-green-600">check_circle</span>
                                        </span>
                                        ✓ Đã Check-out
                                    </span>
                                    <span className="text-green-500 text-sm font-medium">Phiên làm việc đã kết thúc</span>
                                </div>
                            ) : (
                                <button
                                    onClick={async () => {
                                        setIsCheckingOut(true);
                                        await onCheckout();
                                        setIsCheckingOut(false);
                                    }}
                                    disabled={isCheckingOut}
                                    className="w-full relative overflow-hidden bg-slate-900 hover:bg-slate-800 text-white font-bold py-5 rounded-2xl shadow-xl shadow-slate-900/10 active:scale-[0.99] transition-all flex justify-between items-center px-8 group/checkout disabled:opacity-70"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-transparent opacity-0 group-hover/checkout:opacity-100 transition-opacity"></div>
                                    <span className="flex items-center gap-3 relative z-10">
                                        <span className="p-1 rounded bg-white/20">
                                            <span className="material-symbols-outlined text-sm">logout</span>
                                        </span>
                                        {isCheckingOut ? "Đang lưu..." : "Checkout"}
                                    </span>
                                    <span className="text-slate-400 group-hover/checkout:text-white transition-colors text-sm font-medium relative z-10">Kết thúc ngày làm việc</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT — Progress Panel (4 cols) */}
                <div className="lg:col-span-4 lg:h-full">
                    <div className="glass-panel rounded-3xl p-8 lg:h-full flex flex-col relative overflow-hidden">
                        {/* Decorative gradient */}
                        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-blue-50/80 to-transparent pointer-events-none"></div>

                        {/* Title */}
                        <div className="flex items-center gap-3 mb-6 z-10">
                            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                                <span className="material-symbols-outlined">donut_large</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Tiến độ hôm nay</h3>
                        </div>

                        {/* SVG donut chart */}
                        <div className="flex-1 flex flex-col items-center justify-center relative z-10 min-h-[200px]">
                            <div className="relative size-64">
                                <svg className="size-full -rotate-90 transform" viewBox="0 0 100 100">
                                    <defs>
                                        <linearGradient id="liquidGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                                            <stop offset="0%" style={{ stopColor: progressPercent === 100 ? '#10b981' : '#3b82f6', stopOpacity: 1 }} />
                                            <stop offset="100%" style={{ stopColor: progressPercent === 100 ? '#34d399' : '#06b6d4', stopOpacity: 1 }} />
                                        </linearGradient>
                                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                                            <feMerge>
                                                <feMergeNode in="coloredBlur" />
                                                <feMergeNode in="SourceGraphic" />
                                            </feMerge>
                                        </filter>
                                    </defs>
                                    <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="6" strokeLinecap="round" />
                                    <circle
                                        cx="50" cy="50" r="42"
                                        fill="none"
                                        stroke="url(#liquidGradient)"
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeOffset}
                                        filter="url(#glow)"
                                        className="transition-all duration-700 ease-out"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-6xl font-black text-slate-800 tracking-tighter">{progressPercent}%</span>
                                    <span className="text-sm font-semibold text-slate-400 mt-2 bg-white/50 px-3 py-1 rounded-full border border-white/60 backdrop-blur-sm">
                                        {completedCount} of {totalCount} tasks
                                    </span>
                                </div>
                            </div>

                            {/* Performance bar */}
                            <div className="mt-8 w-full">
                                <div className="flex justify-between text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                                    <span>Performance</span>
                                    <span className={perf.color}>{perf.text}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ease-out ${progressPercent === 100
                                            ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                                            : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                                            }`}
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* AI Analysis button */}
                        <div className="mt-auto pt-8 z-10">
                            <div className="p-1 rounded-2xl bg-gradient-to-br from-blue-100 via-white to-purple-100 shadow-sm border border-white/60">
                                <button
                                    onClick={() => setShowAIModal(true)}
                                    className="w-full bg-white/80 hover:bg-white backdrop-blur-sm rounded-xl py-4 px-4 transition-all flex items-center justify-between group/ai"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover/ai:scale-110 transition-transform">
                                            <span className="material-symbols-outlined text-xl">auto_awesome</span>
                                        </div>
                                        <div className="text-left">
                                            <span className="block text-sm font-bold text-slate-800">Phân tích AI</span>
                                            <span className="block text-[10px] text-slate-500 font-medium">Nhận gợi ý tối ưu</span>
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-300 group-hover/ai:text-blue-500 transition-colors">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Toast Notification — Login */}
            {showToast && (
                <div className="fixed bottom-4 right-4 bg-white/80 backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-white/60 flex items-center gap-3 animate-in slide-in-from-bottom duration-500 z-50">
                    <div className="size-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                        <span className="material-symbols-outlined">check_circle</span>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-900">Đăng nhập thành công!</h4>
                        <p className="text-xs text-slate-500">Chào mừng bạn quay lại</p>
                    </div>
                    <button onClick={() => setShowToast(false)} className="ml-4 text-slate-400 hover:text-slate-600">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
            )}

            {/* Toast Notification — Optimization Success */}
            {showSuccessToast && (
                <div className="fixed bottom-4 right-4 bg-white/80 backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-white/60 flex items-center gap-3 animate-in slide-in-from-bottom duration-500 z-50">
                    <div className="size-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                        <span className="material-symbols-outlined">rocket_launch</span>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-900">Đã gửi đề xuất!</h4>
                        <p className="text-xs text-slate-500">Yêu cầu tối ưu đã được ghi nhận.</p>
                    </div>
                    <button onClick={() => setShowSuccessToast(false)} className="ml-4 text-slate-400 hover:text-slate-600">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
            )}

            {/* Modals */}
            <AIAnalysisModal
                isOpen={showAIModal}
                onClose={() => setShowAIModal(false)}
                completedCount={completedCount}
                totalCount={totalCount}
            />
            <HistoryModal
                isOpen={showHistoryModal}
                onClose={() => setShowHistoryModal(false)}
            />

            {/* Optimization Modal — Đề xuất Tối ưu (matching Stitch design) */}
            {showOptimizationModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <form onSubmit={handleOptimizationSubmit} className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">🚀</span>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900">Đề xuất Tự động hóa Quy trình</h2>
                                        <p className="text-sm text-slate-500">Báo cáo các tác vụ thủ công, lặp đi lặp lại để chúng tôi giúp bạn tự động hóa.</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => { setShowOptimizationModal(false); resetOptForm(); }} className="text-slate-400 hover:text-slate-600 p-1">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>
                        {/* Form Body */}
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tên quy trình *</label>
                                <input
                                    type="text"
                                    value={optProcessName}
                                    onChange={(e) => setOptProcessName(e.target.value)}
                                    placeholder="VD: Báo cáo doanh thu hàng tuần..."
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Nỗi đau lớn nhất</label>
                                <div className="flex flex-wrap gap-2">
                                    {["Nhập liệu thủ công", "Copy-paste nhiều nền tảng", "Chờ duyệt lâu", "Dễ sai sót"].map((tag) => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => togglePainPoint(tag)}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${optPainPoints.includes(tag)
                                                    ? 'bg-blue-50 text-blue-600 border-blue-300'
                                                    : 'border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
                                                }`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Thời gian tiêu tốn</label>
                                    <select
                                        value={optTimeWasted}
                                        onChange={(e) => setOptTimeWasted(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option>1-2 giờ / tuần</option>
                                        <option>3-5 giờ / tuần</option>
                                        <option>5+ giờ / tuần</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Phần mềm đang dùng *</label>
                                    <input
                                        type="text"
                                        value={optSoftwareUsed}
                                        onChange={(e) => setOptSoftwareUsed(e.target.value)}
                                        placeholder="Excel, Jira, SAP..."
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mô tả tóm tắt luồng công việc hiện tại</label>
                                <textarea
                                    rows={3}
                                    value={optWorkflowDesc}
                                    onChange={(e) => setOptWorkflowDesc(e.target.value)}
                                    placeholder="Mô tả các bước bạn đang phải làm..."
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                ></textarea>
                            </div>
                        </div>
                        {/* Footer */}
                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                            <button type="button" onClick={() => { setShowOptimizationModal(false); resetOptForm(); }} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                                Hủy bỏ
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmittingOpt}
                                className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-60"
                            >
                                {isSubmittingOpt ? (
                                    <>
                                        <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Đang gửi...
                                    </>
                                ) : (
                                    <>
                                        <span className="text-[14px]">⚡</span>
                                        Gửi yêu cầu tối ưu
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
