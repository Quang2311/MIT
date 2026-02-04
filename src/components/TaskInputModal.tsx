import { useState } from "react";
import { Plus, X } from "lucide-react";

interface TaskInputModalProps {
    isOpen: boolean;
    onSubmit: (tasks: string[]) => void;
}

export const TaskInputModal = ({ isOpen, onSubmit }: TaskInputModalProps) => {
    // Initial 3 empty tasks
    const [tasks, setTasks] = useState<string[]>(["", "", ""]);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleAddTask = () => {
        if (tasks.length < 5) {
            setTasks([...tasks, ""]);
        }
    };

    const handleTaskChange = (index: number, value: string) => {
        const newTasks = [...tasks];
        newTasks[index] = value;
        setTasks(newTasks);
        if (error) setError(null);
    };

    const handleSubmit = () => {
        // Filter out empty tasks
        const validTasks = tasks.filter((t) => t.trim().length > 0);

        if (validTasks.length < 3) {
            setError("Vui lòng nhập ít nhất 3 công việc quan trọng.");
            return;
        }

        onSubmit(validTasks);
    };


    const formattedTime = "17:45"; // Hardcoded as per design, or could be dynamic

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header Section */}
                <div className="p-6 pb-0 relative">
                    <button className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500 rounded-lg">
                            <div className="w-6 h-6 border-2 border-white rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Chào buổi sáng!</h2>
                            <p className="text-gray-500 text-sm">Hãy bắt đầu ngày mới hiệu quả</p>
                        </div>
                    </div>

                    <div className="mt-4 bg-blue-50 rounded-lg p-3 flex items-center gap-2 text-blue-800 text-sm font-medium">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Báo cáo kết quả lúc {formattedTime} hôm nay
                    </div>
                </div>

                {/* Body Section */}
                <div className="p-6">
                    <h3 className="font-semibold text-gray-800 mb-1">Nhập 3–5 công việc quan trọng nhất hôm nay:</h3>
                    <p className="text-sm text-gray-500 mb-6">MIT (Most Important Tasks) giúp bạn tập trung vào những việc thực sự quan trọng</p>

                    <div className="space-y-3">
                        {tasks.map((task, index) => (
                            <div key={index} className="flex gap-3">
                                <div className="flex-none w-8 h-10 bg-blue-50 text-blue-600 font-bold rounded-lg flex items-center justify-center">
                                    {index + 1}
                                </div>
                                <input
                                    type="text"
                                    value={task}
                                    onChange={(e) => handleTaskChange(index, e.target.value)}
                                    placeholder={`Công việc quan trọng ${index + 1}...`}
                                    className="flex-1 border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    autoFocus={index === 0}
                                />
                            </div>
                        ))}
                    </div>

                    {tasks.length < 5 && (
                        <button
                            onClick={handleAddTask}
                            className="w-full mt-4 py-3 border-2 border-dashed border-blue-200 rounded-lg text-blue-500 font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus size={18} />
                            Thêm công việc (tối đa 5)
                        </button>
                    )}

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        className="w-full mt-6 bg-gradient-to-r from-blue-400 to-cyan-400 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-200 transition-all transform active:scale-95"
                    >
                        Xác nhận & Bắt đầu làm việc
                    </button>
                </div>
            </div>
        </div>
    );
};
