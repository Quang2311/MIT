import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/* ===== Types ===== */
interface MemberMITs {
    userId: string;
    fullName: string;
    employeeCode: string;
    tasks: { title: string; completed: boolean }[];
}

/* ===== Component ===== */
export const TeamJournalView = ({ userDepartment }: { userDepartment: string | null }) => {
    /* MITs State */
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    });
    const [mitsData, setMitsData] = useState<MemberMITs[]>([]);
    const [mitsLoading, setMitsLoading] = useState(false);

    /* ===== Fetch MITs for selected date ===== */
    useEffect(() => {
        if (!userDepartment) return;
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
    }, [userDepartment, selectedDate]);

    return (
        <div className="space-y-6 pb-10 anim-fade-in-up">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-3">
                    <span className="material-symbols-outlined text-[28px] text-indigo-500">auto_stories</span>
                    Nhật ký Đội nhóm
                </h2>
                <p className="text-[15px] text-slate-400 mt-2">
                    Theo dõi lịch sử hoàn thành MITs của phòng <span className="font-bold text-indigo-500">{userDepartment || "—"}</span>
                </p>
            </div>

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
    );
};
