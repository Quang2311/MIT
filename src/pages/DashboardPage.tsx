import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/* Layout */
import { Sidebar } from "@/components/layout/Sidebar";

/* Views */
import { PersonalView } from "@/components/views/PersonalView";
import { JourneyView } from "@/components/views/JourneyView";
import { IdeasView } from "@/components/views/IdeasView";
import { SettingsView } from "@/components/views/SettingsView";
import { TeamOverviewView } from "@/components/views/TeamOverviewView";
import { TeamJournalView } from "@/components/views/TeamJournalView";
import { AdminUsersView } from "@/components/views/AdminUsersView";

/* Existing modals */
import { AIAnalysisModal } from "@/components/AIAnalysisModal";
import { HistoryModal } from "@/components/HistoryModal";
import { TaskInputModal } from "@/components/TaskInputModal";
import { CheckoutSuccess } from "@/components/CheckoutSuccess";

/* ===== Types ===== */
interface Task {
    id: string;
    text: string;
    completed: boolean;
}

/* ===== Component ===== */
export const DashboardPage = () => {
    const navigate = useNavigate();

    /* State */
    const [pageState, setPageState] = useState<"loading" | "input" | "dashboard" | "checkout-success">("loading");
    const [activeView, setActiveView] = useState("work");
    const [tasks, setTasks] = useState<Task[]>([]);
    const [userId, setUserId] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState("");
    const [userRole, setUserRole] = useState("member");
    const [userDepartment, setUserDepartment] = useState<string | null>(null);
    const [isCheckedOut, setIsCheckedOut] = useState(false);
    const [checkoutStats, setCheckoutStats] = useState({ completedCount: 0, totalCount: 0, completionRate: 0 });

    /* Modals */
    const [showAIModal, setShowAIModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showOptimizationModal, setShowOptimizationModal] = useState(false);

    /* Optimization form */
    const [optProcessName, setOptProcessName] = useState("");
    const [optPainPoints, setOptPainPoints] = useState<string[]>([]);
    const [optTimeWasted, setOptTimeWasted] = useState("1-2 giờ / tuần");
    const [optSoftwareUsed, setOptSoftwareUsed] = useState("");
    const [optWorkflowDesc, setOptWorkflowDesc] = useState("");
    const [isSubmittingOpt, setIsSubmittingOpt] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    /* Helpers */
    const getTodayDate = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };

    /* Bootstrap */
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { navigate("/login"); return; }
            setUserId(user.id);
            setUserEmail(user.email || "");

            // Fetch role + department
            const { data: profile, error: profileError } = await (supabase as any)
                .from("profiles")
                .select("role, department")
                .eq("id", user.id)
                .single();
            console.log("[DashboardPage] auth user.id:", user.id);
            console.log("[DashboardPage] profile fetch:", profile, "error:", profileError);
            if (profile) {
                setUserRole(profile.role || "member");
                setUserDepartment(profile.department || null);
            }

            const today = getTodayDate();
            const { data: session } = await supabase
                .from("mit_sessions").select("*")
                .eq("user_id", user.id).eq("session_date", today).maybeSingle();

            if (session) {
                const { data: tasksData } = await supabase
                    .from("mit_tasks").select("*")
                    .eq("user_id", user.id).eq("session_date", today)
                    .order("created_at", { ascending: true });
                if (tasksData?.length) {
                    setTasks(tasksData.map((t) => ({ id: t.id, text: t.title, completed: t.is_completed })));
                }
                setCheckoutStats({ completedCount: session.completed_tasks, totalCount: session.total_tasks, completionRate: session.completion_rate });
                setIsCheckedOut(true);
                setPageState("dashboard");
                return;
            }

            const { data: existingTasks } = await supabase
                .from("mit_tasks").select("*")
                .eq("user_id", user.id).eq("session_date", today)
                .order("created_at", { ascending: true });

            if (existingTasks?.length) {
                setTasks(existingTasks.map((t) => ({ id: t.id, text: t.title, completed: t.is_completed })));
                setPageState("dashboard");
            } else {
                setPageState("input");
            }
        };
        init();
    }, [navigate]);

    /* Handlers */
    const handleLogout = async () => { await supabase.auth.signOut(); navigate("/login"); };

    const handleTasksSubmit = async (taskTexts: string[]) => {
        if (!userId) return;
        const today = getTodayDate();
        const newTasks: Task[] = [];
        for (const text of taskTexts) {
            if (!text.trim()) continue;
            const { data, error } = await supabase
                .from("mit_tasks")
                .insert({ user_id: userId, session_date: today, title: text.trim(), is_completed: false })
                .select().single();
            if (data && !error) newTasks.push({ id: data.id, text: data.title, completed: data.is_completed });
        }
        setTasks(newTasks);
        setPageState("dashboard");
    };

    const handleToggleTask = async (taskId: string) => {
        if (isCheckedOut) return;
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;
        const newCompleted = !task.completed;
        await supabase.from("mit_tasks")
            .update({ is_completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null })
            .eq("id", taskId);
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: newCompleted } : t)));
    };

    const handleCheckout = async () => {
        if (!userId) return;
        const today = getTodayDate();
        const cc = tasks.filter((t) => t.completed).length;
        const tc = tasks.length;
        const cr = tc > 0 ? Math.round((cc / tc) * 100) : 0;

        // ===== XP CALCULATION =====
        // +10 XP per completed task, +50 bonus if 100% completion
        const xpBase = cc * 10;
        const xpBonus = cr === 100 ? 50 : 0;
        const xpEarned = xpBase + xpBonus;

        try {
            const { data: existing } = await supabase
                .from("mit_sessions").select("id").eq("user_id", userId).eq("session_date", today).maybeSingle();

            const sessionData = {
                checkout_at: new Date().toISOString(),
                total_tasks: tc,
                completed_tasks: cc,
                completion_rate: cr,
                xp_earned: xpEarned,
            };

            if (existing) {
                await supabase.from("mit_sessions").update(sessionData).eq("id", existing.id);
            } else {
                await supabase.from("mit_sessions").insert({ user_id: userId, session_date: today, ...sessionData });
            }

            // ===== INCREMENT total_xp in profiles =====
            const { data: profile } = await supabase
                .from("profiles").select("total_xp").eq("id", userId).single();
            const currentXp = (profile as unknown as { total_xp: number })?.total_xp || 0;
            await supabase.from("profiles")
                .update({ total_xp: currentXp + xpEarned } as Record<string, unknown>)
                .eq("id", userId);

            console.log(`[Checkout] XP earned: ${xpEarned} (base: ${xpBase}, bonus: ${xpBonus}), total: ${currentXp + xpEarned}`);
        } catch (err) {
            console.error("Checkout XP error:", err);
        }

        setCheckoutStats({ completedCount: cc, totalCount: tc, completionRate: cr });
        setIsCheckedOut(true);
        setPageState("checkout-success");
    };

    const handleBackToDashboard = () => setPageState("dashboard");

    /* Optimization */
    const togglePainPoint = (tag: string) => setOptPainPoints((p) => p.includes(tag) ? p.filter((x) => x !== tag) : [...p, tag]);
    const resetOptForm = () => { setOptProcessName(""); setOptPainPoints([]); setOptTimeWasted("1-2 giờ / tuần"); setOptSoftwareUsed(""); setOptWorkflowDesc(""); };
    const handleOptimizationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!optProcessName.trim() || !userId) return;
        setIsSubmittingOpt(true);
        try {
            const code = `OPT-${getTodayDate().replace(/-/g, "")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            const desc = JSON.stringify({ workflow_description: optWorkflowDesc, pain_points: optPainPoints, time_wasted: optTimeWasted, software_used: optSoftwareUsed });
            const { error } = await supabase.from("tickets").insert({
                ticket_code: code, creator_id: userId, department_in_charge: "BOD" as any,
                title: `[Tối ưu] ${optProcessName.trim()}`, description: desc,
                status: "open" as any, priority: "medium" as any,
            });
            if (error) { alert("Lỗi: " + error.message); return; }
            setShowOptimizationModal(false); resetOptForm();
            setShowSuccessToast(true); setTimeout(() => setShowSuccessToast(false), 3000);
        } catch { alert("Có lỗi xảy ra."); } finally { setIsSubmittingOpt(false); }
    };

    /* ===== RENDER ===== */

    if (pageState === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f0f4ff 0%, #faf5ff 40%, #fdf2f8 100%)" }}>
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full anim-spin" />
                    <p className="text-sm text-slate-500 font-medium">Đang tải...</p>
                </div>
            </div>
        );
    }

    if (pageState === "input") {
        return <TaskInputModal isOpen={true} onSubmit={handleTasksSubmit} />;
    }

    if (pageState === "checkout-success") {
        return (
            <>
                <CheckoutSuccess
                    completedCount={checkoutStats.completedCount}
                    totalCount={checkoutStats.totalCount}
                    completionRate={checkoutStats.completionRate}
                    onViewHistory={() => setShowHistoryModal(true)}
                    onBackToDashboard={handleBackToDashboard}
                    onLogout={handleLogout}
                />
                <HistoryModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} />
            </>
        );
    }

    // ===== DASHBOARD =====
    const completedCount = tasks.filter((t) => t.completed).length;
    const totalCount = tasks.length;

    return (
        <div className="app-shell">
            <Sidebar activeView={activeView} onViewChange={setActiveView} userEmail={userEmail} userRole={userRole} onLogout={handleLogout} onOpenOptimization={() => setShowOptimizationModal(true)} />

            <div className="main-content">
                {/* Scrollable content area — no TopHeader, starts from top */}
                <div className="content-scroll pt-8">
                    {activeView === "work" && (
                        <PersonalView
                            tasks={tasks} onToggleTask={handleToggleTask} onCheckout={handleCheckout}
                            isCheckedOut={isCheckedOut} checkoutStats={checkoutStats} onOpenAI={() => setShowAIModal(true)}
                        />
                    )}
                    {activeView === "journey" && <JourneyView />}
                    {activeView === "ideas" && <IdeasView />}
                    {activeView === "handbook" && (
                        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                            <div className="text-center">
                                <span className="material-symbols-outlined text-6xl text-slate-200">menu_book</span>
                                <p className="mt-3 text-slate-400 font-medium">Cẩm nang</p>
                                <p className="text-sm text-slate-300 mt-1">Tài liệu hướng dẫn — sắp ra mắt</p>
                            </div>
                        </div>
                    )}
                    {activeView === "team-overview" && <TeamOverviewView userDepartment={userDepartment} />}
                    {activeView === "team-journal" && <TeamJournalView userDepartment={userDepartment} />}
                    {activeView === "admin-users" && <AdminUsersView />}
                    {activeView === "settings" && <SettingsView />}
                </div>
            </div>

            {/* ===== MODALS ===== */}
            <AIAnalysisModal isOpen={showAIModal} onClose={() => setShowAIModal(false)} completedCount={completedCount} totalCount={totalCount} />
            <HistoryModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} />

            {/* Optimization Modal */}
            {showOptimizationModal && (
                <div className="opt-modal-overlay">
                    <form onSubmit={handleOptimizationSubmit} className="opt-modal-content anim-scale-in">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">🚀</span>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900">Đề xuất Tự động hóa</h2>
                                        <p className="text-sm text-slate-500">Báo cáo tác vụ thủ công để chúng tôi giúp bạn tự động hóa.</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => { setShowOptimizationModal(false); resetOptForm(); }} className="text-slate-400 hover:text-slate-600 p-1">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tên quy trình *</label>
                                <input type="text" value={optProcessName} onChange={(e) => setOptProcessName(e.target.value)}
                                    placeholder="VD: Báo cáo doanh thu hàng tuần..."
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Nỗi đau lớn nhất</label>
                                <div className="flex flex-wrap gap-2">
                                    {["Nhập liệu thủ công", "Copy-paste nhiều nền tảng", "Chờ duyệt lâu", "Dễ sai sót"].map((tag) => (
                                        <button key={tag} type="button" onClick={() => togglePainPoint(tag)}
                                            className={`pain-chip ${optPainPoints.includes(tag) ? "pain-chip-selected" : ""}`}>
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Thời gian tiêu tốn</label>
                                    <select value={optTimeWasted} onChange={(e) => setOptTimeWasted(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                                        <option>1-2 giờ / tuần</option>
                                        <option>3-5 giờ / tuần</option>
                                        <option>5+ giờ / tuần</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Phần mềm đang dùng *</label>
                                    <input type="text" value={optSoftwareUsed} onChange={(e) => setOptSoftwareUsed(e.target.value)}
                                        placeholder="Excel, Jira, SAP..."
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mô tả tóm tắt</label>
                                <textarea rows={3} value={optWorkflowDesc} onChange={(e) => setOptWorkflowDesc(e.target.value)}
                                    placeholder="Mô tả các bước bạn đang phải làm..."
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                            <button type="button" onClick={() => { setShowOptimizationModal(false); resetOptForm(); }}
                                className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                                Hủy bỏ
                            </button>
                            <button type="submit" disabled={isSubmittingOpt}
                                className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-60">
                                {isSubmittingOpt ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full anim-spin" /> Đang gửi...</>
                                ) : (
                                    <><span className="text-[14px]">⚡</span> Gửi yêu cầu</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Success Toast */}
            {showSuccessToast && (
                <div className="fixed bottom-4 right-4 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3 toast-enter z-50">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
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
        </div>
    );
};

export default DashboardPage;
