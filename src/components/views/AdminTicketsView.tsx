import { useState, useMemo } from "react";

/* ===== Types ===== */
interface TicketData {
    id: string;
    ticket_code: string;
    title: string;
    description: string; // JSON string
    status: "open" | "in_progress" | "resolved" | "closed";
    priority: "low" | "medium" | "high" | "urgent";
    creator_name: string;
    creator_department: string;
    admin_feedback: string;
    created_at: string;
}

interface ParsedDescription {
    workflow_description: string;
    pain_points: string[];
    time_wasted: string;
    software_used: string;
}

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

/* ===== Initial Mock Data ===== */
const initialTickets: TicketData[] = [
    {
        id: "1",
        ticket_code: "OPT-20260308-A1B2",
        title: "[Tối ưu] Tự động đối soát doanh thu cuối ngày",
        description: JSON.stringify({
            workflow_description: "Nhân viên kế toán phải đối soát doanh thu POS - Excel thủ công mỗi tối, dễ sai lệch con số và mất thời gian.",
            pain_points: ["Nhập liệu thủ công", "Dễ sai sót"],
            time_wasted: "3-5 giờ / tuần",
            software_used: "POS, Excel, Google Sheets",
        }),
        status: "open",
        priority: "high",
        creator_name: "Nguyễn Thị Mai",
        creator_department: "ACC",
        admin_feedback: "",
        created_at: "2026-03-08T14:30:00Z",
    },
    {
        id: "2",
        ticket_code: "OPT-20260307-C3D4",
        title: "[Tối ưu] Chatbot đặt bàn tự động qua Zalo OA",
        description: JSON.stringify({
            workflow_description: "Khách hàng gọi điện đặt bàn giờ cao điểm, tổng đài bị nghẽn, mất khách.",
            pain_points: ["Copy-paste nhiều nền tảng", "Chờ duyệt lâu"],
            time_wasted: "5+ giờ / tuần",
            software_used: "Zalo OA, CRM, Excel",
        }),
        status: "in_progress",
        priority: "high",
        creator_name: "Trần Văn Hùng",
        creator_department: "CX",
        admin_feedback: "Đội R&D đang nghiên cứu tích hợp API Zalo. Dự kiến có prototype tuần sau.",
        created_at: "2026-03-07T09:15:00Z",
    },
    {
        id: "3",
        ticket_code: "OPT-20260305-E5F6",
        title: "[Tối ưu] Dashboard tồn kho nguyên liệu real-time",
        description: JSON.stringify({
            workflow_description: "Quản lý kho kiểm tra file báo cáo từng chi nhánh, dễ bỏ sót nguyên liệu sắp hết.",
            pain_points: ["Nhập liệu thủ công", "Dễ sai sót", "Copy-paste nhiều nền tảng"],
            time_wasted: "3-5 giờ / tuần",
            software_used: "Google Sheets, App nội bộ",
        }),
        status: "resolved",
        priority: "medium",
        creator_name: "Lê Hoàng Anh",
        creator_department: "OPS",
        admin_feedback: "Đã xây luồng kết nối API giữa các chi nhánh. Đang test UAT trước khi deploy.",
        created_at: "2026-03-05T16:45:00Z",
    },
    {
        id: "4",
        ticket_code: "OPT-20260301-G7H8",
        title: "[Tối ưu] Báo cáo doanh thu tự động hàng tuần",
        description: JSON.stringify({
            workflow_description: "Mỗi thứ 2, kế toán mất nửa ngày tổng hợp doanh thu từ POS, bank, ví điện tử rồi gửi mail cho BOD.",
            pain_points: ["Nhập liệu thủ công", "Copy-paste nhiều nền tảng"],
            time_wasted: "5+ giờ / tuần",
            software_used: "Excel, Gmail, POS",
        }),
        status: "closed",
        priority: "medium",
        creator_name: "Phạm Minh Tâm",
        creator_department: "ACC",
        admin_feedback: "Đã triển khai thành công! Hệ thống tự động gửi report mỗi thứ 2 lúc 8h sáng qua Email + Zalo.",
        created_at: "2026-03-01T11:00:00Z",
    },
    {
        id: "5",
        ticket_code: "OPT-20260306-J9K0",
        title: "[Tối ưu] Tự động hóa xếp lịch ca làm việc",
        description: JSON.stringify({
            workflow_description: "HR mất 4-5 giờ mỗi tuần để xếp lịch ca thủ công trên Excel, thường bị trùng ca hoặc thiếu người.",
            pain_points: ["Nhập liệu thủ công", "Dễ sai sót", "Chờ duyệt lâu"],
            time_wasted: "3-5 giờ / tuần",
            software_used: "Excel, Base.vn",
        }),
        status: "open",
        priority: "urgent",
        creator_name: "Võ Thị Lan",
        creator_department: "HR",
        admin_feedback: "",
        created_at: "2026-03-06T08:20:00Z",
    },
];

/* ===== Helpers ===== */
const parseDescription = (desc: string): ParsedDescription => {
    try {
        return JSON.parse(desc);
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
    /* ===== Mutable ticket state — enables real-time updates ===== */
    const [tickets, setTickets] = useState<TicketData[]>(initialTickets);
    const [selectedId, setSelectedId] = useState<string>(initialTickets[0].id);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<TicketData["status"] | "all">("all");

    // Editable fields for the selected ticket
    const [editStatus, setEditStatus] = useState<TicketData["status"]>(initialTickets[0].status);
    const [editFeedback, setEditFeedback] = useState<string>(initialTickets[0].admin_feedback);
    const [isSaving, setIsSaving] = useState(false);
    const [showSaveToast, setShowSaveToast] = useState(false);

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
            return matchSearch && matchStatus;
        });
    }, [tickets, searchQuery, filterStatus]);

    const selectedTicket = tickets.find((t) => t.id === selectedId) || tickets[0];
    const parsedDesc = parseDescription(selectedTicket.description);

    // Use editStatus for the detail header badge (reflects pending edit)
    const detailStatusCfg = statusConfig[editStatus];

    /* ===== Handlers ===== */
    const handleSelectTicket = (ticket: TicketData) => {
        setSelectedId(ticket.id);
        setEditStatus(ticket.status);
        setEditFeedback(ticket.admin_feedback);
    };

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate API call delay
        await new Promise((r) => setTimeout(r, 600));

        // Update ticket in the mutable state — triggers re-render of list, badges, stat cards
        setTickets((prev) =>
            prev.map((t) =>
                t.id === selectedId
                    ? { ...t, status: editStatus, admin_feedback: editFeedback }
                    : t
            )
        );

        setIsSaving(false);
        setShowSaveToast(true);
        setTimeout(() => setShowSaveToast(false), 2500);
    };

    const handleStatCardClick = (status: TicketData["status"]) => {
        setFilterStatus((prev) => (prev === status ? "all" : status));
    };

    /* ===== Render ===== */
    return (
        <div className="space-y-5 pb-6 h-full flex flex-col">
            {/* ===== HEADER ===== */}
            <div className="flex-shrink-0 anim-fade-in-up">
                <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                    <span className="text-2xl">🎫</span>
                    Quản lý Ticket
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                    Tiếp nhận, phân tích và xử lý đề xuất tối ưu từ nhân viên
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
                                onClick={() => setFilterStatus("all")}
                                title="Xóa bộ lọc"
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0
                                    ${filterStatus !== "all"
                                        ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                                        : "bg-slate-50 text-slate-300 hover:bg-slate-100 hover:text-slate-400"
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[20px]">filter_alt_off</span>
                            </button>
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
                                <p className="text-sm text-slate-400 mt-2">Không tìm thấy ticket nào</p>
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
