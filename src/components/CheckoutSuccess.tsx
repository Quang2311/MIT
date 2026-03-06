import { Check, Calendar, TrendingUp } from "lucide-react";

interface CheckoutSuccessProps {
    completedCount: number;
    totalCount: number;
    completionRate: number;
    onViewHistory: () => void;
    onBackToDashboard: () => void;
    onLogout: () => void;
}

export const CheckoutSuccess = ({
    completedCount,
    totalCount,
    completionRate,
    onViewHistory,
    onBackToDashboard,
    onLogout
}: CheckoutSuccessProps) => {
    const today = new Date().toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    const getMessage = () => {
        if (completionRate === 100) {
            return {
                title: "Xuất sắc! 🏆",
                subtitle: "Bạn đã hoàn thành tất cả công việc hôm nay!",
                emoji: "🎉"
            };
        } else if (completionRate >= 75) {
            return {
                title: "Tuyệt vời! 🚀",
                subtitle: "Bạn đã hoàn thành hầu hết công việc!",
                emoji: "💪"
            };
        } else if (completionRate >= 50) {
            return {
                title: "Tốt lắm! ⭐",
                subtitle: "Bạn đã cố gắng rất nhiều hôm nay!",
                emoji: "👍"
            };
        } else {
            return {
                title: "Đã checkout! 📝",
                subtitle: "Ngày mai sẽ tốt hơn!",
                emoji: "💫"
            };
        }
    };

    const message = getMessage();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Success Card */}
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
                    {/* Header with confetti effect */}
                    <div className="relative bg-gradient-to-r from-green-400 to-emerald-500 p-8 text-center text-white overflow-hidden">
                        {/* Decorative circles */}
                        <div className="absolute top-0 left-0 w-20 h-20 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                        <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2"></div>

                        <div className="relative z-10">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <Check className="text-green-500" size={40} strokeWidth={3} />
                            </div>
                            <h1 className="text-2xl font-bold mb-2">{message.title}</h1>
                            <p className="text-white/90">{message.subtitle}</p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="p-6 space-y-6">
                        {/* Date */}
                        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                            <Calendar size={16} />
                            <span>{today}</span>
                        </div>

                        {/* Progress Circle */}
                        <div className="flex justify-center">
                            <div className="relative w-32 h-32">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="56"
                                        stroke="#E5E7EB"
                                        strokeWidth="10"
                                        fill="none"
                                    />
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="56"
                                        stroke={completionRate === 100 ? "#10B981" : "#3B82F6"}
                                        strokeWidth="10"
                                        fill="none"
                                        strokeDasharray={351.86}
                                        strokeDashoffset={351.86 - (completionRate / 100) * 351.86}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-out"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className={`text-4xl font-bold ${completionRate === 100 ? 'text-green-500' : 'text-blue-500'
                                        }`}>
                                        {completionRate}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Task Stats */}
                        <div className="flex justify-center gap-8">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-500">{completedCount}</div>
                                <div className="text-xs text-gray-500">Hoàn thành</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-400">{totalCount - completedCount}</div>
                                <div className="text-xs text-gray-500">Chưa xong</div>
                            </div>
                        </div>

                        {/* Emoji */}
                        <div className="text-center text-5xl animate-bounce">
                            {message.emoji}
                        </div>

                        {/* Actions */}
                        <div className="space-y-3 pt-4">
                            <button
                                onClick={onViewHistory}
                                className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <TrendingUp size={18} />
                                Xem lịch sử làm việc
                            </button>
                            <button
                                onClick={onBackToDashboard}
                                className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-200"
                            >
                                <Calendar size={18} />
                                Quay lại giao diện
                            </button>
                            <button
                                onClick={onLogout}
                                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-xl transition-colors"
                            >
                                Đăng xuất
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-white/80 text-sm mt-6">
                    Hẹn gặp lại bạn vào ngày mai! 👋
                </p>
            </div>
        </div>
    );
};
