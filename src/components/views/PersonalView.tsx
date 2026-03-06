import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/* ===== Types ===== */
interface Task {
    id: string;
    text: string;
    completed: boolean;
}

interface LeaderboardEntry {
    full_name: string;
    department: string | null;
    total_xp: number;
}

interface PersonalViewProps {
    tasks: Task[];
    onToggleTask: (id: string) => void;
    onCheckout: () => Promise<void>;
    isCheckedOut: boolean;
    checkoutStats: { completedCount: number; totalCount: number; completionRate: number };
    onOpenAI: () => void;
}

const dailyQuotes = [
    "Tập trung vào 5 việc quan trọng nhất hôm nay, bạn sẽ tạo ra sự khác biệt lớn cho ngày mai.",
    "Không cần hoàn hảo, chỉ cần tiến bộ hơn ngày hôm qua một chút là đủ.",
    "Mỗi task nhỏ hoàn thành hôm nay là một viên gạch xây nên thành công lớn.",
    "Năng suất không phải là làm nhiều hơn, mà là tập trung vào điều đúng đắn.",
    "Bắt đầu từ việc khó nhất — phần còn lại sẽ nhẹ nhàng như gió.",
];

/* ===== Component ===== */
export const PersonalView = ({
    tasks,
    onToggleTask,
    onCheckout,
    isCheckedOut,
    onOpenAI,
}: PersonalViewProps) => {
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

    // Fetch leaderboard on mount
    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("full_name, department, total_xp")
                    .order("total_xp", { ascending: false })
                    .limit(3);
                if (data && !error) setLeaderboard(data as unknown as LeaderboardEntry[]);
            } catch (err) {
                console.error("Leaderboard fetch error:", err);
            }
        };
        fetchLeaderboard();
    }, []);

    const completedCount = tasks.filter((t) => t.completed).length;
    const totalCount = tasks.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // SVG progress ring
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (progressPercent / 100) * circumference;

    const today = new Date();
    const dayName = today.toLocaleDateString("vi-VN", { weekday: "long" });
    const dateStr = today.toLocaleDateString("vi-VN", { day: "numeric", month: "long" });

    const handleCheckout = async () => {
        setIsCheckingOut(true);
        await onCheckout();
        setIsCheckingOut(false);
    };

    return (
        <div className="split-pane flex-1 min-h-0">
            {/* ============================== */}
            {/* LEFT 70% — Task Panel          */}
            {/* ============================== */}
            <div className="task-panel">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <div className="flex items-center gap-2.5 mb-1">
                            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
                                Công việc hôm nay
                            </h2>
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] font-bold uppercase rounded-full tracking-wider">
                                Today
                            </span>
                        </div>
                        <p className="text-sm text-slate-400 capitalize">{dayName}, {dateStr}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl">
                        <span className="material-symbols-outlined text-emerald-500 text-[16px]">task_alt</span>
                        <span className="text-sm font-bold text-emerald-600">{completedCount}/{totalCount}</span>
                    </div>
                </div>

                {/* Task list */}
                <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide pb-3">
                    {tasks.map((task, index) => (
                        <div
                            key={task.id}
                            onClick={() => !isCheckedOut && onToggleTask(task.id)}
                            className={`task-card anim-fade-in-up anim-delay-${index + 1} ${isCheckedOut
                                ? (task.completed ? "task-card-locked" : "task-card-warning")
                                : task.completed
                                    ? "task-card-completed"
                                    : "task-card-pending ring-2 ring-transparent hover:ring-indigo-100 focus-within:ring-indigo-200 focus-within:border-indigo-300"
                                }`}
                        >
                            {/* Checkbox — Oversized */}
                            <div className="flex-shrink-0">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${task.completed
                                    ? "bg-indigo-500 shadow-lg shadow-indigo-500/30"
                                    : "border-[2.5px] border-slate-300 hover:border-indigo-400"
                                    }`}>
                                    {task.completed && (
                                        <span className="material-symbols-outlined text-white text-[18px]">check</span>
                                    )}
                                </div>
                            </div>
                            {/* Text — Larger */}
                            <div className="flex-1 min-w-0">
                                <span className={`block text-base font-semibold tracking-tight ${task.completed
                                    ? "text-slate-400 line-through decoration-slate-300"
                                    : "text-slate-700"
                                    }`}>
                                    {task.text}
                                </span>
                                {!task.completed && !isCheckedOut && index >= 3 && (
                                    <span className="text-xs text-indigo-400 mt-1 block font-medium">✦ Bổ sung</span>
                                )}
                            </div>
                            {/* Right action — Larger */}
                            {task.completed ? (
                                <span className="text-xs text-slate-300 font-medium flex-shrink-0">
                                    {new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                            ) : !isCheckedOut ? (
                                <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-all flex-shrink-0">
                                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>

                {/* Checkout */}
                <div className="pt-3 border-t border-slate-100 mt-auto">
                    {isCheckedOut ? (
                        <div className="checkout-btn checkout-btn-done">
                            <span className="flex items-center gap-2.5">
                                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                                Đã Check-out
                            </span>
                            <span className="text-sm font-medium opacity-70">Phiên đã kết thúc</span>
                        </div>
                    ) : (
                        <button onClick={handleCheckout} disabled={isCheckingOut} className="checkout-btn disabled:opacity-60">
                            <span className="flex items-center gap-2.5">
                                <span className="material-symbols-outlined text-[16px]">logout</span>
                                {isCheckingOut ? "Đang lưu..." : "Checkout"}
                            </span>
                            <span className="text-sm opacity-60 font-medium">Kết thúc ngày làm việc</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ============================== */}
            {/* RIGHT 30% — Widgets Column     */}
            {/* ============================== */}
            <div className="widgets-column">
                {/* Widget 0: Tiến độ hôm nay (Progress Ring) */}
                <div className="widget-card anim-fade-in-up">
                    <h3 className="text-[13px] font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-indigo-500">donut_large</span>
                        Tiến độ hôm nay
                    </h3>
                    <div className="flex items-center justify-center py-1">
                        <div className="relative">
                            <svg width="160" height="160" viewBox="0 0 200 200">
                                <circle className="progress-ring-bg" cx="100" cy="100" r={radius} strokeWidth="12" />
                                <circle
                                    className="progress-ring-fill"
                                    cx="100" cy="100" r={radius}
                                    strokeWidth="12"
                                    stroke="#6366f1"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={dashOffset}
                                    transform="rotate(-90 100 100)"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-extrabold text-slate-800">{progressPercent}%</span>
                                <span className="text-[11px] text-slate-400 mt-0.5">{completedCount} / {totalCount} tasks</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Widget 1: 🏆 Bảng Vàng */}
                <div className="widget-card anim-fade-in-up anim-delay-1">
                    <h3 className="text-[13px] font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <span className="text-base">🏆</span>
                        Bảng Vàng MITs
                    </h3>
                    <div className="space-y-0.5">
                        {leaderboard.length > 0 ? leaderboard.map((person, idx) => (
                            <div key={idx} className="leaderboard-item">
                                <div className={`leaderboard-rank leaderboard-rank-${idx + 1}`}>
                                    {idx + 1}
                                </div>
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-[11px] font-bold text-indigo-600">
                                        {(person.full_name || "?").split(" ").pop()?.charAt(0)}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-semibold text-slate-700 truncate">{person.full_name || "Ẩn danh"}</p>
                                    <p className="text-[10px] text-slate-400">{person.department || ""}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[13px]">🌟</span>
                                    <span className="text-sm font-extrabold text-indigo-600">{person.total_xp}</span>
                                </div>
                            </div>
                        )) : (
                            <p className="text-xs text-slate-400 text-center py-3">Chưa có dữ liệu</p>
                        )}
                    </div>
                </div>

                {/* Widget 2: 🤖 Phân tích AI */}
                <button onClick={onOpenAI} className="ai-card text-left anim-fade-in-up anim-delay-2 w-full">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-[13px]">Phân Tích AI</h4>
                            <p className="text-[11px] text-white/70 mt-0.5">Nhận gợi ý tối ưu</p>
                        </div>
                        <span className="material-symbols-outlined text-[18px] opacity-60">arrow_forward</span>
                    </div>
                </button>

                {/* Widget 3: 💡 Cảm hứng mỗi ngày */}
                <div className="bg-gradient-to-br from-amber-50 to-white border border-slate-200 rounded-xl p-5 anim-fade-in-up anim-delay-3">
                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                        <span className="text-base">💡</span>
                        Cảm hứng mỗi ngày
                    </h3>
                    <p className="italic text-slate-600 text-sm mt-3 leading-relaxed">
                        "{dailyQuotes[Math.floor(Math.random() * dailyQuotes.length)]}"
                    </p>
                </div>
            </div>
        </div>
    );
};
