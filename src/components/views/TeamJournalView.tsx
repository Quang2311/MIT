import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/* ===== Types ===== */
interface MemberMITs {
    userId: string;
    fullName: string;
    employeeCode: string;
    tasks: { title: string; completed: boolean }[];
}

interface DepartmentTicket {
    id: string;
    ticket_code: string | null;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    created_at: string;
    creatorName: string;
    creatorCode: string;
}

type JournalTab = "mits" | "tickets";

/* ===== Component ===== */
export const TeamJournalView = ({ userDepartment }: { userDepartment: string | null }) => {
    const [activeTab, setActiveTab] = useState<JournalTab>("mits");

    /* MITs Tab State */
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    });
    const [mitsData, setMitsData] = useState<MemberMITs[]>([]);
    const [mitsLoading, setMitsLoading] = useState(false);

    /* Tickets Tab State */
    const [tickets, setTickets] = useState<DepartmentTicket[]>([]);
    const [ticketsLoading, setTicketsLoading] = useState(false);

    /* ===== Fetch MITs for selected date ===== */
    useEffect(() => {
        if (!userDepartment || activeTab !== "mits") return;
        const fetchMITs = async () => {
            setMitsLoading(true);
            try {
                // Get team profiles
                const { data: profiles } = await (supabase as any)
                    .from("profiles")
                    .select("id, full_name, employee_code")
                    .eq("department", userDepartment);

                if (!profiles) { setMitsLoading(false); return; }

                const result: MemberMITs[] = [];
                for (const p of profiles) {
                    const { data: tasks } = await (supabase as any)
                        .from("mit_tasks")
                        .select("title, is_completed")
                        .eq("user_id", p.id)
                        .eq("session_date", selectedDate)
                        .order("created_at", { ascending: true });

                    result.push({
                        userId: p.id,
                        fullName: p.full_name || "—",
                        employeeCode: p.employee_code || "—",
                        tasks: (tasks || []).map((t: any) => ({ title: t.title, completed: t.is_completed })),
                    });
                }

                // Sort: members with tasks first
                result.sort((a, b) => b.tasks.length - a.tasks.length);
                setMitsData(result);
            } catch (err) {
                console.error("TeamJournal MITs error:", err);
            } finally {
                setMitsLoading(false);
            }
        };
        fetchMITs();
    }, [userDepartment, selectedDate, activeTab]);

    /* ===== Fetch Tickets ===== */
    useEffect(() => {
        if (!userDepartment || activeTab !== "tickets") return;
        const fetchTickets = async () => {
            setTicketsLoading(true);
            try {
                // Get team profiles first for name mapping
                const { data: profiles } = await (supabase as any)
                    .from("profiles")
                    .select("id, full_name, employee_code")
                    .eq("department", userDepartment);

                if (!profiles) { setTicketsLoading(false); return; }

                const profileMap = new Map<string, { name: string; code: string }>();
                const ids: string[] = [];
                for (const p of profiles) {
                    profileMap.set(p.id, { name: p.full_name || "—", code: p.employee_code || "—" });
                    ids.push(p.id);
                }

                // Fetch tickets created by department members
                const { data: ticketData } = await (supabase as any)
                    .from("tickets")
                    .select("id, ticket_code, title, description, status, priority, created_at, creator_id")
                    .in("creator_id", ids)
                    .order("created_at", { ascending: false });

                if (ticketData) {
                    setTickets(
                        ticketData.map((t: any) => ({
                            ...t,
                            creatorName: profileMap.get(t.creator_id)?.name || "—",
                            creatorCode: profileMap.get(t.creator_id)?.code || "—",
                        }))
                    );
                }
            } catch (err) {
                console.error("TeamJournal tickets error:", err);
            } finally {
                setTicketsLoading(false);
            }
        };
        fetchTickets();
    }, [userDepartment, activeTab]);

    /* ===== Status helpers ===== */
    const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
        open: { label: "Chờ xử lý", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
        in_progress: { label: "Đang xử lý", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
        resolved: { label: "Đã áp dụng", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
        closed: { label: "Đã đóng", color: "text-slate-500", bg: "bg-slate-50 border-slate-200" },
    };

    const priorityConfig: Record<string, { label: string; color: string }> = {
        low: { label: "Thấp", color: "text-slate-400" },
        medium: { label: "Trung bình", color: "text-amber-500" },
        high: { label: "Cao", color: "text-orange-500" },
        urgent: { label: "Khẩn cấp", color: "text-red-500" },
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const days = Math.floor(diff / 86400000);
        if (days === 0) return "Hôm nay";
        if (days === 1) return "Hôm qua";
        return `${days} ngày trước`;
    };

    return (
        <div className="space-y-6 pb-10 anim-fade-in-up">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-3">
                    <span className="material-symbols-outlined text-[28px] text-indigo-500">auto_stories</span>
                    Nhật ký Đội nhóm
                </h2>
                <p className="text-[15px] text-slate-400 mt-2">
                    Theo dõi công việc và sáng kiến của phòng <span className="font-bold text-indigo-500">{userDepartment || "—"}</span>
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab("mits")}
                    className={`flex items-center gap-2 px-5 py-3 text-[14px] font-medium transition-all border-b-2 -mb-[1px] ${activeTab === "mits"
                            ? "border-indigo-500 text-indigo-600"
                            : "border-transparent text-slate-400 hover:text-slate-600"
                        }`}
                >
                    <span className={`material-symbols-outlined text-[20px] ${activeTab === "mits" ? "text-indigo-500" : "text-slate-400"}`}>
                        checklist
                    </span>
                    Lịch sử MITs
                </button>
                <button
                    onClick={() => setActiveTab("tickets")}
                    className={`flex items-center gap-2 px-5 py-3 text-[14px] font-medium transition-all border-b-2 -mb-[1px] ${activeTab === "tickets"
                            ? "border-indigo-500 text-indigo-600"
                            : "border-transparent text-slate-400 hover:text-slate-600"
                        }`}
                >
                    <span className={`material-symbols-outlined text-[20px] ${activeTab === "tickets" ? "text-indigo-500" : "text-slate-400"}`}>
                        confirmation_number
                    </span>
                    Sáng kiến Đội nhóm
                </button>
            </div>

            {/* ===== TAB 1: Lịch sử MITs ===== */}
            {activeTab === "mits" && (
                <div className="space-y-4 anim-fade-in-up">
                    {/* Date Picker */}
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[20px] text-slate-400">calendar_today</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-4 py-2.5 border border-slate-200 rounded-xl text-[14px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    {/* Members MITs */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                        {mitsLoading ? (
                            <div className="px-6 py-12 text-center">
                                <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full anim-spin mx-auto" />
                                <p className="text-sm text-slate-400 mt-3">Đang tải dữ liệu...</p>
                            </div>
                        ) : mitsData.length === 0 ? (
                            <div className="px-6 py-12 text-center">
                                <span className="material-symbols-outlined text-5xl text-slate-200">event_busy</span>
                                <p className="text-sm text-slate-400 mt-3">Không có dữ liệu cho ngày này</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {mitsData.map((member) => (
                                    <div key={member.userId} className="px-6 py-5">
                                        {/* Member Header */}
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center border border-indigo-200/50">
                                                <span className="text-xs font-bold text-indigo-600">
                                                    {member.fullName.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-[14px] font-semibold text-slate-700">{member.fullName}</p>
                                                <p className="text-[11px] text-slate-400 font-mono">{member.employeeCode}</p>
                                            </div>
                                            {member.tasks.length > 0 && (
                                                <span className="ml-auto text-[12px] font-semibold text-slate-400">
                                                    {member.tasks.filter((t) => t.completed).length}/{member.tasks.length} hoàn thành
                                                </span>
                                            )}
                                        </div>

                                        {/* Tasks List */}
                                        {member.tasks.length > 0 ? (
                                            <div className="space-y-2 ml-11">
                                                {member.tasks.map((task, i) => (
                                                    <div key={i} className="flex items-start gap-2.5">
                                                        <span className="text-[14px] mt-0.5 flex-shrink-0">
                                                            {task.completed ? "🟢" : "🔴"}
                                                        </span>
                                                        <p className={`text-[13px] ${task.completed ? "text-slate-600" : "text-slate-400 line-through"}`}>
                                                            {task.title}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-[12px] text-slate-300 ml-11 italic">Chưa nhập MITs</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ===== TAB 2: Sáng kiến Đội nhóm (Tickets READ-ONLY) ===== */}
            {activeTab === "tickets" && (
                <div className="space-y-4 anim-fade-in-up">
                    {/* Info banner: read-only */}
                    <div className="flex items-start gap-3 text-[13px] text-slate-500 bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4">
                        <span className="material-symbols-outlined text-indigo-400 text-[18px] mt-0.5">info</span>
                        <span>Đây là danh sách sáng kiến đội nhóm đã gửi. Bạn chỉ có quyền <strong>xem</strong> — quyền duyệt thuộc về Admin hệ thống.</span>
                    </div>

                    {ticketsLoading ? (
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm px-6 py-12 text-center">
                            <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full anim-spin mx-auto" />
                            <p className="text-sm text-slate-400 mt-3">Đang tải sáng kiến...</p>
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm px-6 py-12 text-center">
                            <span className="material-symbols-outlined text-5xl text-slate-200">lightbulb</span>
                            <p className="text-sm text-slate-400 mt-3">Chưa có sáng kiến nào từ đội nhóm</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tickets.map((ticket) => {
                                const st = statusConfig[ticket.status] || statusConfig.open;
                                const pr = priorityConfig[ticket.priority] || priorityConfig.medium;

                                return (
                                    <div key={ticket.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm px-6 py-5 hover:shadow-md transition-shadow">
                                        {/* Top row: code + status */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-[12px] font-mono font-semibold text-slate-400">{ticket.ticket_code}</span>
                                                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${st.bg} ${st.color}`}>
                                                    {st.label}
                                                </span>
                                                <span className={`text-[11px] font-semibold ${pr.color}`}>
                                                    ● {pr.label}
                                                </span>
                                            </div>
                                            <span className="text-[12px] text-slate-300">{timeAgo(ticket.created_at)}</span>
                                        </div>

                                        {/* Title */}
                                        <h4 className="text-[15px] font-bold text-slate-800 mb-2">{ticket.title}</h4>

                                        {/* Creator */}
                                        <div className="flex items-center gap-2 text-[12px] text-slate-400">
                                            <span className="material-symbols-outlined text-[16px]">person</span>
                                            <span>{ticket.creatorName}</span>
                                            <span className="font-mono">({ticket.creatorCode})</span>
                                        </div>

                                        {/* NO action buttons — READ ONLY */}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
