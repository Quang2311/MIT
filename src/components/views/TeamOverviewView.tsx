import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    ResponsiveContainer,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Area,
    AreaChart,
} from "recharts";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface TeamMember {
    id: string;
    full_name: string | null;
    employee_code: string | null;
    total_xp: number;
    todayCompleted: number;
    todayTotal: number;
}

interface DayData {
    date: string;
    label: string;
    rate: number;
    completed: number;
    total: number;
}

/* ===== Quick-select presets ===== */
const PRESETS = [
    { label: "7 ngày", days: 7 },
    { label: "14 ngày", days: 14 },
    { label: "30 ngày", days: 30 },
] as const;

export const TeamOverviewView = ({ userDepartment }: { userDepartment: string | null }) => {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [trendData, setTrendData] = useState<DayData[]>([]);
    const [loading, setLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(false);

    /* Date range state */
    const today = new Date();
    const defaultFrom = new Date(today);
    defaultFrom.setDate(defaultFrom.getDate() - 6);

    const [dateFrom, setDateFrom] = useState(() => fmtDate(defaultFrom));
    const [dateTo, setDateTo] = useState(() => fmtDate(today));
    const [activePreset, setActivePreset] = useState<number | null>(7);

    /* Profiles cache */
    const [profilesCache, setProfilesCache] = useState<any[]>([]);

    function fmtDate(d: Date) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    function fmtLabel(d: Date) {
        return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    }

    /* Build days array between two date strings */
    const buildDays = useCallback((from: string, to: string) => {
        const days: { date: string; label: string }[] = [];
        const start = new Date(from);
        const end = new Date(to);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            days.push({ date: fmtDate(d), label: fmtLabel(d) });
        }
        return days;
    }, []);

    /* Fetch profiles (once) */
    useEffect(() => {
        const fetchProfiles = async () => {
            try {
                const { data: profiles, error } = await (supabase as any)
                    .from("profiles")
                    .select("id, full_name, employee_code, total_xp, department")
                    .eq("department", userDepartment);
                if (error || !profiles) { setLoading(false); return; }
                setProfilesCache(profiles);
            } catch (err) {
                console.error("TeamOverview profiles error:", err);
                setLoading(false);
            }
        };
        if (userDepartment) fetchProfiles();
    }, [userDepartment]);

    /* Fetch trend + today data whenever profiles or date range changes */
    const fetchData = useCallback(async (profiles: any[], from: string, to: string) => {
        if (!profiles.length) { setLoading(false); return; }
        setChartLoading(true);
        try {
            const todayStr = fmtDate(new Date());
            const days = buildDays(from, to);
            const memberIds = profiles.map((p: any) => p.id);

            const { data: allTasks } = await (supabase as any)
                .from("mit_tasks")
                .select("user_id, session_date, is_completed")
                .in("user_id", memberIds)
                .gte("session_date", days[0].date)
                .lte("session_date", days[days.length - 1].date);

            const tasks = allTasks || [];

            // Trend data
            const trend: DayData[] = days.map(({ date, label }) => {
                const dayTasks = tasks.filter((t: any) => t.session_date === date);
                const total = dayTasks.length;
                const completed = dayTasks.filter((t: any) => t.is_completed).length;
                const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
                return { date, label, rate, completed, total };
            });
            setTrendData(trend);

            // Member data (today)
            const enriched: TeamMember[] = profiles.map((p: any) => {
                const mt = tasks.filter((t: any) => t.user_id === p.id && t.session_date === todayStr);
                return {
                    id: p.id,
                    full_name: p.full_name,
                    employee_code: p.employee_code,
                    total_xp: p.total_xp || 0,
                    todayCompleted: mt.filter((t: any) => t.is_completed).length,
                    todayTotal: mt.length,
                };
            });
            enriched.sort((a, b) => b.total_xp - a.total_xp);
            setMembers(enriched);
        } catch (err) {
            console.error("TeamOverview fetch error:", err);
        } finally {
            setLoading(false);
            setChartLoading(false);
        }
    }, [buildDays]);

    useEffect(() => {
        if (profilesCache.length) fetchData(profilesCache, dateFrom, dateTo);
    }, [profilesCache, dateFrom, dateTo, fetchData]);

    /* Preset click */
    const handlePreset = (days: number) => {
        const t = new Date();
        const f = new Date(t);
        f.setDate(f.getDate() - (days - 1));
        setDateFrom(fmtDate(f));
        setDateTo(fmtDate(t));
        setActivePreset(days);
    };

    /* Custom date change */
    const handleDateChange = (type: "from" | "to", value: string) => {
        setActivePreset(null);
        if (type === "from") setDateFrom(value);
        else setDateTo(value);
    };

    /* ===== Export Excel ===== */
    const exportExcel = () => {
        const wsData = [
            ["Ngày", "Hoàn thành", "Tổng cộng", "Tỉ lệ (%)"],
            ...trendData.map(d => [d.label, d.completed, d.total, d.rate]),
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        // Column widths
        ws["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Xu hướng MITs");

        // Add members sheet
        const msData = [
            ["#", "Họ tên", "Mã NV", "MITs hoàn thành", "MITs tổng", "XP"],
            ...members.map((m, i) => [i + 1, m.full_name || "—", m.employee_code || "—", m.todayCompleted, m.todayTotal, m.total_xp]),
        ];
        const ms = XLSX.utils.aoa_to_sheet(msData);
        ms["!cols"] = [{ wch: 5 }, { wch: 25 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, ms, "Bảng xếp hạng XP");

        XLSX.writeFile(wb, `MITs_Team_${userDepartment}_${dateFrom}_${dateTo}.xlsx`);
    };

    /* ===== Export PDF ===== */
    const exportPDF = async () => {
        try {
            // Fetch Roboto font for Vietnamese support
            const fontResponse = await fetch("/fonts/Roboto-Regular.ttf");
            const fontBuffer = await fontResponse.arrayBuffer();
            const fontBase64 = btoa(
                new Uint8Array(fontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
            );

            const doc = new jsPDF();
            // Embed Roboto font
            doc.addFileToVFS("Roboto-Regular.ttf", fontBase64);
            doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
            doc.setFont("Roboto", "normal");

            doc.setFontSize(16);
            doc.text(`Báo cáo MITs Team — ${userDepartment}`, 14, 20);
            doc.setFontSize(10);
            doc.text(`Từ ${dateFrom} đến ${dateTo}`, 14, 28);

            // Trend table
            autoTable(doc, {
                startY: 35,
                head: [["Ngày", "Hoàn thành", "Tổng cộng", "Tỉ lệ (%)"]],
                body: trendData.map(d => [d.label, d.completed, d.total, `${d.rate}%`]),
                theme: "grid",
                headStyles: { fillColor: [99, 102, 241], font: "Roboto" },
                styles: { fontSize: 9, font: "Roboto" },
            });

            // Members table
            const finalY = (doc as any).lastAutoTable?.finalY || 40;
            doc.setFont("Roboto", "normal");
            doc.setFontSize(12);
            doc.text("Bảng xếp hạng XP", 14, finalY + 12);

            autoTable(doc, {
                startY: finalY + 18,
                head: [["#", "Họ tên", "Mã NV", "MITs HT", "MITs Tổng", "XP"]],
                body: members.map((m, i) => [i + 1, m.full_name || "—", m.employee_code || "—", m.todayCompleted, m.todayTotal, m.total_xp]),
                theme: "grid",
                headStyles: { fillColor: [99, 102, 241], font: "Roboto" },
                styles: { fontSize: 9, font: "Roboto" },
            });

            doc.save(`MITs_Team_${userDepartment}_${dateFrom}_${dateTo}.pdf`);
        } catch (err) {
            console.error("PDF export error:", err);
            alert("Lỗi khi xuất PDF. Vui lòng thử lại.");
        }
    };

    const teamCompletedToday = members.reduce((s, m) => s + m.todayCompleted, 0);
    const teamTotalToday = members.reduce((s, m) => s + m.todayTotal, 0);
    const teamRate = teamTotalToday > 0 ? Math.round((teamCompletedToday / teamTotalToday) * 100) : 0;

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

    /* Date range display text */
    const rangeLabel = activePreset ? `${activePreset} ngày qua` : `${dateFrom} → ${dateTo}`;

    return (
        <div className="space-y-6 pb-10 anim-fade-in-up">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-3">
                    <span className="material-symbols-outlined text-[28px] text-indigo-500">groups</span>
                    Tổng quan Team
                </h2>
                <p className="text-[15px] text-slate-400 mt-2">
                    Theo dõi tiến độ đội nhóm phòng <span className="font-bold text-indigo-500">{userDepartment || "—"}</span> trong thời gian thực
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200/80 px-6 py-5 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Thành viên</p>
                    <p className="text-3xl font-extrabold text-slate-800 mt-1">{members.length}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/80 px-6 py-5 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">MITs hôm nay</p>
                    <p className="text-3xl font-extrabold text-indigo-600 mt-1">
                        {teamCompletedToday}<span className="text-lg text-slate-300 font-medium">/{teamTotalToday}</span>
                    </p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/80 px-6 py-5 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tỉ lệ hoàn thành</p>
                    <p className={`text-3xl font-extrabold mt-1 ${teamRate >= 80 ? "text-emerald-600" : teamRate >= 50 ? "text-amber-500" : "text-red-500"}`}>
                        {teamRate}%
                    </p>
                </div>
            </div>

            {/* ===== 📈 TREND CHART ===== */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                {/* Chart Header + Controls */}
                <div className="px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <h3 className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[20px] text-indigo-500">show_chart</span>
                            Xu hướng hoàn thành MITs
                        </h3>
                        {/* Export buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={exportExcel}
                                disabled={trendData.length === 0}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-[16px]">table_view</span>
                                Excel
                            </button>
                            <button
                                onClick={exportPDF}
                                disabled={trendData.length === 0}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                                PDF
                            </button>
                        </div>
                    </div>

                    {/* Date Filter Row */}
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                        {/* Presets */}
                        <div className="flex items-center gap-1.5">
                            {PRESETS.map(p => (
                                <button
                                    key={p.days}
                                    onClick={() => handlePreset(p.days)}
                                    className={`px-3 py-1 text-[12px] font-semibold rounded-lg transition-all ${activePreset === p.days
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                        }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        <div className="w-px h-6 bg-slate-200" />

                        {/* Custom date inputs */}
                        <div className="flex items-center gap-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase">Từ</label>
                            <input
                                type="date"
                                value={dateFrom}
                                max={dateTo}
                                onChange={e => handleDateChange("from", e.target.value)}
                                className="px-2.5 py-1 text-[12px] rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
                            />
                            <label className="text-[11px] font-bold text-slate-400 uppercase">Đến</label>
                            <input
                                type="date"
                                value={dateTo}
                                min={dateFrom}
                                max={fmtDate(new Date())}
                                onChange={e => handleDateChange("to", e.target.value)}
                                className="px-2.5 py-1 text-[12px] rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
                            />
                        </div>

                        <span className="text-[11px] text-slate-400 ml-auto">{rangeLabel}</span>
                    </div>
                </div>

                {/* Chart Body */}
                <div className="px-6 py-6">
                    {(loading || chartLoading) ? (
                        <div className="h-72 flex items-center justify-center">
                            <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full anim-spin" />
                        </div>
                    ) : trendData.every(d => d.total === 0) ? (
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
                    )}
                </div>
            </div>

            {/* XP Leaderboard */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px] text-indigo-500">leaderboard</span>
                        Bảng xếp hạng XP
                    </h3>
                    <span className="text-[12px] text-slate-400">Cập nhật thời gian thực</span>
                </div>

                {loading ? (
                    <div className="px-6 py-12 text-center">
                        <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full anim-spin mx-auto" />
                        <p className="text-sm text-slate-400 mt-3">Đang tải dữ liệu team...</p>
                    </div>
                ) : members.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <span className="material-symbols-outlined text-5xl text-slate-200">group_off</span>
                        <p className="text-sm text-slate-400 mt-3">Không tìm thấy thành viên trong phòng ban</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {members.map((m, idx) => {
                            const rate = m.todayTotal > 0 ? Math.round((m.todayCompleted / m.todayTotal) * 100) : 0;
                            const rankColors = ["text-amber-500", "text-slate-400", "text-orange-400"];
                            const rankIcons = ["emoji_events", "military_tech", "military_tech"];

                            return (
                                <div key={m.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                                    <div className="w-8 text-center flex-shrink-0">
                                        {idx < 3 ? (
                                            <span className={`material-symbols-outlined text-[22px] ${rankColors[idx]}`}>{rankIcons[idx]}</span>
                                        ) : (
                                            <span className="text-[14px] font-bold text-slate-300">{idx + 1}</span>
                                        )}
                                    </div>
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center flex-shrink-0 border border-indigo-200/50">
                                        <span className="text-sm font-bold text-indigo-600">
                                            {(m.full_name || "?").charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[14px] font-semibold text-slate-700 truncate">{m.full_name || "—"}</p>
                                        <p className="text-[11px] text-slate-400 font-mono">{m.employee_code || "—"}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${rate >= 80 ? "bg-emerald-400" : rate >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                                                style={{ width: `${rate}%` }}
                                            />
                                        </div>
                                        <span className="text-[12px] font-semibold text-slate-500 w-16 text-right">
                                            {m.todayCompleted}/{m.todayTotal}
                                        </span>
                                    </div>
                                    <div className="flex-shrink-0 text-right w-20">
                                        <p className="text-[15px] font-extrabold text-indigo-600">{m.total_xp.toLocaleString()}</p>
                                        <p className="text-[10px] text-slate-400 uppercase">XP</p>
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
