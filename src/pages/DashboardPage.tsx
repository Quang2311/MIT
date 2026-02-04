import { useState, useEffect } from "react";
import { TaskInputModal } from "@/components/TaskInputModal";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CheckoutSuccess } from "@/components/CheckoutSuccess";
import { HistoryModal } from "@/components/HistoryModal";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Task {
    id: string;
    text: string;
    completed: boolean;
}

type PageState = "loading" | "input" | "dashboard" | "checkout-success";

const DashboardPage = () => {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [pageState, setPageState] = useState<PageState>("loading");
    const [userId, setUserId] = useState<string | null>(null);
    const [checkoutStats, setCheckoutStats] = useState({
        completedCount: 0,
        totalCount: 0,
        completionRate: 0
    });
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // Get today's date in YYYY-MM-DD format
    const getTodayDate = () => {
        const today = new Date();
        return today.toISOString().split("T")[0];
    };

    // Load tasks and check if already checked out
    useEffect(() => {
        const loadData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    navigate("/login");
                    return;
                }
                setUserId(user.id);

                const today = getTodayDate();

                // Check if already checked out today
                const { data: session } = await supabase
                    .from("mit_sessions")
                    .select("*")
                    .eq("user_id", user.id)
                    .eq("session_date", today)
                    .single();

                if (session) {
                    // Already checked out - show success screen
                    setCheckoutStats({
                        completedCount: session.completed_tasks,
                        totalCount: session.total_tasks,
                        completionRate: session.completion_rate
                    });
                    setPageState("checkout-success");
                    return;
                }

                // Fetch today's tasks
                const { data: tasksData, error } = await supabase
                    .from("mit_tasks")
                    .select("*")
                    .eq("user_id", user.id)
                    .eq("session_date", today)
                    .order("created_at", { ascending: true });

                if (error) {
                    console.error("Error loading tasks:", error);
                    setPageState("input");
                } else if (tasksData && tasksData.length > 0) {
                    const loadedTasks: Task[] = tasksData.map((task) => ({
                        id: task.id,
                        text: task.title,
                        completed: task.is_completed,
                    }));
                    setTasks(loadedTasks);
                    setPageState("dashboard");
                } else {
                    setPageState("input");
                }
            } catch (err) {
                console.error("Error:", err);
                setPageState("input");
            }
        };

        loadData();
    }, [navigate]);

    // Save new tasks to database
    const handleTasksSubmit = async (newTasks: string[]) => {
        if (!userId) return;

        const today = getTodayDate();

        try {
            const tasksToInsert = newTasks.map((title) => ({
                user_id: userId,
                session_date: today,
                title,
                is_completed: false,
            }));

            const { data, error } = await supabase
                .from("mit_tasks")
                .insert(tasksToInsert)
                .select();

            if (error) {
                console.error("Error saving tasks:", error);
                return;
            }

            if (data) {
                const formattedTasks: Task[] = data.map((task) => ({
                    id: task.id,
                    text: task.title,
                    completed: task.is_completed,
                }));
                setTasks(formattedTasks);
                setPageState("dashboard");
            }
        } catch (err) {
            console.error("Error:", err);
        }
    };

    // Toggle task completion
    const handleToggleTask = async (id: string) => {
        const task = tasks.find((t) => t.id === id);
        if (!task) return;

        const newCompleted = !task.completed;

        setTasks(tasks.map((t) =>
            t.id === id ? { ...t, completed: newCompleted } : t
        ));

        try {
            const { error } = await supabase
                .from("mit_tasks")
                .update({
                    is_completed: newCompleted,
                    completed_at: newCompleted ? new Date().toISOString() : null,
                })
                .eq("id", id);

            if (error) {
                console.error("Error updating task:", error);
                setTasks(tasks.map((t) =>
                    t.id === id ? { ...t, completed: !newCompleted } : t
                ));
            }
        } catch (err) {
            console.error("Error:", err);
        }
    };

    // Checkout - save or update session
    const handleCheckout = async () => {
        if (!userId) return;

        const today = getTodayDate();
        const completedCount = tasks.filter(t => t.completed).length;
        const totalCount = tasks.length;
        const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        try {
            // Check if session exists (use maybeSingle to avoid error when not found)
            const { data: existingSession, error: checkError } = await supabase
                .from("mit_sessions")
                .select("id")
                .eq("user_id", userId)
                .eq("session_date", today)
                .maybeSingle();

            if (checkError) {
                console.error("Check session error:", checkError);
            }

            if (existingSession && existingSession.id) {
                // Update existing session
                const { error: updateError } = await supabase
                    .from("mit_sessions")
                    .update({
                        checkout_at: new Date().toISOString(),
                        total_tasks: totalCount,
                        completed_tasks: completedCount,
                        completion_rate: completionRate,
                    })
                    .eq("id", existingSession.id);

                if (updateError) {
                    console.error("Update error:", updateError);
                    alert("Có lỗi xảy ra khi cập nhật. Vui lòng thử lại.");
                    return;
                }
            } else {
                // Create new session
                const { error } = await supabase
                    .from("mit_sessions")
                    .insert({
                        user_id: userId,
                        session_date: today,
                        checkout_at: new Date().toISOString(),
                        total_tasks: totalCount,
                        completed_tasks: completedCount,
                        completion_rate: completionRate,
                    });

                if (error) {
                    console.error("Checkout error:", error);
                    alert("Có lỗi xảy ra. Vui lòng thử lại.");
                    return;
                }
            }

            // Show success screen
            setCheckoutStats({ completedCount, totalCount, completionRate });
            setPageState("checkout-success");

        } catch (err) {
            console.error("Checkout error:", err);
        }
    };

    // Edit session - go back to dashboard to update tasks, then checkout again
    const handleEditSession = async (sessionDate: string) => {
        if (!userId) return;

        const today = getTodayDate();
        if (sessionDate !== today) {
            alert("Chỉ có thể sửa phiên làm việc của hôm nay!");
            return;
        }

        // Reload tasks and go to dashboard (session will be updated on next checkout)
        const { data: tasksData } = await supabase
            .from("mit_tasks")
            .select("*")
            .eq("user_id", userId)
            .eq("session_date", today)
            .order("created_at", { ascending: true });

        if (tasksData) {
            const loadedTasks: Task[] = tasksData.map((task) => ({
                id: task.id,
                text: task.title,
                completed: task.is_completed,
            }));
            setTasks(loadedTasks);
        }

        setPageState("dashboard");
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/login");
    };

    // Render based on page state
    if (pageState === "loading") {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-lg">Đang tải...</div>
            </div>
        );
    }

    if (pageState === "checkout-success") {
        return (
            <>
                <CheckoutSuccess
                    completedCount={checkoutStats.completedCount}
                    totalCount={checkoutStats.totalCount}
                    completionRate={checkoutStats.completionRate}
                    onViewHistory={() => setShowHistoryModal(true)}
                    onLogout={handleLogout}
                />
                <HistoryModal
                    isOpen={showHistoryModal}
                    onClose={() => setShowHistoryModal(false)}
                    onEditSession={handleEditSession}
                />
            </>
        );
    }

    if (pageState === "input") {
        return (
            <>
                <div className="min-h-screen bg-gray-900" />
                <TaskInputModal
                    isOpen={true}
                    onSubmit={handleTasksSubmit}
                />
            </>
        );
    }

    // Dashboard state
    return (
        <DashboardLayout
            tasks={tasks}
            onToggleTask={handleToggleTask}
            onLogout={handleLogout}
            onCheckout={handleCheckout}
        />
    );
};

export default DashboardPage;
