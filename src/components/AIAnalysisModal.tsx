import { useState, useEffect } from "react";
import { X, Sparkles, Trophy, Flame, Heart, Rocket } from "lucide-react";

interface AIAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    completedCount: number;
    totalCount: number;
}

export const AIAnalysisModal = ({ isOpen, onClose, completedCount, totalCount }: AIAnalysisModalProps) => {
    const [isAnalyzing, setIsAnalyzing] = useState(true);

    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    useEffect(() => {
        if (isOpen) {
            setIsAnalyzing(true);
            const timer = setTimeout(() => {
                setIsAnalyzing(false);
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Get motivational message based on progress
    const getMotivation = () => {
        if (progressPercent === 100) {
            return {
                title: "🎉 XUẤT SẮC!",
                message: "Bạn đã hoàn thành tất cả công việc hôm nay! Đây là thành tích đáng tự hào. Nghỉ ngơi xứng đáng và chuẩn bị năng lượng cho ngày mai nhé!",
                emoji: "🏆"
            };
        } else if (progressPercent >= 75) {
            return {
                title: "🚀 GẦN XONG RỒI!",
                message: `Chỉ còn ${totalCount - completedCount} việc nữa thôi! Bạn đang làm rất tốt. Đừng dừng lại khi đã đi được 3/4 chặng đường. Chiến thắng đang ở ngay trước mắt!`,
                emoji: "💪"
            };
        } else if (progressPercent >= 50) {
            return {
                title: "⚡ ĐANG TIẾN BỘ!",
                message: "Bạn đang ở giữa hành trình! Đây là lúc cần kiên trì nhất. Hãy nhớ: mỗi task hoàn thành là một bước gần hơn đến mục tiêu. Bạn làm được!",
                emoji: "🔥"
            };
        } else if (progressPercent > 0) {
            return {
                title: "🌱 KHỞI ĐẦU TỐT!",
                message: "Bạn đã bắt đầu - đó là điều quan trọng nhất! Nhiều người không dám bắt đầu, nhưng bạn đã làm được. Tiếp tục từng bước một nhé!",
                emoji: "✨"
            };
        } else {
            return {
                title: "🌅 HÃY BẮT ĐẦU!",
                message: "Hành trình ngàn dặm bắt đầu từ một bước chân. Hãy chọn 1 việc dễ nhất để bắt đầu. Tôi tin bạn có thể làm được!",
                emoji: "💫"
            };
        }
    };

    const motivation = getMotivation();

    // Get icon based on progress
    const getIcon = () => {
        if (progressPercent === 100) return <Trophy className="text-yellow-500" size={28} />;
        if (progressPercent >= 75) return <Rocket className="text-blue-500" size={28} />;
        if (progressPercent >= 50) return <Flame className="text-orange-500" size={28} />;
        if (progressPercent > 0) return <Sparkles className="text-purple-500" size={28} />;
        return <Heart className="text-pink-500" size={28} />;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-5 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 text-white/80 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Sparkles size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Phân tích AI</h2>
                            <p className="text-white/80 text-sm">Đánh giá tiến độ của bạn</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6">
                    {isAnalyzing ? (
                        <div className="flex flex-col items-center py-8">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-500"></div>
                                <Sparkles className="absolute inset-0 m-auto text-blue-500" size={24} />
                            </div>
                            <p className="mt-4 text-gray-500 animate-pulse">Đang phân tích...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Progress Display */}
                            <div className="flex items-center justify-center gap-4 p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl">
                                {getIcon()}
                                <div className="text-center">
                                    <div className={`text-4xl font-bold ${progressPercent === 100 ? 'text-green-500' :
                                        progressPercent > 0 ? 'text-blue-600' : 'text-gray-400'
                                        }`}>
                                        {progressPercent}%
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">
                                        {completedCount}/{totalCount} hoàn thành
                                    </div>
                                </div>
                            </div>

                            {/* Motivation Message */}
                            <div className="text-center space-y-3">
                                <h3 className="text-xl font-bold text-gray-800">
                                    {motivation.title}
                                </h3>
                                <p className="text-gray-600 leading-relaxed">
                                    {motivation.message}
                                </p>
                                <div className="text-3xl">{motivation.emoji}</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!isAnalyzing && (
                    <div className="p-6 pt-0">
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            Tiếp tục làm việc! 💪
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
