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
import { AdminTicketsView } from "@/components/views/AdminTicketsView";
import { PendingApprovalScreen } from "@/components/PendingApprovalScreen";

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
    const [userStatus, setUserStatus] = useState<string>("loading");
    const [isCheckedOut, setIsCheckedOut] = useState(false);
    const [checkoutStats, setCheckoutStats] = useState({ completedCount: 0, totalCount: 0, completionRate: 0 });

    /* Modals */
    const [showAIModal, setShowAIModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

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

            // Fetch role + department + status
            const { data: profile, error: profileError } = await (supabase as any)
                .from("profiles")
                .select("role, department, status")
                .eq("id", user.id)
                .single();
            console.log("[DashboardPage] auth user.id:", user.id);
            console.log("[DashboardPage] profile fetch:", profile, "error:", profileError);
            if (profile) {
                setUserRole(profile.role || "member");
                setUserDepartment(profile.department || null);
                setUserStatus(profile.status || "pending");

                // ROUTER GUARD: chặn user pending — không load tasks/sessions
                if (profile.status !== "active") {
                    setPageState("dashboard");
                    return;
                }
            } else {
                // Không có profile → coi như pending
                setUserStatus("pending");
                setPageState("dashboard");
                return;
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

        // Update DB trước, chỉ update UI nếu thành công
        const { error } = await (supabase as any).from("mit_tasks")
            .update({ is_completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null })
            .eq("id", taskId);

        if (error) {
            console.error("[ToggleTask] DB update failed:", error);
            return; // KHÔNG update UI nếu DB thất bại
        }
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: newCompleted } : t)));
    };

    const handleCheckout = async () => {
        if (!userId) return;
        const today = getTodayDate();
        const cc = tasks.filter((t) => t.completed).length;
        const tc = tasks.length;
        const cr = tc > 0 ? Math.round((cc / tc) * 100) : 0;

        // ===== PERSIST TASK COMPLETION TO DB =====
        // Batch update tất cả tasks đã tick → is_completed = true trong DB
        const completedIds = tasks.filter((t) => t.completed).map((t) => t.id);
        const uncompletedIds = tasks.filter((t) => !t.completed).map((t) => t.id);

        if (completedIds.length > 0) {
            const { error: completeErr } = await (supabase as any).from("mit_tasks")
                .update({ is_completed: true, completed_at: new Date().toISOString() })
                .in("id", completedIds);
            if (completeErr) console.error("[Checkout] Failed to update completed tasks:", completeErr);
        }
        if (uncompletedIds.length > 0) {
            const { error: uncompleteErr } = await (supabase as any).from("mit_tasks")
                .update({ is_completed: false, completed_at: null })
                .in("id", uncompletedIds);
            if (uncompleteErr) console.error("[Checkout] Failed to update uncompleted tasks:", uncompleteErr);
        }

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

    // ★ ROUTER GUARD: user pending → Waiting Room (KHÔNG Sidebar, KHÔNG Header)
    if (userStatus !== "active" && userStatus !== "loading") {
        return <PendingApprovalScreen />;
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
            <Sidebar activeView={activeView} onViewChange={setActiveView} userEmail={userEmail} userRole={userRole} onLogout={handleLogout} />

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
                    {activeView === "ideas" && <IdeasView userId={userId} userDepartment={userDepartment} />}
                    {activeView === "handbook" && (
                        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                            <div className="text-center">
                                <span className="material-symbols-outlined text-6xl text-slate-200">menu_book</span>
                                <p className="mt-3 text-slate-400 font-medium">Cẩm nang</p>
                                <p className="text-sm text-slate-300 mt-1">Tài liệu hướng dẫn — sắp ra mắt</p>
                            </div>
                        </div>
                    )}
                    {activeView === "team-overview" && <TeamOverviewView userDepartment={userDepartment} userRole={userRole} />}
                    {activeView === "team-journal" && <TeamJournalView userDepartment={userDepartment} />}
                    {activeView === "admin-users" && <AdminUsersView />}
                    {activeView === "admin-tickets" && <AdminTicketsView />}
                    {activeView === "settings" && <SettingsView />}
                </div>
            </div>

            {/* ===== MODALS ===== */}
            <AIAnalysisModal isOpen={showAIModal} onClose={() => setShowAIModal(false)} completedCount={completedCount} totalCount={totalCount} />
            <HistoryModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} />


        </div>
    );
};

export default DashboardPage;
