import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    getPoints, generateSmoothPath, generateAreaPath, chartDimensions,
} from "@/utils/chart-config";

/* ===== Types ===== */
interface DayData {
    label: string;
    fullLabel: string;
    completed: number;
    total: number;
}
interface HeroMetrics {
    totalXp: number;
    excellentDays: number;
    avgCompletion: number;
}
interface HistoryTask {
    title: string;
    is_completed: boolean;
}
interface HistoryDay {
    session_date: string;
    completed_tasks: number;
    total_tasks: number;
    tasks: HistoryTask[];
}

export const JourneyView = () => {
    const [openDays, setOpenDays] = useState<Record<number, boolean>>({ 0: true });
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
    const [filterMonth, setFilterMonth] = useState("03/2026");
    const [visibleCount, setVisibleCount] = useState(3);

    const [hero, setHero] = useState<HeroMetrics>({ totalXp: 0, excellentDays: 0, avgCompletion: 0 });
    const [chartData, setChartData] = useState<DayData[]>([]);
    const [historyDays, setHistoryDays] = useState<HistoryDay[]>([]);
    const [loading, setLoading] = useState(true);

    // ===== FETCH ALL DATA ON MOUNT =====
    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const uid = user.id;

                const [monthStr, yearStr] = filterMonth.split("/");
                const monthStart = `${yearStr}-${monthStr.padStart(2, "0")}-01`;
                const monthEnd = `${yearStr}-${monthStr.padStart(2, "0")}-31`;

                // ===== ALL QUERIES IN PARALLEL (was sequential before) =====
                const [profileRes, chartRes, monthSessionsRes, monthTasksRes] = await Promise.all([
                    // 1. Profile XP
                    supabase.from("profiles").select("total_xp").eq("id", uid).single(),
                    // 2. Chart — last 7 sessions
                    supabase.from("mit_sessions")
                        .select("session_date, completed_tasks, total_tasks")
                        .eq("user_id", uid)
                        .order("session_date", { ascending: true })
                        .limit(7),
                    // 3. Month sessions (hero metrics + history)
                    supabase.from("mit_sessions")
                        .select("session_date, completed_tasks, total_tasks, completion_rate")
                        .eq("user_id", uid)
                        .gte("session_date", monthStart)
                        .lte("session_date", monthEnd)
                        .order("session_date", { ascending: false }),
                    // 4. ALL tasks for the month in ONE query (was N queries before)
                    supabase.from("mit_tasks")
                        .select("session_date, title, is_completed")
                        .eq("user_id", uid)
                        .gte("session_date", monthStart)
                        .lte("session_date", monthEnd),
                ]);

                // --- Hero Metrics ---
                const totalXp = (profileRes.data as unknown as { total_xp: number })?.total_xp || 0;
                const monthSessions = (monthSessionsRes.data || []) as unknown as { session_date: string; completed_tasks: number; total_tasks: number; completion_rate: number }[];
                const excellentDays = monthSessions.filter((s) => s.completion_rate === 100).length;
                const avgCompletion = monthSessions.length > 0
                    ? Math.round(monthSessions.reduce((sum, s) => sum + s.completion_rate, 0) / monthSessions.length)
                    : 0;
                setHero({ totalXp, excellentDays, avgCompletion });

                // --- Chart ---
                const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
                const cData: DayData[] = ((chartRes.data || []) as unknown as { session_date: string; completed_tasks: number; total_tasks: number }[]).map((s) => {
                    const d = new Date(s.session_date);
                    return {
                        label: dayNames[d.getDay()],
                        fullLabel: d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" }),
                        completed: s.completed_tasks,
                        total: s.total_tasks,
                    };
                });
                setChartData(cData);

                // --- History: group tasks by session_date client-side ---
                const allTasks = (monthTasksRes.data || []) as unknown as { session_date: string; title: string; is_completed: boolean }[];
                const tasksByDate = new Map<string, HistoryTask[]>();
                for (const t of allTasks) {
                    const existing = tasksByDate.get(t.session_date) || [];
                    existing.push({ title: t.title, is_completed: t.is_completed });
                    tasksByDate.set(t.session_date, existing);
                }

                const historyArr: HistoryDay[] = monthSessions.map((sess) => ({
                    session_date: sess.session_date,
                    completed_tasks: sess.completed_tasks,
                    total_tasks: sess.total_tasks,
                    tasks: tasksByDate.get(sess.session_date) || [],
                }));
                setHistoryDays(historyArr);
            } catch (err) {
                console.error("Journey data fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [filterMonth]);

    const toggleDay = (index: number) => setOpenDays((prev) => ({ ...prev, [index]: !prev[index] }));
    const visibleDays = historyDays.slice(0, visibleCount);
    const hasMore = visibleCount < historyDays.length;

    // Chart SVG
    const points = chartData.length >= 2 ? getPoints(chartData) : [];
    const linePath = points.length >= 2 ? generateSmoothPath(points) : "";
    const areaPath = points.length >= 2 ? generateAreaPath(points) : "";
    const { width: W, height: H, padX, padY } = chartDimensions;

    // Hero cards config
    const heroCards = [
        { icon: "🌟", color: "from-indigo-50 to-violet-50", iconBg: "bg-indigo-100", title: "Điểm kinh nghiệm (XP)", value: `${hero.totalXp.toLocaleString()} XP`, sub: "Tích lũy toàn bộ" },
        { icon: "👑", color: "from-amber-50 to-yellow-50", iconBg: "bg-amber-100", title: "Ngày làm việc xuất sắc", value: `${hero.excellentDays} Ngày`, sub: "Hoàn thành 100% task trong tháng" },
        { icon: "🎯", color: "from-emerald-50 to-green-50", iconBg: "bg-emerald-100", title: "Tỷ lệ hoàn thành MITs", value: `${hero.avgCompletion}%`, sub: `Tháng ${filterMonth}` },
    ];

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === today.toDateString()) return `Hôm nay, ${d.toLocaleDateString("vi-VN")}`;
        if (d.toDateString() === yesterday.toDateString()) return `Hôm qua, ${d.toLocaleDateString("vi-VN")}`;
        return d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <span className="material-symbols-outlined text-4xl text-indigo-300 animate-spin">progress_activity</span>
                    <p className="text-sm text-slate-400 mt-2">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-6">
            {/* BLOCK 1: Hero Metrics */}
            <div className="hero-grid anim-fade-in-up">
                {heroCards.map((card, i) => (
                    <div key={i} className={`hero-card bg-gradient-to-br ${card.color}`}>
                        <div className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-xl">{card.icon}</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{card.title}</p>
                            <p className="text-2xl font-extrabold text-slate-800 mt-0.5 tracking-tight">{card.value}</p>
                            <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* BLOCK 2: Interactive Chart */}
            <div className="chart-card anim-fade-in-up anim-delay-1">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-500 text-[18px]">show_chart</span>
                        Nhịp độ công việc gần đây
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">MITs hoàn thành / ngày</span>
                </div>
                {chartData.length >= 2 ? (
                    <div className="relative h-56 w-full">
                        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                            <defs>
                                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
                                </linearGradient>
                                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#6366f1" />
                                    <stop offset="100%" stopColor="#a78bfa" />
                                </linearGradient>
                            </defs>
                            {[0, 1, 2, 3, 4, 5].map((v) => {
                                const y = padY + (H - padY * 2) - (v / 5) * (H - padY * 2);
                                return (
                                    <g key={v}>
                                        <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="#e8ecf4" strokeWidth="1" strokeDasharray={v === 0 ? "0" : "4 4"} />
                                        <text x={padX - 8} y={y + 4} textAnchor="end" className="fill-slate-400" fontSize="11" fontWeight="500">{v}</text>
                                    </g>
                                );
                            })}
                            <path d={areaPath} fill="url(#areaGrad)" />
                            <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinecap="round" />
                            {points.map((p, i) => (
                                <g key={i}>
                                    <circle cx={p.x} cy={p.y} r={16} fill="transparent"
                                        onMouseEnter={() => setHoveredPoint(i)} onMouseLeave={() => setHoveredPoint(null)}
                                        style={{ cursor: "pointer" }} />
                                    <circle cx={p.x} cy={p.y} r={hoveredPoint === i ? 6 : 4}
                                        fill="white" stroke="#6366f1" strokeWidth="2.5" style={{ transition: "r 0.15s ease" }} />
                                </g>
                            ))}
                            {chartData.map((d, i) => (
                                <text key={i} x={points[i].x} y={H - 4} textAnchor="middle" className="fill-slate-400" fontSize="11" fontWeight="600">
                                    {d.label}
                                </text>
                            ))}
                        </svg>
                        {hoveredPoint !== null && (
                            <div className="chart-tooltip anim-fade-in" style={{
                                left: `${(points[hoveredPoint].x / W) * 100}%`,
                                top: `${(points[hoveredPoint].y / H) * 100}%`,
                            }}>
                                {chartData[hoveredPoint].fullLabel}: {chartData[hoveredPoint].completed}/{chartData[hoveredPoint].total} MITs
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
                        <p>Chưa đủ dữ liệu để hiển thị biểu đồ (cần ít nhất 2 ngày checkout)</p>
                    </div>
                )}
            </div>

            {/* BLOCK 3: Accordion History */}
            <div className="anim-fade-in-up anim-delay-2">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-500 text-[18px]">history</span>
                        Nhật ký công việc
                    </h3>
                    <select
                        value={filterMonth}
                        onChange={(e) => { setFilterMonth(e.target.value); setVisibleCount(3); }}
                        className="text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 cursor-pointer"
                    >
                        <option value="03/2026">Tháng 3/2026</option>
                        <option value="02/2026">Tháng 2/2026</option>
                        <option value="01/2026">Tháng 1/2026</option>
                    </select>
                </div>

                {visibleDays.length > 0 ? (
                    <div className="space-y-3">
                        {visibleDays.map((day, idx) => {
                            const isOpen = openDays[idx] ?? false;
                            const isComplete = day.completed_tasks === day.total_tasks;
                            return (
                                <div key={idx} className="accordion-card">
                                    <div className="accordion-header" onClick={() => toggleDay(idx)}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isComplete ? "bg-emerald-100" : "bg-amber-100"}`}>
                                                <span className="material-symbols-outlined text-[16px]" style={{ color: isComplete ? "#059669" : "#d97706" }}>
                                                    {isComplete ? "check_circle" : "schedule"}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-700">{formatDate(day.session_date)}</p>
                                                <p className={`text-xs font-medium ${isComplete ? "text-emerald-600" : "text-amber-600"}`}>
                                                    Hoàn thành {day.completed_tasks}/{day.total_tasks}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`material-symbols-outlined text-slate-400 text-[20px] accordion-chevron ${isOpen ? "accordion-chevron-open" : ""}`}>
                                            expand_more
                                        </span>
                                    </div>
                                    {isOpen && (
                                        <div className="accordion-body anim-slide-up">
                                            <div className="space-y-1.5">
                                                {day.tasks.map((task, ti) => (
                                                    <div key={ti} className="history-task">
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${task.is_completed ? "bg-emerald-100" : "bg-red-100"
                                                            }`}>
                                                            <span className={`material-symbols-outlined text-[14px] ${task.is_completed ? "text-emerald-600" : "text-red-500"
                                                                }`}>
                                                                {task.is_completed ? "check" : "close"}
                                                            </span>
                                                        </div>
                                                        <span className={`text-sm ${task.is_completed ? "text-slate-600" : "text-red-500 font-medium"
                                                            }`}>
                                                            {task.title}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-400 text-sm">
                        Chưa có dữ liệu nhật ký cho tháng này
                    </div>
                )}

                {hasMore && (
                    <button
                        onClick={() => setVisibleCount((prev) => prev + 3)}
                        className="w-full mt-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="text-base">👇</span>
                        Xem thêm (Load more)
                    </button>
                )}
            </div>
        </div>
    );
};
