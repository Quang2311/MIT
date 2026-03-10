import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";

/* ===== Types ===== */
interface Ticket {
    id: string;
    ticket_code: string | null;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    created_at: string;
}

const ITEMS_PER_PAGE = 6;

const TIME_WASTED_OPTIONS = [
    "30 phút / ngày",
    "1 giờ / ngày",
    "2 giờ / ngày",
    "3+ giờ / ngày",
    "1-2 giờ / tuần",
    "3-5 giờ / tuần",
    "5+ giờ / tuần",
];

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
    open: { label: "Đang chờ", color: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-400" },
    in_progress: { label: "Đang xử lý", color: "bg-violet-50 text-violet-700 border border-violet-200", dot: "bg-violet-400" },
    resolved: { label: "Đã áp dụng", color: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-400" },
    closed: { label: "Đã đóng", color: "bg-slate-50 text-slate-500 border border-slate-200", dot: "bg-slate-400" },
};

const FILTER_OPTIONS = [
    { value: "all", label: "Tất cả trạng thái" },
    { value: "open", label: "⏳ Đang chờ" },
    { value: "in_progress", label: "🔨 Đang xử lý" },
    { value: "resolved", label: "✅ Đã áp dụng" },
];

/* ===== Component ===== */
export const IdeasView = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    /* Toolbar state */
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);

    /* Modal state */
    const [showModal, setShowModal] = useState(false);
    const [formTitle, setFormTitle] = useState("");
    const [formPainPoint, setFormPainPoint] = useState("");
    const [formTimeWasted, setFormTimeWasted] = useState(TIME_WASTED_OPTIONS[0]);
    const [formSoftware, setFormSoftware] = useState("");
    const [formWorkflow, setFormWorkflow] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showToast, setShowToast] = useState(false);

    /* Get user ID */
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) setUserId(data.user.id);
        });
    }, []);

    /* Fetch tickets */
    const fetchTickets = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const { data } = await (supabase as any)
                .from("tickets")
                .select("id, ticket_code, title, description, status, priority, created_at")
                .eq("creator_id", userId)
                .order("created_at", { ascending: false });
            if (data) setTickets(data);
        } catch (err) {
            console.error("IdeasView fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => { fetchTickets(); }, [fetchTickets]);

    /* Filter + Search */
    const filteredTickets = tickets.filter(t => {
        const matchStatus = filterStatus === "all" || t.status === filterStatus;
        const matchSearch = !searchQuery.trim() || t.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchStatus && matchSearch;
    });

    /* Pagination */
    const totalPages = Math.max(1, Math.ceil(filteredTickets.length / ITEMS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedTickets = filteredTickets.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

    useEffect(() => { setCurrentPage(1); }, [filterStatus, searchQuery]);

    /* Stats */
    const statsOpen = tickets.filter(t => t.status === "open").length;
    const statsInProgress = tickets.filter(t => t.status === "in_progress").length;
    const statsResolved = tickets.filter(t => t.status === "resolved").length;

    /* Reset form */
    const resetForm = () => {
        setFormTitle(""); setFormPainPoint(""); setFormTimeWasted(TIME_WASTED_OPTIONS[0]); setFormSoftware(""); setFormWorkflow("");
    };

    /* Submit */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formTitle.trim() || !userId) return;
        setIsSubmitting(true);
        try {
            const code = `OPT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            const desc = JSON.stringify({
                pain_point: formPainPoint,
                time_wasted: formTimeWasted,
                software_used: formSoftware,
                workflow_steps: formWorkflow,
            });
            const { error } = await (supabase as any).from("tickets").insert({
                ticket_code: code, creator_id: userId, department_in_charge: "BOD",
                title: `[Tối ưu] ${formTitle.trim()}`, description: desc,
                status: "open", priority: "medium",
            });
            if (error) { alert("Lỗi: " + error.message); return; }
            setShowModal(false); resetForm();
            setShowToast(true); setTimeout(() => setShowToast(false), 3000);
            fetchTickets();
        } catch { alert("Có lỗi xảy ra."); } finally { setIsSubmitting(false); }
    };

    /* Helpers */
    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const days = Math.floor(diff / 86400000);
        if (days === 0) return "Hôm nay";
        if (days === 1) return "Hôm qua";
        return `${days} ngày trước`;
    };

    const parseDesc = (desc: string | null) => {
        if (!desc) return null;
        try { return JSON.parse(desc); } catch { return null; }
    };

    const getPageNumbers = () => {
        const pages: (number | "...")[] = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (safePage > 3) pages.push("...");
            const start = Math.max(2, safePage - 1);
            const end = Math.min(totalPages - 1, safePage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (safePage < totalPages - 2) pages.push("...");
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className="space-y-6 pb-10 anim-fade-in-up">
            {/* ===== HEADER ===== */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-3">
                        <span className="text-[28px]">💡</span>
                        Kho sáng kiến Phòng ban
                    </h2>
                    <p className="text-[15px] text-slate-400 mt-1">
                        Theo dõi và đề xuất tối ưu quy trình
                    </p>
                </div>
            </div>

            {/* ===== STATS SUMMARY ===== */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200/80 px-5 py-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20px] text-amber-500">hourglass_top</span>
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-slate-800">{statsOpen}</p>
                            <p className="text-[12px] text-slate-400 font-medium">Đang chờ duyệt</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/80 px-5 py-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20px] text-violet-500">build</span>
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-slate-800">{statsInProgress}</p>
                            <p className="text-[12px] text-slate-400 font-medium">Đang xử lý</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/80 px-5 py-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20px] text-emerald-500">check_circle</span>
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-slate-800">{statsResolved}</p>
                            <p className="text-[12px] text-slate-400 font-medium">Đã áp dụng</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== TOOLBAR ===== */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative flex-1 max-w-xs">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
                        <input
                            type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Tìm kiếm sáng kiến..."
                            className="w-full pl-10 pr-4 py-2.5 text-[13px] border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all placeholder:text-slate-300"
                        />
                    </div>
                    <select
                        value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="px-4 py-2.5 text-[13px] font-medium border border-slate-200 rounded-xl bg-white text-slate-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                    >
                        {FILTER_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-semibold text-[13px] shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5 transition-all flex-shrink-0"
                >
                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                    Thêm sáng kiến mới
                </button>
            </div>

            {/* ===== GRID 3×2 ===== */}
            {loading ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm px-6 py-20 text-center">
                    <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full anim-spin mx-auto" />
                    <p className="text-sm text-slate-400 mt-3">Đang tải dữ liệu...</p>
                </div>
            ) : paginatedTickets.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm px-6 py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-4xl text-indigo-300">lightbulb</span>
                    </div>
                    <h3 className="text-[16px] font-bold text-slate-700 mb-1">
                        {searchQuery ? "Không tìm thấy kết quả" : "Chưa có sáng kiến nào"}
                    </h3>
                    <p className="text-[13px] text-slate-400 mb-5 max-w-sm mx-auto">
                        {searchQuery
                            ? `Không có sáng kiến nào phù hợp với "${searchQuery}"`
                            : "Hãy bắt đầu bằng cách đề xuất ý tưởng tối ưu quy trình đầu tiên của bạn!"
                        }
                    </p>
                    {!searchQuery && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold text-[13px] shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5 transition-all"
                        >
                            <span className="material-symbols-outlined text-[16px]">add_circle</span>
                            Tạo đề xuất đầu tiên
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {paginatedTickets.map((ticket) => {
                        const st = statusConfig[ticket.status] || statusConfig.open;
                        const parsed = parseDesc(ticket.description);

                        return (
                            <article
                                key={ticket.id}
                                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col overflow-hidden group"
                            >
                                {/* Color accent bar */}
                                <div className={`h-1 ${st.dot}`} />

                                <div className="p-5 flex flex-col flex-1">
                                    {/* Status + Time */}
                                    <div className="flex items-center justify-between mb-3">
                                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.color}`}>
                                            {st.label}
                                        </span>
                                        <span className="text-[11px] text-slate-300 font-medium">{timeAgo(ticket.created_at)}</span>
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-[15px] font-bold text-slate-800 leading-snug line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors">
                                        {ticket.title}
                                    </h3>

                                    {/* Pain point preview */}
                                    {parsed?.pain_point && (
                                        <p className="text-[12px] text-slate-400 leading-relaxed line-clamp-2 mb-3">
                                            {parsed.pain_point}
                                        </p>
                                    )}

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                                        {parsed?.time_wasted && (
                                            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-orange-50 text-orange-600 border border-orange-100">
                                                ⏱️ {parsed.time_wasted}
                                            </span>
                                        )}
                                        {parsed?.software_used && (
                                            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                                                💻 {parsed.software_used}
                                            </span>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                                        <span className="text-[10px] font-mono font-semibold text-slate-300">{ticket.ticket_code}</span>
                                        <span className="material-symbols-outlined text-[16px] text-slate-200 group-hover:text-indigo-400 transition-colors">arrow_forward</span>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {/* ===== PAGINATION ===== */}
            {!loading && filteredTickets.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-center gap-1 pt-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                        className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:bg-slate-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    {getPageNumbers().map((p, i) =>
                        p === "..." ? (
                            <span key={`dots-${i}`} className="w-9 h-9 flex items-center justify-center text-[12px] text-slate-300">…</span>
                        ) : (
                            <button
                                key={p}
                                onClick={() => setCurrentPage(p)}
                                className={`w-9 h-9 rounded-lg text-[13px] font-semibold transition-all ${
                                    safePage === p
                                        ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                                        : "text-slate-500 hover:bg-slate-100"
                                }`}
                            >
                                {p}
                            </button>
                        )
                    )}
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={safePage === totalPages}
                        className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:bg-slate-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                </div>
            )}

            {/* ===== MODAL POPUP (Portal — căn giữa) ===== */}
            {showModal && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => { setShowModal(false); resetForm(); }} />

                    {/* Modal */}
                    <form
                        onSubmit={handleSubmit}
                        className="relative w-full max-w-lg mx-4 bg-white rounded-3xl shadow-2xl overflow-hidden anim-scale-in"
                    >
                        {/* Header */}
                        <div className="px-7 py-5 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                        <span className="material-symbols-outlined text-white text-[20px]">rocket_launch</span>
                                    </div>
                                    <div>
                                        <h2 className="text-[16px] font-extrabold text-slate-900">Tạo đề xuất tối ưu quy trình</h2>
                                        <p className="text-[12px] text-slate-400">Báo cáo tác vụ thủ công để được tự động hóa</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all">
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="px-7 py-6 space-y-5 max-h-[60vh] overflow-y-auto">
                            {/* 1. Tiêu đề */}
                            <div>
                                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Tiêu đề đề xuất *</label>
                                <input
                                    type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)}
                                    placeholder="VD: Tự động hóa đối soát doanh thu..."
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[14px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all placeholder:text-slate-300"
                                    required
                                />
                            </div>

                            {/* 2. Nỗi đau */}
                            <div>
                                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Nỗi đau / Vấn đề đang gặp phải *</label>
                                <textarea
                                    rows={3} value={formPainPoint} onChange={e => setFormPainPoint(e.target.value)}
                                    placeholder="Mô tả vấn đề cụ thể bạn đang gặp phải..."
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[14px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all resize-none placeholder:text-slate-300"
                                    required
                                />
                            </div>

                            {/* 3 + 4: Grid row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Thời gian lãng phí</label>
                                    <select
                                        value={formTimeWasted} onChange={e => setFormTimeWasted(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[14px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white transition-all cursor-pointer"
                                    >
                                        {TIME_WASTED_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Phần mềm liên quan *</label>
                                    <input
                                        type="text" value={formSoftware} onChange={e => setFormSoftware(e.target.value)}
                                        placeholder="VD: Excel, Base..."
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[14px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all placeholder:text-slate-300"
                                        required
                                    />
                                </div>
                            </div>

                            {/* 5. Mô tả bước thủ công */}
                            <div>
                                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Mô tả tóm tắt các bước đang làm thủ công</label>
                                <textarea
                                    rows={3} value={formWorkflow} onChange={e => setFormWorkflow(e.target.value)}
                                    placeholder="Liệt kê các bước bạn hiện đang phải làm bằng tay..."
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[14px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all resize-none placeholder:text-slate-300"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-7 py-4 border-t border-slate-100 flex justify-end gap-3">
                            <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
                                className="px-5 py-2.5 text-[13px] font-medium text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                                Hủy bỏ
                            </button>
                            <button type="submit" disabled={isSubmitting}
                                className="px-6 py-2.5 text-[13px] font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-60">
                                {isSubmitting ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full anim-spin" /> Đang gửi...</>
                                ) : (
                                    <><span className="material-symbols-outlined text-[16px]">send</span> Gửi đề xuất</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>,
                document.body
            )}

            {/* ===== TOAST (Portal) ===== */}
            {showToast && createPortal(
                <div className="fixed bottom-4 right-4 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3 toast-enter z-50">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                        <span className="material-symbols-outlined">rocket_launch</span>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-900">Đã gửi đề xuất!</h4>
                        <p className="text-xs text-slate-500">Yêu cầu tối ưu đã được ghi nhận.</p>
                    </div>
                    <button onClick={() => setShowToast(false)} className="ml-4 text-slate-400 hover:text-slate-600">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
};
