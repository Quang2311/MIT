import { useState, useEffect } from "react";
import { Check, LogOut, History, User, Lock, X } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AIAnalysisModal } from "./AIAnalysisModal";
import { HistoryModal } from "./HistoryModal";

interface Task {
    id: string;
    text: string;
    completed: boolean;
}

interface DashboardLayoutProps {
    tasks: Task[];
    onToggleTask: (id: string) => void;
    onLogout: () => void;
    onCheckout: () => Promise<void>;
}

export const DashboardLayout = ({ tasks, onToggleTask, onLogout, onCheckout }: DashboardLayoutProps) => {
    const [userEmail, setUserEmail] = useState<string>("");
    const [showToast, setShowToast] = useState(true);
    const [showAIModal, setShowAIModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                setUserEmail(user.email);
            }
        };
        getUser();

        const timer = setTimeout(() => setShowToast(false), 3000);
        return () => clearTimeout(timer);
    }, []);

    // Progress calculations
    const completedCount = tasks.filter(t => t.completed).length;
    const totalCount = tasks.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const circumference = 251.2;
    const strokeOffset = circumference - (progressPercent / 100) * circumference;

    const getProgressColor = () => {
        if (progressPercent === 100) return "#10B981";
        if (progressPercent >= 50) return "#3B82F6";
        return "#BFDBFE";
    };

    return (
        <div className="min-h-screen bg-[#FDFCF9]">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                            <Check size={18} strokeWidth={3} />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-gray-900 leading-tight">MIT Manager</h1>
                            <p className="text-xs text-gray-500">Most Important Tasks</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowHistoryModal(true)}
                            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm font-medium"
                        >
                            <History size={16} />
                            Lịch sử
                        </button>

                        {/* User Dropdown */}
                        <div className="relative group py-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 cursor-pointer">
                                <User size={16} />
                            </div>
                            <div className="absolute right-0 top-full pt-2 w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-2">
                                    <div className="px-3 py-2 text-sm text-gray-500 border-b border-gray-50 mb-1">
                                        {userEmail || "Loading..."}
                                    </div>
                                    <Link
                                        to="/change-password"
                                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2 mb-1 transition-colors"
                                    >
                                        <Lock size={16} className="text-gray-400" />
                                        Thay đổi mật khẩu
                                    </Link>
                                    <button
                                        onClick={onLogout}
                                        className="w-full px-3 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                                    >
                                        <LogOut size={16} />
                                        Đăng xuất
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                {/* Task List Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Công việc hôm nay</h2>
                            <p className="text-xs text-gray-500 mt-1">
                                {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })}
                            </p>
                        </div>
                        <div className={`flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full ${progressPercent === 100 ? 'text-green-600 bg-green-50' : 'text-blue-600 bg-blue-50'
                            }`}>
                            <Check size={14} />
                            {completedCount}/{totalCount}
                        </div>
                    </div>

                    <div className="p-6 space-y-3">
                        {tasks.map((task) => (
                            <div
                                key={task.id}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${task.completed
                                        ? 'bg-gray-50 border-gray-100'
                                        : 'bg-blue-50/30 border-blue-100 hover:border-blue-200'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => onToggleTask(task.id)}
                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.completed
                                                ? 'bg-blue-500 border-blue-500 text-white'
                                                : 'border-blue-300 hover:border-blue-500'
                                            }`}
                                    >
                                        {task.completed && <Check size={14} strokeWidth={3} />}
                                    </button>
                                    <span className={`text-sm font-medium ${task.completed ? 'text-gray-400 line-through' : 'text-gray-700'
                                        }`}>
                                        {task.text}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 pt-0">
                        <button
                            onClick={async () => {
                                setIsCheckingOut(true);
                                await onCheckout();
                                setIsCheckingOut(false);
                            }}
                            disabled={isCheckingOut}
                            className="w-full py-3 bg-gradient-to-r from-blue-400 to-cyan-400 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            <LogOut size={18} />
                            {isCheckingOut ? "Đang lưu..." : "Checkout - Kết thúc ngày làm việc"}
                        </button>
                    </div>
                </div>

                {/* Progress Chart Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <h2 className="text-lg font-bold text-gray-900">Tiến độ hôm nay</h2>
                    </div>

                    <div className="flex justify-center mb-6">
                        <div className="relative w-32 h-32">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="64" cy="64" r="40" stroke="#E5E7EB" strokeWidth="8" fill="none" />
                                <circle
                                    cx="64" cy="64" r="40"
                                    stroke={getProgressColor()}
                                    strokeWidth="8"
                                    fill="none"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeOffset}
                                    strokeLinecap="round"
                                    className="transition-all duration-500 ease-out"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-3xl font-bold ${progressPercent === 100 ? 'text-green-500' :
                                        progressPercent > 0 ? 'text-blue-500' : 'text-gray-300'
                                    }`}>
                                    {progressPercent}%
                                </span>
                                <span className="text-xs text-gray-400">{completedCount}/{totalCount} tasks</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowAIModal(true)}
                        className="w-full py-2.5 border border-blue-200 text-blue-500 font-medium rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Phân tích AI
                    </button>
                </div>
            </main>

            {/* Toast Notification */}
            {showToast && (
                <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-xl border border-gray-100 flex items-center gap-3 animate-in slide-in-from-bottom duration-500">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                        <Check size={20} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-900">Đăng nhập thành công!</h4>
                        <p className="text-xs text-gray-500">Chào mừng bạn quay lại</p>
                    </div>
                    <button onClick={() => setShowToast(false)} className="ml-4 text-gray-400 hover:text-gray-600">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Modals */}
            <AIAnalysisModal
                isOpen={showAIModal}
                onClose={() => setShowAIModal(false)}
                completedCount={completedCount}
                totalCount={totalCount}
            />
            <HistoryModal
                isOpen={showHistoryModal}
                onClose={() => setShowHistoryModal(false)}
            />
        </div>
    );
};
