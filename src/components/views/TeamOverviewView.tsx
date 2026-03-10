import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    ResponsiveContainer,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Area,
    AreaChart,
    BarChart,
    Bar,
    Cell,
} from "recharts";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface TeamMember {
    id: string;
    full_name: string | null;
    employee_code: string | null;
    department: string | null;
    total_xp: number;
    completedInPeriod: number;
    totalInPeriod: number;
}

interface DayData {
    date: string;
    label: string;
    rate: number;
    completed: number;
    total: number;
}

interface DeptPerformance {
    department: string;
    rate: number;
}

/* ===== Constants ===== */
const TIME_OPTIONS = [
    { value: "today", label: "📅 Hôm nay" },
    { value: "7", label: "📅 7 ngày qua" },
    { value: "14", label: "📅 14 ngày qua" },
    { value: "30", label: "📅 30 ngày qua" },
    { value: "custom", label: "📅 Tùy chỉnh..." },
] as const;

const BAR_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8", "#6366f1", "#7c3aed", "#a855f7", "#7e22ce", "#4f46e5"];

const DEPT_OPTIONS = ["BOD", "HR", "OPS", "MKT", "ACC", "CX", "QAQC", "R&D", "SP", "BD"] as const;

/* ===== Component ===== */
export const TeamOverviewView = ({
    userDepartment,
    userRole,
}: {
    userDepartment: string | null;
    userRole: string;
}) => {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [trendData, setTrendData] = useState<DayData[]>([]);
    const [deptPerformances, setDeptPerformances] = useState<DeptPerformance[]>([]);
    const [periodMetrics, setPeriodMetrics] = useState({ completed: 0, total: 0, rate: 0, backlog: 0 });
    const [loading, setLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(false);

    /* Date range state — DEFAULT: Hôm nay */
    const today = new Date();

    const [dateFrom, setDateFrom] = useState(() => fmtDate(today));
    const [dateTo, setDateTo] = useState(() => fmtDate(today));
    const [timeFilter, setTimeFilter] = useState<string>("today");
    const [showCustomDates, setShowCustomDates] = useState(false);

    /* Department filter */
    const isAdmin = userRole === "admin";
    const [filterDepartment, setFilterDepartment] = useState<string>(userDepartment || "all");

    /* Profiles cache */
    const [profilesCache, setProfilesCache] = useState<any[]>([]);

    function fmtDate(d: Date) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    function fmtLabel(d: Date) {
        return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    }

    /* Build days array */
    const buildDays = useCallback((from: string, to: string) => {
        const days: { date: string; label: string }[] = [];
        const start = new Date(from);
        const end = new Date(to);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            days.push({ date: fmtDate(d), label: fmtLabel(d) });
        }
        return days;
    }, []);

    /* Fetch all profiles (once) */
    useEffect(() => {
        const fetchProfiles = async () => {
            try {
                // Lấy tất cả profiles KHÔNG phải pending (bao gồm cả status = NULL từ user cũ)
                const { data: profiles, error } = await (supabase as any)
                    .from("profiles")
                    .select("id, full_name, employee_code, total_xp, department")
                    .neq("status", "pending");
                if (error || !profiles) { setLoading(false); return; }
                setProfilesCache(profiles);
            } catch (err) {
                console.error("TeamOverview profiles error:", err);
                setLoading(false);
            }
        };
        fetchProfiles();
    }, []);

    /* Filtered profiles by department */
    const filteredProfiles = useMemo(() => {
        if (filterDepartment === "all") return profilesCache;
        return profilesCache.filter((p: any) => p.department === filterDepartment);
    }, [profilesCache, filterDepartment]);

    /* Main data fetch — refreshDashboardData() */
    const refreshDashboardData = useCallback(async (profiles: any[], allProfiles: any[], from: string, to: string) => {
        if (!profiles.length && filterDepartment !== "all") { setLoading(false); setMembers([]); setTrendData([]); setPeriodMetrics({ completed: 0, total: 0, rate: 0, backlog: 0 }); return; }
        setChartLoading(true);
        try {
            const days = buildDays(from, to);
            const memberIds = profiles.map((p: any) => p.id);
            const allMemberIds = allProfiles.map((p: any) => p.id);

            // Fetch tasks for filtered members
            const { data: allTasks } = memberIds.length > 0 ? await (supabase as any)
                .from("mit_tasks")
                .select("user_id, session_date, is_completed")
                .in("user_id", memberIds)
                .gte("session_date", days[0].date)
                .lte("session_date", days[days.length - 1].date) : { data: [] };

            // Fetch ALL tasks for dept performance comparison
            const { data: allDeptTasks } = allMemberIds.length > 0 ? await (supabase as any)
                .from("mit_tasks")
                .select("user_id, session_date, is_completed")
                .in("user_id", allMemberIds)
                .gte("session_date", days[0].date)
                .lte("session_date", days[days.length - 1].date) : { data: [] };

            const tasks = allTasks || [];
            const deptTasks = allDeptTasks || [];

            // Trend data
            const trend: DayData[] = days.map(({ date, label }) => {
                const dayTasks = tasks.filter((t: any) => t.session_date === date);
                const total = dayTasks.length;
                const completed = dayTasks.filter((t: any) => t.is_completed).length;
                const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
                return { date, label, rate, completed, total };
            });
            setTrendData(trend);

            // Member data (period-based, not just today)
            const enriched: TeamMember[] = profiles.map((p: any) => {
                const mt = tasks.filter((t: any) => t.user_id === p.id);
                return {
                    id: p.id,
                    full_name: p.full_name,
                    employee_code: p.employee_code,
                    department: p.department,
                    total_xp: p.total_xp || 0,
                    completedInPeriod: mt.filter((t: any) => t.is_completed).length,
                    totalInPeriod: mt.length,
                };
            });
            enriched.sort((a, b) => {
                const rateA = a.totalInPeriod > 0 ? a.completedInPeriod / a.totalInPeriod : 0;
                const rateB = b.totalInPeriod > 0 ? b.completedInPeriod / b.totalInPeriod : 0;
                return rateB - rateA || b.total_xp - a.total_xp;
            });
            setMembers(enriched);

            // Compute period metrics in-function (guaranteed sync with dept filter)
            const pCompleted = enriched.reduce((s, m) => s + m.completedInPeriod, 0);
            const pTotal = enriched.reduce((s, m) => s + m.totalInPeriod, 0);
            const pRate = pTotal > 0 ? Math.round((pCompleted / pTotal) * 100) : 0;
            setPeriodMetrics({ completed: pCompleted, total: pTotal, rate: pRate, backlog: pTotal - pCompleted });

            // Dept performance (ALL departments)
            const deptMap: Record<string, { completed: number; total: number }> = {};
            allProfiles.forEach((p: any) => {
                if (!p.department) return;
                if (!deptMap[p.department]) deptMap[p.department] = { completed: 0, total: 0 };
            });
            deptTasks.forEach((t: any) => {
                const profile = allProfiles.find((p: any) => p.id === t.user_id);
                if (!profile?.department) return;
                if (!deptMap[profile.department]) deptMap[profile.department] = { completed: 0, total: 0 };
                deptMap[profile.department].total++;
                if (t.is_completed) deptMap[profile.department].completed++;
            });
            const perfArr: DeptPerformance[] = Object.entries(deptMap)
                .filter(([, v]) => v.total > 0)
                .map(([dept, v]) => ({ department: dept, rate: Math.round((v.completed / v.total) * 100) }))
                .sort((a, b) => b.rate - a.rate);
            setDeptPerformances(perfArr);
        } catch (err) {
            console.error("TeamOverview fetch error:", err);
        } finally {
            setLoading(false);
            setChartLoading(false);
        }
    }, [buildDays, filterDepartment]);

    /* Trigger refresh when data/filters change */
    useEffect(() => {
        if (profilesCache.length) {
            refreshDashboardData(filteredProfiles, profilesCache, dateFrom, dateTo);
        }
    }, [filteredProfiles, profilesCache, dateFrom, dateTo, refreshDashboardData]);

    /* Real-time subscription: refresh khi mit_tasks thay đổi */
    useEffect(() => {
        const channel = (supabase as any)
            .channel("team-overview-realtime")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "mit_tasks" },
                () => {
                    if (profilesCache.length) {
                        refreshDashboardData(filteredProfiles, profilesCache, dateFrom, dateTo);
                    }
                }
            )
            .subscribe();

        return () => {
            (supabase as any).removeChannel(channel);
        };
    }, [profilesCache, filteredProfiles, dateFrom, dateTo, refreshDashboardData]);

    /* Time filter change */
    const handleTimeFilter = (value: string) => {
        setTimeFilter(value);
        const t = new Date();
        if (value === "today") {
            setDateFrom(fmtDate(t));
            setDateTo(fmtDate(t));
            setShowCustomDates(false);
        } else if (value === "custom") {
            setShowCustomDates(true);
        } else {
            const days = parseInt(value);
            const f = new Date(t);
            f.setDate(f.getDate() - (days - 1));
            setDateFrom(fmtDate(f));
            setDateTo(fmtDate(t));
            setShowCustomDates(false);
        }
    };

    /* Custom date change */
    const handleDateChange = (type: "from" | "to", value: string) => {
        if (type === "from") setDateFrom(value);
        else setDateTo(value);
    };

    const isToday = timeFilter === "today";

    /* ===== Export Excel ===== */
    const exportExcel = () => {
        const wsData = [
            ["Ngày", "Hoàn thành", "Tổng cộng", "Tỉ lệ (%)"],
            ...trendData.map(d => [d.label, d.completed, d.total, d.rate]),
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Xu hướng MITs");

        const msData = [
            ["#", "Họ tên", "Mã NV", "Phòng ban", "Hoàn thành", "Tổng", "Tỉ lệ (%)", "XP"],
            ...members.map((m, i) => {
                const rate = m.totalInPeriod > 0 ? Math.round((m.completedInPeriod / m.totalInPeriod) * 100) : 0;
                return [i + 1, m.full_name || "—", m.employee_code || "—", m.department || "—", m.completedInPeriod, m.totalInPeriod, rate, m.total_xp];
            }),
        ];
        const ms = XLSX.utils.aoa_to_sheet(msData);
        ms["!cols"] = [{ wch: 5 }, { wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, ms, "Bảng xếp hạng");

        const deptLabel = filterDepartment === "all" ? "AllDepts" : filterDepartment;
        XLSX.writeFile(wb, `MITs_Team_${deptLabel}_${dateFrom}_${dateTo}.xlsx`);
    };

    /* ===== Export PDF ===== */
    const exportPDF = async () => {
        try {
            const fontResponse = await fetch("/fonts/Roboto-Regular.ttf");
            const fontBuffer = await fontResponse.arrayBuffer();
            const fontBase64 = btoa(
                new Uint8Array(fontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
            );

            const doc = new jsPDF();
            doc.addFileToVFS("Roboto-Regular.ttf", fontBase64);
            doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
            doc.setFont("Roboto", "normal");

            const deptLabel = filterDepartment === "all" ? "Toàn công ty" : filterDepartment;
            doc.setFontSize(16);
            doc.text(`Báo cáo MITs — ${deptLabel}`, 14, 20);
            doc.setFontSize(10);
            doc.text(`Từ ${dateFrom} đến ${dateTo}`, 14, 28);

            autoTable(doc, {
                startY: 35,
                head: [["Ngày", "Hoàn thành", "Tổng cộng", "Tỉ lệ (%)"]],
                body: trendData.map(d => [d.label, d.completed, d.total, `${d.rate}%`]),
                theme: "grid",
                headStyles: { fillColor: [99, 102, 241], font: "Roboto" },
                styles: { fontSize: 9, font: "Roboto" },
            });

            const finalY = (doc as any).lastAutoTable?.finalY || 40;
            doc.setFont("Roboto", "normal");
            doc.setFontSize(12);
            doc.text("Bảng xếp hạng", 14, finalY + 12);

            autoTable(doc, {
                startY: finalY + 18,
                head: [["#", "Họ tên", "Mã NV", "P.Ban", "HT", "Tổng", "%", "XP"]],
                body: members.map((m, i) => {
                    const rate = m.totalInPeriod > 0 ? Math.round((m.completedInPeriod / m.totalInPeriod) * 100) : 0;
                    return [i + 1, m.full_name || "—", m.employee_code || "—", m.department || "—", m.completedInPeriod, m.totalInPeriod, `${rate}%`, m.total_xp];
                }),
                theme: "grid",
                headStyles: { fillColor: [99, 102, 241], font: "Roboto" },
                styles: { fontSize: 9, font: "Roboto" },
            });

            doc.save(`MITs_Team_${deptLabel}_${dateFrom}_${dateTo}.pdf`);
        } catch (err) {
            console.error("PDF export error:", err);
            alert("Lỗi khi xuất PDF. Vui lòng thử lại.");
        }
    };

    /* ===== Computed metrics (from state — guaranteed sync with filters) ===== */
    const { completed: periodCompleted, total: periodTotal, rate: periodRate, backlog: periodBacklog } = periodMetrics;

    const topDept = deptPerformances[0] || null;
    const bottomDept = deptPerformances.length > 1 ? deptPerformances[deptPerformances.length - 1] : null;

    const rangeLabel = timeFilter === "today" ? "Hôm nay" : timeFilter === "custom" ? `${dateFrom} → ${dateTo}` : `${timeFilter} ngày qua`;

    /* Custom Tooltip */
    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null;
        const d = payload[0].payload as DayData;
        return (
            <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-xl px-4 py-3 shadow-lg">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{d.label}</p>
                <p className="text-lg font-extrabold text-indigo-600 mt-0.5">{d.rate}%</p>
                <p className="text-[11px] text-slate-400">{d.completed}/{d.total} MITs hoàn thành</p>
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-10 anim-fade-in-up">
            {/* ===== HEADER + GLOBAL FILTERS ===== */}
            <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    {/* Title */}
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-3">
                            <span className="material-symbols-outlined text-[28px] text-indigo-500">groups</span>
                            Tổng quan Team
                        </h2>
                        <p className="text-[15px] text-slate-400 mt-1">
                            Theo dõi tiến độ {filterDepartment === "all" ? <span className="font-bold text-indigo-500">toàn công ty</span> : <>phòng <span className="font-bold text-indigo-500">{filterDepartment}</span></>}
                            {" "}• <span className="text-slate-300">{rangeLabel}</span>
                        </p>
                    </div>

                    {/* Global Filters (right side) — CHỈ 2 DROPDOWN */}
                    <div className="flex items-center gap-2.5">
                        {/* Dropdown 1: Phòng ban */}
                        {isAdmin && (
                            <select
                                value={filterDepartment}
                                onChange={e => setFilterDepartment(e.target.value)}
                                className="px-3 py-2 text-[13px] font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm hover:shadow"
                            >
                                <option value="all">🏢 Toàn công ty</option>
                                {DEPT_OPTIONS.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        )}

                        {/* Dropdown 2: Thời gian */}
                        <select
                            value={timeFilter}
                            onChange={e => handleTimeFilter(e.target.value)}
                            className="px-3 py-2 text-[13px] font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm hover:shadow"
                        >
                            {TIME_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Custom date row — CHỈ hiện khi chọn "Tùy chỉnh" */}
                {showCustomDates && (
                    <div className="flex items-center gap-2 mt-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase">Từ</label>
                        <input
                            type="date"
                            value={dateFrom}
                            max={dateTo}
                            onChange={e => handleDateChange("from", e.target.value)}
                            className="px-2.5 py-1.5 text-[12px] rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
                        />
                        <label className="text-[11px] font-bold text-slate-400 uppercase">Đến</label>
                        <input
                            type="date"
                            value={dateTo}
                            min={dateFrom}
                            max={fmtDate(new Date())}
                            onChange={e => handleDateChange("to", e.target.value)}
                            className="px-2.5 py-1.5 text-[12px] rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
                        />
                    </div>
                )}
            </div>

            {/* ===== 3 METRIC CARDS ===== */}
            <div className="grid grid-cols-3 gap-4">
                {/* Card 1: Tỉ lệ Hoàn thành MITs */}
                <div className="bg-white rounded-2xl border border-slate-200/80 px-6 py-5 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        🎯 Tỉ lệ Hoàn thành MITs
                    </p>
                    <p className={`text-3xl font-extrabold mt-2 ${periodRate >= 80 ? "text-emerald-600" : periodRate >= 50 ? "text-amber-500" : "text-red-500"}`}>
                        {periodRate}%
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">Thực tế trong kỳ • {periodCompleted}/{periodTotal} MITs</p>
                </div>

                {/* Card 2: MITs Tồn đọng */}
                <div className="bg-white rounded-2xl border border-slate-200/80 px-6 py-5 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        ⚠️ MITs Tồn đọng
                    </p>
                    <p className={`text-3xl font-extrabold mt-2 ${periodBacklog > 0 ? "text-red-500" : "text-emerald-600"}`}>
                        {periodBacklog}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                        {periodBacklog > 0 ? "Công việc chưa hoàn thành" : "Không có tồn đọng 🎉"}
                    </p>
                </div>

                {/* Card 3: Tiêu điểm Hiệu suất */}
                <div className="bg-white rounded-2xl border border-slate-200/80 px-6 py-5 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        📊 Tiêu điểm Hiệu suất
                    </p>
                    <div className="mt-2 space-y-1.5">
                        {topDept ? (
                            <p className="text-[13px] font-semibold text-slate-700">
                                <span className="text-amber-500">🏆</span> Dẫn đầu:{" "}
                                <span className="font-bold text-emerald-600">{topDept.department}</span>
                                <span className="ml-1.5 text-emerald-600 font-extrabold">{topDept.rate}%</span>
                            </p>
                        ) : (
                            <p className="text-[13px] text-slate-300 italic">Chưa có dữ liệu</p>
                        )}
                        {bottomDept ? (
                            <p className="text-[13px] font-semibold text-slate-700">
                                <span className="text-red-400">🚩</span> Cần chú ý:{" "}
                                <span className="font-bold text-red-500">{bottomDept.department}</span>
                                <span className="ml-1.5 text-red-500 font-extrabold">{bottomDept.rate}%</span>
                            </p>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* ===== 📈 CHART ===== */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                {/* Chart Header */}
                <div className="px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <h3 className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[20px] text-indigo-500">{isToday ? "bar_chart" : "show_chart"}</span>
                            {isToday ? "Tiến độ phòng ban hôm nay" : "Xu hướng hoàn thành MITs"}
                        </h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={exportExcel}
                                disabled={trendData.length === 0 && deptPerformances.length === 0}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-[16px]">table_view</span>
                                Excel
                            </button>
                            <button
                                onClick={exportPDF}
                                disabled={trendData.length === 0 && deptPerformances.length === 0}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                                PDF
                            </button>
                        </div>
                    </div>
                </div>

                {/* Chart Body — DUAL MODE */}
                <div className="px-6 py-6">
                    {(loading || chartLoading) ? (
                        <div className="h-72 flex items-center justify-center">
                            <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full anim-spin" />
                        </div>
                    ) : isToday ? (
                        /* ===== TODAY → BarChart phòng ban ===== */
                        deptPerformances.length === 0 ? (
                            <div className="h-72 flex items-center justify-center">
                                <p className="text-sm text-slate-300">Chưa có dữ liệu hôm nay</p>
                            </div>
                        ) : (
                            <div className="h-72" id="teamProgressChart">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={deptPerformances} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                        <XAxis
                                            type="number"
                                            domain={[0, 100]}
                                            tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
                                            tickFormatter={(v: number) => `${v}%`}
                                            axisLine={{ stroke: "#e2e8f0" }}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="department"
                                            tick={{ fontSize: 13, fill: "#475569", fontWeight: 600 }}
                                            axisLine={false}
                                            tickLine={false}
                                            width={55}
                                        />
                                        <Tooltip
                                            formatter={(value: any) => [`${value}%`, "Tỉ lệ HT"]}
                                            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                                        />
                                        <Bar dataKey="rate" radius={[0, 8, 8, 0]} barSize={28}>
                                            {deptPerformances.map((_, idx) => (
                                                <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )
                    ) : (
                        /* ===== RANGE → AreaChart xu hướng ===== */
                        trendData.every(d => d.total === 0) ? (
                            <div className="h-72 flex items-center justify-center">
                                <p className="text-sm text-slate-300">Chưa có dữ liệu trong khoảng thời gian đã chọn</p>
                            </div>
                        ) : (
                            <div className="h-72" id="teamProgressChart">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="gradientIndigo" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                                                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis
                                            dataKey="label"
                                            tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
                                            axisLine={{ stroke: "#e2e8f0" }}
                                            tickLine={false}
                                            interval={trendData.length > 14 ? Math.floor(trendData.length / 7) : 0}
                                        />
                                        <YAxis
                                            domain={[0, 100]}
                                            tick={{ fontSize: 12, fill: "#94a3b8", fontWeight: 500 }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(v: number) => `${v}%`}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area
                                            type="monotone"
                                            dataKey="rate"
                                            stroke="#6366f1"
                                            strokeWidth={2.5}
                                            fill="url(#gradientIndigo)"
                                            dot={trendData.length <= 14 ? { r: 4, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 } : false}
                                            activeDot={{ r: 6, fill: "#4f46e5", stroke: "#fff", strokeWidth: 2 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* ===== LEADERBOARD ===== */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px] text-indigo-500">leaderboard</span>
                        Bảng xếp hạng — {rangeLabel}
                    </h3>
                    <span className="text-[12px] text-slate-400">{members.length} thành viên</span>
                </div>

                {/* Table header */}
                <div className="grid grid-cols-12 gap-3 px-6 py-2.5 border-b border-slate-100 bg-slate-50/50">
                    <div className="col-span-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">#</div>
                    <div className="col-span-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Thành viên</div>
                    <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phòng ban</div>
                    <div className="col-span-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tiến độ trong kỳ</div>
                    <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Tỉ lệ</div>
                    <div className="col-span-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">XP</div>
                </div>

                {loading ? (
                    <div className="px-6 py-12 text-center">
                        <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full anim-spin mx-auto" />
                        <p className="text-sm text-slate-400 mt-3">Đang tải dữ liệu team...</p>
                    </div>
                ) : members.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <span className="material-symbols-outlined text-5xl text-slate-200">group_off</span>
                        <p className="text-sm text-slate-400 mt-3">Không tìm thấy thành viên</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {members.map((m, idx) => {
                            const rate = m.totalInPeriod > 0 ? Math.round((m.completedInPeriod / m.totalInPeriod) * 100) : 0;
                            const rankColors = ["text-amber-500", "text-slate-400", "text-orange-400"];
                            const rankIcons = ["emoji_events", "military_tech", "military_tech"];

                            return (
                                <div key={m.id} className="grid grid-cols-12 gap-3 px-6 py-3.5 items-center hover:bg-slate-50/50 transition-colors">
                                    {/* Rank */}
                                    <div className="col-span-1 flex-shrink-0">
                                        {idx < 3 ? (
                                            <span className={`material-symbols-outlined text-[20px] ${rankColors[idx]}`}>{rankIcons[idx]}</span>
                                        ) : (
                                            <span className="text-[13px] font-bold text-slate-300">{idx + 1}</span>
                                        )}
                                    </div>
                                    {/* Name */}
                                    <div className="col-span-3 flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center flex-shrink-0 border border-indigo-200/50">
                                            <span className="text-xs font-bold text-indigo-600">
                                                {(m.full_name || "?").charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-semibold text-slate-700 truncate">{m.full_name || "—"}</p>
                                            <p className="text-[10px] text-slate-400 font-mono">{m.employee_code || "—"}</p>
                                        </div>
                                    </div>
                                    {/* Department */}
                                    <div className="col-span-2">
                                        <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 text-slate-500">
                                            {m.department || "—"}
                                        </span>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="col-span-3 flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${rate >= 80 ? "bg-emerald-400" : rate >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                                                style={{ width: `${rate}%` }}
                                            />
                                        </div>
                                        <span className="text-[11px] font-semibold text-slate-500 w-14 text-right">
                                            {m.completedInPeriod}/{m.totalInPeriod}
                                        </span>
                                    </div>
                                    {/* Rate */}
                                    <div className="col-span-2 text-right">
                                        <span className={`text-[14px] font-extrabold ${rate >= 80 ? "text-emerald-600" : rate >= 50 ? "text-amber-500" : "text-red-500"}`}>
                                            {rate}%
                                        </span>
                                    </div>
                                    {/* XP */}
                                    <div className="col-span-1 text-right">
                                        <p className="text-[13px] font-extrabold text-indigo-600">{m.total_xp.toLocaleString()}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
