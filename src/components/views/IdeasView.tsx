import { useState } from "react";

/* ===== Types ===== */
interface TicketTag {
    label: string;
    color: string; // Tailwind bg + text classes
}

interface AdminFeedback {
    text: string;
}

interface TicketCard {
    code: string;
    date: string;
    status: string;
    statusColor: string;
    title: string;
    description: string;
    tags: TicketTag[];
    feedback?: AdminFeedback;
}

/* ===== Mock Data — 3 tickets with different statuses ===== */
const mockTickets: TicketCard[] = [
    {
        code: "#TKT-042",
        date: "06/03/2026",
        status: "⏳ Đang phân tích",
        statusColor: "bg-amber-50 text-amber-700 border border-amber-200",
        title: "Tự động hóa đối soát doanh thu cuối ngày tại Cơm Gà Đông Nguyên",
        description: "Hiện tại việc đối soát doanh thu giữa POS với sổ sách Excel vẫn làm thủ công, mất 2-3 giờ mỗi ngày và dễ sai lệch con số.",
        tags: [
            { label: "🔴 Sai lệch số liệu", color: "bg-red-50 text-red-600 border border-red-100" },
            { label: "⏱️ Tiết kiệm 2h/ngày", color: "bg-orange-50 text-orange-600 border border-orange-100" },
            { label: "💻 POS & Excel", color: "bg-blue-50 text-blue-600 border border-blue-100" },
        ],
        feedback: {
            text: "💬 Admin: Ý tưởng rất khả thi. Đội kỹ thuật đang tiến hành kết nối API, dự kiến hoàn thành thứ 6 tuần này.",
        },
    },
    {
        code: "#TKT-039",
        date: "28/02/2026",
        status: "🔨 Đang xây dựng",
        statusColor: "bg-violet-50 text-violet-700 border border-violet-200",
        title: "Chatbot tự động hỗ trợ khách hàng đặt bàn qua Zalo OA",
        description: "Khách hàng thường gọi điện đặt bàn vào giờ cao điểm, nhân viên trực tổng đài bận rộn không kịp xử lý.",
        tags: [
            { label: "🔴 Mất khách giờ cao điểm", color: "bg-red-50 text-red-600 border border-red-100" },
            { label: "⏱️ Tiết kiệm 1.5h/ngày", color: "bg-orange-50 text-orange-600 border border-orange-100" },
            { label: "💻 Zalo OA & CRM", color: "bg-blue-50 text-blue-600 border border-blue-100" },
        ],
        feedback: {
            text: "💬 Admin: Bot prototype đã demo thành công. Đang fine-tune kịch bản hội thoại trước khi deploy chính thức.",
        },
    },
    {
        code: "#TKT-035",
        date: "15/02/2026",
        status: "✅ Đã áp dụng",
        statusColor: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        title: "Dashboard tổng hợp tồn kho nguyên liệu theo thời gian thực",
        description: "Quản lý kho phải kiểm tra từng file báo cáo của các chi nhánh, dễ bỏ sót nguyên liệu sắp hết.",
        tags: [
            { label: "🔴 Hết nguyên liệu bất ngờ", color: "bg-red-50 text-red-600 border border-red-100" },
            { label: "⏱️ Tiết kiệm 3h/tuần", color: "bg-orange-50 text-orange-600 border border-orange-100" },
            { label: "💻 Google Sheets & App", color: "bg-blue-50 text-blue-600 border border-blue-100" },
        ],
    },
];

type TabId = "all" | "pending" | "done";

const tabs: { id: TabId; label: string }[] = [
    { id: "all", label: "Tất cả" },
    { id: "pending", label: "⏳ Đang chờ" },
    { id: "done", label: "✅ Đã áp dụng" },
];

/* ===== Component ===== */
export const IdeasView = () => {
    const [activeTab, setActiveTab] = useState<TabId>("all");

    const filteredTickets = mockTickets.filter((t) => {
        if (activeTab === "all") return true;
        if (activeTab === "pending") return !t.status.includes("Đã áp dụng");
        if (activeTab === "done") return t.status.includes("Đã áp dụng");
        return true;
    });

    return (
        <div className="space-y-6 pb-6">
            {/* ===== Header ===== */}
            <div className="anim-fade-in-up">
                <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                    <span className="text-2xl">💡</span>
                    Kho sáng kiến của tôi
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                    Theo dõi tiến độ các đề xuất tối ưu quy trình của bạn
                </p>
            </div>

            {/* ===== Tabs ===== */}
            <div className="flex gap-4 border-b border-slate-200 pb-2 mb-2 anim-fade-in-up anim-delay-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`text-sm font-medium pb-2 border-b-2 transition-all ${activeTab === tab.id
                                ? "text-indigo-600 border-indigo-500"
                                : "text-slate-400 border-transparent hover:text-slate-600"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ===== Card List ===== */}
            <div className="flex flex-col gap-5">
                {filteredTickets.length > 0 ? (
                    filteredTickets.map((ticket, idx) => (
                        <article
                            key={ticket.code}
                            className={`bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition anim-fade-in-up anim-delay-${idx + 1}`}
                        >
                            {/* Row 1: Ticket code + Date + Status */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-mono font-semibold text-slate-400">{ticket.code}</span>
                                    <span className="text-xs text-slate-300">•</span>
                                    <span className="text-xs text-slate-400">{ticket.date}</span>
                                </div>
                                <span className={`rounded-full px-3 py-1 text-xs font-medium ${ticket.statusColor}`}>
                                    {ticket.status}
                                </span>
                            </div>

                            {/* Row 2: Title + Description */}
                            <h3 className="text-lg font-semibold text-slate-800 mt-3">{ticket.title}</h3>
                            <p className="text-sm text-slate-400 mt-1 leading-relaxed">{ticket.description}</p>

                            {/* Row 3: Tags */}
                            <div className="flex flex-wrap gap-2 mt-4">
                                {ticket.tags.map((tag, ti) => (
                                    <span
                                        key={ti}
                                        className={`rounded-full px-3 py-1 text-xs font-medium ${tag.color}`}
                                    >
                                        {tag.label}
                                    </span>
                                ))}
                            </div>

                            {/* Row 4: Admin Feedback (optional) */}
                            {ticket.feedback && (
                                <div className="bg-slate-50 rounded-lg p-3 mt-4 text-sm text-slate-700 border-l-4 border-indigo-400 leading-relaxed">
                                    {ticket.feedback.text}
                                </div>
                            )}
                        </article>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <span className="material-symbols-outlined text-5xl text-slate-200">inbox</span>
                        <p className="text-sm text-slate-400 mt-3">Không có sáng kiến nào trong danh mục này</p>
                    </div>
                )}
            </div>
        </div>
    );
};
