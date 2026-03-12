import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

/* ===== Types ===== */
interface TicketData {
    id: string;
    ticket_code: string;
    title: string;
    description: string;
    status: "open" | "in_progress" | "resolved" | "closed";
    priority: "low" | "medium" | "high" | "urgent";
    creator_name: string;
    creator_department: string;
    admin_feedback: string | null;
    created_at: string;
}

interface ParsedDescription {
    workflow_description: string;
    pain_points: string[];
    time_wasted: string;
    software_used: string;
}

/* ===== Department Filter Options ===== */
const DEPT_OPTIONS = [
    { value: "all", label: "Tất cả phòng ban" },
    { value: "BOD", label: "BOD" },
    { value: "HR", label: "HR" },
    { value: "OPS", label: "OPS" },
    { value: "MKT", label: "MKT" },
    { value: "ACC", label: "ACC" },
    { value: "CX", label: "CX" },
    { value: "QAQC", label: "QAQC" },
    { value: "R&D", label: "R&D" },
    { value: "SP", label: "SP" },
    { value: "BD", label: "BD" },
];

/* ===== Status Config ===== */
const statusConfig: Record<
    TicketData["status"],
    { label: string; icon: string; badge: string; text: string }
> = {
    open: {
        label: "Chờ tiếp nhận",
        icon: "📥",
        badge: "bg-amber-50 text-amber-700 border border-amber-200",
        text: "text-amber-700",
    },
    in_progress: {
        label: "Đang phân tích",
        icon: "🔍",
        badge: "bg-blue-50 text-blue-700 border border-blue-200",
        text: "text-blue-700",
    },
    resolved: {
        label: "Đang xây luồng",
        icon: "🔨",
        badge: "bg-violet-50 text-violet-700 border border-violet-200",
        text: "text-violet-700",
    },
    closed: {
        label: "Đã triển khai",
        icon: "✅",
        badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        text: "text-emerald-700",
    },
};

/* ===== Helpers ===== */
const parseDescription = (desc: string): ParsedDescription => {
    try {
        const parsed = JSON.parse(desc);
        return {
            workflow_description: parsed.workflow_description || parsed.pain_point || desc,
            pain_points: parsed.pain_points || (parsed.pain_point ? [parsed.pain_point] : []),
            time_wasted: parsed.time_wasted || "N/A",
            software_used: parsed.software_used || "N/A",
        };
    } catch {
        return { workflow_description: desc, pain_points: [], time_wasted: "N/A", software_used: "N/A" };
    }
};

const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Vừa xong";
    if (mins < 60) return `${mins} phút trước`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} giờ trước`;
    const days = Math.floor(hrs / 24);
    return days < 7 ? `${days} ngày trước` : formatDate(dateStr);
};

/* ===== Component ===== */
export const AdminTicketsView = () => {
    /* ===== State ===== */
    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<TicketData["status"] | "all">("all");
    const [filterDept, setFilterDept] = useState<string>("all");

    // Editable fields for the selected ticket
    const [editStatus, setEditStatus] = useState<TicketData["status"]>("open");
    const [editFeedback, setEditFeedback] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);
    const [showSaveToast, setShowSaveToast] = useState(false);

    /* ===== Fetch ALL tickets (Admin sees everything) ===== */
    const fetchTickets = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from("tickets")
                .select(`
                    id, ticket_code, title, description, status, priority,
                    admin_feedback, created_at, department_in_charge,
                    creator:profiles!tickets_creator_id_fkey ( full_name, department )
                `)
                .order("created_at", { ascending: false });

            console.log("=== DATA ADMIN NHẬN ĐƯỢC ===", data, "error:", error);

            if (error) {
                console.error("[AdminTicketsView] fetch error:", error);
                return;
            }

            if (data) {
                const mapped: TicketData[] = data.map((t: any) => ({
                    id: t.id,
                    ticket_code: t.ticket_code || "N/A",
                    title: t.title,
                    description: t.description || "{}",
                    status: t.status,
                    priority: t.priority,
                    creator_name: t.creator?.full_name || "Không rõ",
                    creator_department: t.department_in_charge || t.creator?.department || "N/A",
                    admin_feedback: t.admin_feedback || "",
                    created_at: t.created_at,
                }));
                setTickets(mapped);

                // Auto-select first ticket if none selected
                if (mapped.length > 0 && !selectedId) {
                    setSelectedId(mapped[0].id);
                    setEditStatus(mapped[0].status);
                    setEditFeedback(mapped[0].admin_feedback || "");
                }
            }
        } catch (err) {
            console.error("[AdminTicketsView] unexpected error:", err);
        } finally {
            setLoading(false);
        }
    }, [selectedId]);

    useEffect(() => { fetchTickets(); }, [fetchTickets]);

    /* ===== Realtime subscription — ALL tickets globally ===== */
    useEffect(() => {
        const channel = supabase
            .channel("admin-all-tickets")
            .on(
                "postgres_changes" as any,
                { event: "*", schema: "public", table: "tickets" },
                (payload: any) => {
                    console.log("[AdminTicketsView] Realtime event:", payload.eventType);
                    fetchTickets();
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchTickets]);

    /* ===== Computed ===== */
    const statusCounts = useMemo(() => {
        const counts = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
        tickets.forEach((t) => { counts[t.status]++; });
        return counts;
    }, [tickets]);

    const filteredTickets = useMemo(() => {
        return tickets.filter((t) => {
            const matchSearch =
                !searchQuery ||
                t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.ticket_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.creator_name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchStatus = filterStatus === "all" || t.status === filterStatus;
            const matchDept = filterDept === "all" || t.creator_department === filterDept;
            return matchSearch && matchStatus && matchDept;
        });
    }, [tickets, searchQuery, filterStatus, filterDept]);

    const selectedTicket = tickets.find((t) => t.id === selectedId) || tickets[0];
    const parsedDesc = selectedTicket ? parseDescription(selectedTicket.description) : null;
    const detailStatusCfg = statusConfig[editStatus];

    /* ===== Handlers ===== */
    const handleSelectTicket = (ticket: TicketData) => {
        setSelectedId(ticket.id);
        setEditStatus(ticket.status);
        setEditFeedback(ticket.admin_feedback || "");
    };

    const handleSave = async () => {
        if (!selectedId) return;
        setIsSaving(true);
        try {
            const { error } = await (supabase as any)
                .from("tickets")
                .update({
                    status: editStatus,
                    admin_feedback: editFeedback,
                    ...(editStatus === "resolved" || editStatus === "closed"
                        ? { resolved_at: new Date().toISOString() }
                        : {}),
                })
                .eq("id", selectedId);

            if (error) {
                console.error("[AdminTicketsView] save error:", error);
                alert("Lỗi lưu: " + error.message);
                return;
            }

            // Update local state immediately for responsiveness
            setTickets((prev) =>
                prev.map((t) =>
                    t.id === selectedId
                        ? { ...t, status: editStatus, admin_feedback: editFeedback }
                        : t
                )
            );

            setShowSaveToast(true);
            setTimeout(() => setShowSaveToast(false), 2500);
        } catch (err) {
            console.error("[AdminTicketsView] save unexpected error:", err);
            alert("Có lỗi xảy ra khi lưu.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleStatCardClick = (status: TicketData["status"]) => {
        setFilterStatus((prev) => (prev === status ? "all" : status));
    };

    /* ===== Loading State ===== */
    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full anim-spin" />
                    <p className="text-sm text-slate-500 font-medium">Đang tải tất cả ticket...</p>
                </div>
            </div>
        );
    }

    /* ===== Render ===== */
    return (
        <div className="space-y-5 pb-6 h-full flex flex-col">
            {/* ===== HEADER ===== */}
            <div className="flex-shrink-0 anim-fade-in-up">
                <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                    <span className="text-2xl">🎫</span>
                    Quản lý Ticket — Tất cả phòng ban
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                    Tổng quan, phân tích và xử lý đề xuất tối ưu từ toàn bộ phòng ban
                </p>
            </div>

            {/* ===== STAT CARDS ===== */}
            <div className="flex-shrink-0 grid grid-cols-4 gap-3 anim-fade-in-up" style={{ animationDelay: "0.05s" }}>
                {(["open", "in_progress", "resolved", "closed"] as const).map((status) => {
                    const cfg = statusConfig[status];
                    const isActive = filterStatus === status;
                    return (
                        <button
                            key={status}
                            onClick={() => handleStatCardClick(status)}
                            className={`relative bg-white rounded-2xl p-4 border transition-all duration-200 cursor-pointer group
                                ${isActive
                                    ? "ring-2 ring-indigo-400 border-indigo-200 shadow-md shadow-indigo-100/50"
                                    : "border-slate-100 hover:border-slate-200 hover:shadow-sm"
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xl">{cfg.icon}</span>
                                <span className={`text-2xl font-extrabold ${cfg.text}`}>
                                    {statusCounts[status]}
                                </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-500 mt-2 text-left">{cfg.label}</p>
                            {isActive && (
                                <div className="absolute top-2 right-2">
                                    <span className="material-symbols-outlined text-[14px] text-indigo-400">filter_alt</span>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ===== SPLIT PANE ===== */}
            <div className="master-detail-pane flex-1 min-h-0 anim-fade-in-up" style={{ animationDelay: "0.1s" }}>
                {/* ── MASTER LIST (Left 35%) ── */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
                    {/* Search + Filter */}
                    <div className="p-3 border-b border-slate-100 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-300">
                                    search
                                </span>
                                <input
                                    type="text"
                                    placeholder="Tìm theo mã, tiêu đề, người gửi..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent focus:bg-white transition-all"
                                />
                            </div>
                            <button
                                onClick={() => { setFilterStatus("all"); setFilterDept("all"); }}
                                title="Xóa tất cả bộ lọc"
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0
                                    ${filterStatus !== "all" || filterDept !== "all"
                                        ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                                        : "bg-slate-50 text-slate-300 hover:bg-slate-100 hover:text-slate-400"
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[20px]">filter_alt_off</span>
                            </button>
                        </div>
                        {/* Department Filter Dropdown */}
                        <div className="mt-2">
                            <select
                                value={filterDept}
                                onChange={(e) => setFilterDept(e.target.value)}
                                className="w-full px-3 py-2 text-[13px] bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent focus:bg-white transition-all appearance-none cursor-pointer font-medium text-slate-600"
                            >
                                {DEPT_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        {/* Active filter indicator */}
                        {filterStatus !== "all" && (
                            <div className="mt-2 flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-400 font-medium">Đang lọc:</span>
                                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${statusConfig[filterStatus].badge}`}>
                                    {statusConfig[filterStatus].icon} {statusConfig[filterStatus].label}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Ticket List */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5" style={{ scrollbarWidth: "thin" }}>
                        {filteredTickets.length > 0 ? (
                            filteredTickets.map((ticket) => {
                                const isActive = ticket.id === selectedId;
                                const tsc = statusConfig[ticket.status];
                                return (
                                    <button
                                        key={ticket.id}
                                        onClick={() => handleSelectTicket(ticket)}
                                        className={`w-full text-left p-3.5 rounded-xl transition-all duration-200 border group
                                            ${isActive
                                                ? "bg-indigo-50/50 border-indigo-200 ring-2 ring-indigo-400/30 shadow-sm"
                                                : "bg-white border-transparent hover:bg-slate-50/80 hover:border-slate-100"
                                            }`}
                                    >
                                        {/* Row 1: Code + Time */}
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[11px] font-mono font-semibold text-slate-400">
                                                {ticket.ticket_code}
                                            </span>
                                            <span className="text-[10px] text-slate-300">{timeAgo(ticket.created_at)}</span>
                                        </div>
                                        {/* Row 2: Title */}
                                        <h4 className={`text-[13px] font-semibold leading-snug line-clamp-2 ${isActive ? "text-indigo-700" : "text-slate-700"}`}>
                                            {ticket.title.replace("[Tối ưu] ", "")}
                                        </h4>
                                        {/* Row 3: Creator + Badge */}
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">person</span>
                                                {ticket.creator_name}
                                            </span>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tsc.badge}`}>
                                                {tsc.label}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <span className="material-symbols-outlined text-4xl text-slate-200">inbox</span>
                                <p className="text-sm text-slate-400 mt-2">
                                    {tickets.length === 0 ? "Chưa có ticket nào từ phòng ban" : "Không tìm thấy ticket nào"}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer count */}
                    <div className="px-4 py-2.5 border-t border-slate-100 flex-shrink-0">
                        <p className="text-[11px] text-slate-400 font-medium">
                            {filteredTickets.length} / {tickets.length} ticket
                        </p>
                    </div>
                </div>

                {/* ── DETAIL VIEW (Right 65%) ── */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
                    {selectedTicket && parsedDesc ? (
                        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                            {/* Detail Header */}
                            <div className="p-6 pb-4 border-b border-slate-100">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-xs font-mono font-bold text-slate-400">
                                                {selectedTicket.ticket_code}
                                            </span>
                                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${detailStatusCfg.badge}`}>
                                                {detailStatusCfg.icon} {detailStatusCfg.label}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 leading-snug">
                                            {selectedTicket.title.replace("[Tối ưu] ", "")}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-1.5 ml-4 flex-shrink-0">
                                        <button className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Xóa">
                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Sender Info */}
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                                    Thông tin người gửi
                                </h4>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                                        <span className="text-white text-sm font-bold">
                                            {selectedTicket.creator_name.charAt(0)}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-700">
                                            {selectedTicket.creator_name}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            Phòng {selectedTicket.creator_department} • {formatDate(selectedTicket.created_at)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Main Content — Pain Points + Details */}
                            <div className="px-6 py-4">
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                                    Nội dung đề xuất
                                </h4>
                                <div className="bg-slate-50/80 rounded-2xl p-5 space-y-4 border border-slate-100/80">
                                    {/* Workflow Description */}
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-[16px] text-slate-400">description</span>
                                            Mô tả quy trình
                                        </p>
                                        <p className="text-sm text-slate-700 leading-relaxed">
                                            {parsedDesc.workflow_description}
                                        </p>
                                    </div>

                                    <div className="border-t border-slate-200/60" />

                                    {/* Pain Points */}
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-[16px] text-red-400">heart_broken</span>
                                            Nỗi đau (Pain Points)
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {parsedDesc.pain_points.length > 0 ? (
                                                parsedDesc.pain_points.map((pp, i) => (
                                                    <span
                                                        key={i}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-full border border-red-100"
                                                    >
                                                        🔴 {pp}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">Không có dữ liệu</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-200/60" />

                                    {/* Time Wasted + Software */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[16px] text-orange-400">schedule</span>
                                                Thời gian lãng phí
                                            </p>
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 text-xs font-semibold rounded-full border border-orange-100">
                                                ⏱️ {parsedDesc.time_wasted}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[16px] text-blue-400">apps</span>
                                                Ứng dụng liên quan
                                            </p>
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full border border-blue-100">
                                                💻 {parsedDesc.software_used}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Existing Admin Feedback (read-only, if any) */}
                            {selectedTicket.admin_feedback && (
                                <div className="px-6 pb-4">
                                    <div className="bg-indigo-50/60 rounded-xl p-4 border-l-4 border-indigo-400">
                                        <p className="text-xs font-semibold text-indigo-600 mb-1 flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-[16px]">chat</span>
                                            Phản hồi trước đó
                                        </p>
                                        <p className="text-sm text-slate-700 leading-relaxed">
                                            {selectedTicket.admin_feedback}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ===== ADMIN ACTIONS ===== */}
                            <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/40">
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px]">tune</span>
                                    Cập nhật tiến độ
                                </h4>

                                <div className="space-y-4">
                                    {/* Status Select */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                            Trạng thái
                                        </label>
                                        <select
                                            value={editStatus}
                                            onChange={(e) => setEditStatus(e.target.value as TicketData["status"])}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="open">📥 Chờ tiếp nhận</option>
                                            <option value="in_progress">🔍 Đang phân tích</option>
                                            <option value="resolved">🔨 Đang xây luồng</option>
                                            <option value="closed">✅ Đã triển khai</option>
                                        </select>
                                    </div>

                                    {/* Admin Feedback Textarea */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                            Phản hồi của Admin
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={editFeedback}
                                            onChange={(e) => setEditFeedback(e.target.value)}
                                            placeholder="Nhập nhận xét, hướng xử lý, hoặc kết quả cho nhân viên..."
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all resize-none"
                                        />
                                    </div>

                                    {/* Save Button */}
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                                    >
                                        {isSaving ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Đang lưu...
                                            </>
                                        ) : (
                                            <>💾 Lưu thay đổi</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <span className="material-symbols-outlined text-5xl text-slate-200">inbox</span>
                                <p className="mt-3 text-slate-400 font-medium">Chọn một ticket để xem chi tiết</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ===== SUCCESS TOAST ===== */}
            {showSaveToast && (
                <div className="fixed bottom-4 right-4 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3 z-50 anim-fade-in-up">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                        <span className="material-symbols-outlined">check_circle</span>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-900">Đã lưu!</h4>
                        <p className="text-xs text-slate-500">Thay đổi đã được cập nhật thành công.</p>
                    </div>
                    <button onClick={() => setShowSaveToast(false)} className="ml-3 text-slate-400 hover:text-slate-600">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
            )}
        </div>
    );
};
