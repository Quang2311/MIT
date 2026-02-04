import { useState, useEffect } from "react";
import { X, Calendar, CheckCircle, Clock, TrendingUp, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HistorySession {
    id: string;
    session_date: string;
    checkout_at: string;
    total_tasks: number;
    completed_tasks: number;
    completion_rate: number;
}

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEditSession?: (sessionDate: string) => void;
}

export const HistoryModal = ({ isOpen, onClose, onEditSession }: HistoryModalProps) => {
    const [sessions, setSessions] = useState<HistorySession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadHistory();
        }
    }, [isOpen]);

    const loadHistory = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("mit_sessions")
                .select("*")
                .eq("user_id", user.id)
                .order("session_date", { ascending: false })
                .limit(30);

            if (error) {
                console.error("Error loading history:", error);
            } else if (data) {
                setSessions(data);
            }
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (sessionId: string) => {
        if (!confirm("Bạn có chắc muốn xóa lịch sử này?")) return;

        setDeletingId(sessionId);
        try {
            const { error } = await supabase
                .from("mit_sessions")
                .delete()
                .eq("id", sessionId);

            if (error) {
                console.error("Delete error:", error);
                alert("Không thể xóa. Vui lòng thử lại.");
            } else {
                // Remove from local state
                setSessions(sessions.filter(s => s.id !== sessionId));
            }
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setDeletingId(null);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return "Hôm nay";
        } else if (date.toDateString() === yesterday.toDateString()) {
            return "Hôm qua";
        } else {
            return date.toLocaleDateString("vi-VN", {
                weekday: "short",
                day: "numeric",
                month: "numeric",
            });
        }
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getProgressColor = (rate: number) => {
        if (rate === 100) return "text-green-500 bg-green-50";
        if (rate >= 75) return "text-blue-500 bg-blue-50";
        if (rate >= 50) return "text-yellow-500 bg-yellow-50";
        return "text-orange-500 bg-orange-50";
    };

    const isToday = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const canEdit = (session: HistorySession) => {
        return isToday(session.session_date);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-5 text-white flex-shrink-0 relative">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 text-white/80 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Clock size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Lịch sử làm việc</h2>
                            <p className="text-white/80 text-sm">Xem lại các phiên làm việc trước</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-4 overflow-y-auto flex-1">
                    {isLoading ? (
                        <div className="flex flex-col items-center py-8">
                            <div className="w-10 h-10 border-4 border-blue-200 rounded-full animate-spin border-t-blue-500"></div>
                            <p className="mt-3 text-gray-500">Đang tải...</p>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="text-center py-12">
                            <Calendar className="mx-auto text-gray-300 mb-3" size={48} />
                            <h3 className="text-gray-500 font-medium">Chưa có lịch sử</h3>
                            <p className="text-gray-400 text-sm mt-1">
                                Hoàn thành công việc và checkout để lưu lịch sử
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sessions.map((session) => (
                                <div
                                    key={session.id}
                                    className={`p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors ${deletingId === session.id ? 'opacity-50' : ''
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-gray-400" />
                                            <span className="font-medium text-gray-700">
                                                {formatDate(session.session_date)}
                                            </span>
                                            {isToday(session.session_date) && (
                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                                                    Hôm nay
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-gray-400 mr-1">
                                                {formatTime(session.checkout_at)}
                                            </span>
                                            {/* Edit button for today's session */}
                                            {canEdit(session) && onEditSession && (
                                                <button
                                                    onClick={() => {
                                                        onClose();
                                                        onEditSession(session.session_date);
                                                    }}
                                                    className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                                                    title="Sửa lại"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                            )}
                                            {/* Delete button */}
                                            <button
                                                onClick={() => handleDelete(session.id)}
                                                disabled={deletingId === session.id}
                                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                title="Xóa lịch sử"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5">
                                                <CheckCircle size={14} className="text-green-500" />
                                                <span className="text-sm text-gray-600">
                                                    {session.completed_tasks}/{session.total_tasks} tasks
                                                </span>
                                            </div>
                                        </div>

                                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getProgressColor(session.completion_rate)}`}>
                                            <div className="flex items-center gap-1">
                                                <TrendingUp size={14} />
                                                {session.completion_rate}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-300 ${session.completion_rate === 100 ? 'bg-green-500' :
                                                    session.completion_rate >= 50 ? 'bg-blue-500' : 'bg-orange-500'
                                                }`}
                                            style={{ width: `${session.completion_rate}%` }}
                                        />
                                    </div>

                                    {/* Edit hint for today's session */}
                                    {canEdit(session) && onEditSession && (
                                        <p className="mt-2 text-xs text-orange-500 flex items-center gap-1">
                                            <Pencil size={12} />
                                            Click vào bút chì để cập nhật tiến độ
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};
