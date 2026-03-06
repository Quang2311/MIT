import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/* ===== Types ===== */
type SettingsTab = "profile" | "security" | "notifications";

interface UserProfile {
    full_name: string | null;
    employee_code: string | null;
    department: string | null;
    email: string | null;
    total_xp: number;
}

/* ===== Emoji avatars (18 options, 6×3 grid) ===== */
const AVATAR_OPTIONS = [
    "😊", "😎", "🤓", "🦊", "🐱", "🐶",
    "🐼", "🦁", "🐯", "🐰", "🐻", "🦄",
    "🌸", "🌻", "⭐", "🎯", "🚀", "💎",
];

/* ===== Mock login history ===== */
const mockLoginHistory = [
    { device: "Chrome — Windows", ip: "192.168.1.42", time: "2 giờ trước", icon: "computer" },
    { device: "Safari — iPhone", ip: "10.0.0.18", time: "Hôm qua, 21:30", icon: "smartphone" },
    { device: "Chrome — MacOS", ip: "192.168.1.55", time: "3 ngày trước", icon: "laptop_mac" },
];

/* ===== Horizontal tab config ===== */
const settingsTabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: "profile", label: "Hồ sơ cá nhân", icon: "person_outline" },
    { id: "security", label: "Bảo mật & Đăng nhập", icon: "shield_moon" },
    { id: "notifications", label: "Tùy chọn thông báo", icon: "notifications_active" },
];

/* ===== Component ===== */
export const SettingsView = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [selectedAvatar, setSelectedAvatar] = useState("😊");
    const [savedAvatar, setSavedAvatar] = useState("😊");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const [showAvatarPicker, setShowAvatarPicker] = useState(false);

    /* Notification toggles */
    const [emailNotif, setEmailNotif] = useState(true);
    const [dailyReminder, setDailyReminder] = useState(true);
    const [weeklyReport, setWeeklyReport] = useState(false);

    /* Fetch profile */
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const { data } = await supabase
                    .from("profiles")
                    .select("full_name, employee_code, department, email, total_xp" as any)
                    .eq("id", user.id)
                    .single();
                if (data) setProfile(data as unknown as UserProfile);
            } catch (err) {
                console.error("Settings profile fetch error:", err);
            }
        };
        fetchProfile();
    }, []);

    /* Save avatar */
    const handleSaveAvatar = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            await (supabase as any)
                .from("profiles")
                .update({ avatar_emoji: selectedAvatar })
                .eq("id", user.id);
            setSavedAvatar(selectedAvatar);
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
        } catch (err) {
            console.error("Save avatar error:", err);
        } finally {
            setSaving(false);
        }
    };

    /* Toggle Switch */
    const Toggle = ({ enabled, onChange, label, desc }: { enabled: boolean; onChange: () => void; label: string; desc: string }) => (
        <div className="flex items-center justify-between py-5 border-b border-slate-100 last:border-0">
            <div>
                <p className="text-[15px] font-semibold text-slate-700">{label}</p>
                <p className="text-[13px] text-slate-400 mt-1">{desc}</p>
            </div>
            <button
                onClick={onChange}
                className={`relative w-14 h-8 rounded-full transition-colors duration-200 flex-shrink-0 ${enabled ? "bg-indigo-500" : "bg-slate-200"}`}
            >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-200 ${enabled ? "translate-x-[26px]" : "translate-x-1"}`} />
            </button>
        </div>
    );

    return (
        <div className="space-y-6 pb-10 anim-fade-in-up">
            {/* ===== Page Header ===== */}
            <div>
                <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-3">
                    <span className="material-symbols-outlined text-[28px] text-indigo-500">settings</span>
                    Cài đặt tài khoản
                </h2>
                <p className="text-[15px] text-slate-400 mt-2">Quản lý hồ sơ, bảo mật và tùy chọn cá nhân của bạn</p>
            </div>

            {/* ===== Horizontal Tab Bar ===== */}
            <div className="flex gap-1 border-b border-slate-200 pb-0">
                {settingsTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-3 text-[14px] font-medium transition-all border-b-2 -mb-[1px] ${activeTab === tab.id
                            ? "border-indigo-500 text-indigo-600"
                            : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
                            }`}
                    >
                        <span className={`material-symbols-outlined text-[20px] ${activeTab === tab.id ? "text-indigo-500" : "text-slate-400"}`}>
                            {tab.icon}
                        </span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ===== Tab Content ===== */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">

                {/* ===== TAB 1: Hồ sơ cá nhân ===== */}
                {activeTab === "profile" && (
                    <div className="anim-fade-in-up">
                        {/* TOP: Identity Info (left) + Profile Preview (right) — MAIN FOCUS */}
                        <div className="flex gap-0 border-b border-slate-100">
                            {/* LEFT: Identity Info Grid */}
                            <div className="flex-1 px-8 py-8 border-r border-slate-100">
                                <div className="flex items-center gap-2.5 mb-2">
                                    <span className="material-symbols-outlined text-[22px] text-indigo-500">badge</span>
                                    <h3 className="text-[17px] font-bold text-slate-800">Thông tin cá nhân</h3>
                                </div>
                                <p className="text-[13px] text-slate-400 mb-5 flex items-center gap-1.5">
                                    Thông tin do Phòng Nhân sự cấp — không thể chỉnh sửa
                                    <span className="material-symbols-outlined text-[14px] text-slate-300">lock</span>
                                </p>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50/80 rounded-xl px-5 py-4 border border-slate-100">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Họ và tên</p>
                                        <p className="text-[15px] font-bold text-slate-800">{profile?.full_name || "Đang tải..."}</p>
                                    </div>
                                    <div className="bg-slate-50/80 rounded-xl px-5 py-4 border border-slate-100">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Mã nhân viên</p>
                                        <p className="text-[15px] font-bold text-slate-800">{profile?.employee_code || "—"}</p>
                                    </div>
                                    <div className="bg-slate-50/80 rounded-xl px-5 py-4 border border-slate-100">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Phòng ban</p>
                                        <p className="text-[15px] font-bold text-slate-800">{profile?.department || "—"}</p>
                                    </div>
                                    <div className="bg-slate-50/80 rounded-xl px-5 py-4 border border-slate-100">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Email đăng nhập</p>
                                        <p className="text-[15px] font-bold text-slate-800 truncate">{profile?.email || "—"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Profile Preview */}
                            <div className="w-[260px] flex-shrink-0 px-6 py-8 bg-slate-50/50">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Xem trước hồ sơ</p>
                                <p className="text-[12px] text-slate-400 mb-5 leading-relaxed">
                                    Đây là cách hồ sơ của bạn hiển thị với đồng nghiệp trên bảng xếp hạng Top Performers.
                                </p>

                                <div className="flex flex-col items-center text-center">
                                    <div className="relative mb-3">
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center border-2 border-indigo-200/60 shadow-md">
                                            <span className="text-3xl">{selectedAvatar}</span>
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-[8px] font-extrabold shadow-md">
                                            TOP 5
                                        </div>
                                    </div>

                                    <p className="text-[15px] font-extrabold text-slate-800">{profile?.full_name || "..."}</p>
                                    <p className="text-[12px] text-slate-400 mt-1">
                                        Nhân viên • <span className="font-semibold text-slate-500">{profile?.employee_code || "—"}</span>
                                    </p>

                                    <div className="flex gap-5 mt-4 pt-4 border-t border-slate-200 w-full justify-center">
                                        <div className="text-center">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Điểm</p>
                                            <p className="text-[22px] font-extrabold text-indigo-600 mt-0.5">
                                                {(profile?.total_xp || 0).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="w-[1px] bg-slate-200" />
                                        <div className="text-center">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Huy hiệu</p>
                                            <p className="text-[22px] font-extrabold text-violet-600 mt-0.5">
                                                {Math.floor((profile?.total_xp || 0) / 100)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BOTTOM: Avatar Section — compact, picker hidden by default */}
                        <div className="px-8 py-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center border border-amber-200/60 shadow-sm">
                                        <span className="text-2xl">{selectedAvatar}</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[20px] text-indigo-500">face</span>
                                            <h3 className="text-[15px] font-bold text-slate-800">Ảnh đại diện</h3>
                                        </div>
                                        <p className="text-[12px] text-slate-400 mt-0.5">Chọn một nhân vật yêu thích để thể hiện cá tính của bạn</p>
                                    </div>
                                </div>
                                {!showAvatarPicker ? (
                                    <button
                                        onClick={() => setShowAvatarPicker(true)}
                                        className="px-4 py-2 text-[13px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200/60 transition-all flex items-center gap-1.5"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">edit</span>
                                        Thay đổi
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => { setSelectedAvatar(savedAvatar); setShowAvatarPicker(false); }}
                                        className="px-4 py-2 text-[13px] font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                        Đóng
                                    </button>
                                )}
                            </div>

                            {/* Expandable Picker Grid */}
                            {showAvatarPicker && (
                                <div className="mt-5 pt-5 border-t border-slate-100 anim-fade-in-up">
                                    <div className="grid grid-cols-9 gap-2 max-w-lg">
                                        {AVATAR_OPTIONS.map((emoji) => (
                                            <button
                                                key={emoji}
                                                onClick={() => setSelectedAvatar(emoji)}
                                                className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all ${selectedAvatar === emoji
                                                    ? "bg-indigo-100 ring-2 ring-indigo-400 scale-110 shadow-sm"
                                                    : "bg-slate-50 hover:bg-slate-100 hover:scale-105 border border-slate-100"
                                                    }`}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                    {selectedAvatar !== savedAvatar && (
                                        <div className="flex items-center gap-3 mt-4">
                                            <button
                                                onClick={handleSaveAvatar}
                                                disabled={saving}
                                                className="px-4 py-2 text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl shadow-md shadow-indigo-500/20 transition-all disabled:opacity-40 flex items-center gap-1.5"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">{saved ? "check" : "save"}</span>
                                                {saved ? "Đã lưu!" : saving ? "Đang lưu..." : "Lưu avatar"}
                                            </button>
                                            <button
                                                onClick={() => { setSelectedAvatar(savedAvatar); setShowAvatarPicker(false); }}
                                                className="text-[13px] text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                Hủy
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ===== TAB 2: Bảo mật & Đăng nhập ===== */}
                {activeTab === "security" && (
                    <div className="anim-fade-in-up">
                        <div className="px-8 pt-8 pb-6 border-b border-slate-100">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="material-symbols-outlined text-[22px] text-indigo-500">lock</span>
                                <h3 className="text-[17px] font-bold text-slate-800">Đổi mật khẩu</h3>
                            </div>
                            <p className="text-[13px] text-slate-400 mb-5">Cập nhật mật khẩu đăng nhập để bảo vệ tài khoản</p>
                            <button
                                onClick={() => navigate("/change-password")}
                                className="flex items-center justify-between w-full px-6 py-5 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100/60 hover:border-indigo-200 hover:shadow-lg transition-all group"
                            >
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-indigo-600 text-[24px]">lock_reset</span>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[15px] font-bold text-slate-800">Thay đổi mật khẩu</p>
                                        <p className="text-[13px] text-slate-400 mt-1">Nhập mật khẩu cũ và tạo mật khẩu mới</p>
                                    </div>
                                </div>
                                <span className="material-symbols-outlined text-[22px] text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all">arrow_forward</span>
                            </button>
                        </div>

                        <div className="px-8 pt-6 pb-8">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="material-symbols-outlined text-[22px] text-indigo-500">history</span>
                                <h3 className="text-[17px] font-bold text-slate-800">Lịch sử đăng nhập gần đây</h3>
                            </div>
                            <p className="text-[13px] text-slate-400 mb-5">Kiểm tra hoạt động đăng nhập vào tài khoản của bạn</p>
                            <div className="space-y-3">
                                {mockLoginHistory.map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-slate-50/80 border border-slate-100">
                                        <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                                            <span className="material-symbols-outlined text-slate-400 text-[22px]">{item.icon}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[14px] font-semibold text-slate-700">{item.device}</p>
                                            <p className="text-[12px] text-slate-400 mt-0.5 font-mono">{item.ip}</p>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            {i === 0 && (
                                                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                                                    Đang hoạt động
                                                </span>
                                            )}
                                            <span className="text-[13px] text-slate-400">{item.time}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== TAB 3: Tùy chọn thông báo ===== */}
                {activeTab === "notifications" && (
                    <div className="px-8 py-8 anim-fade-in-up">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="material-symbols-outlined text-[22px] text-indigo-500">notifications_active</span>
                            <h3 className="text-[17px] font-bold text-slate-800">Cài đặt thông báo</h3>
                        </div>
                        <p className="text-[13px] text-slate-400 mb-6">Quản lý cách bạn nhận thông báo từ hệ thống</p>

                        <div className="bg-slate-50/80 rounded-2xl border border-slate-100 px-6">
                            <Toggle enabled={emailNotif} onChange={() => setEmailNotif(!emailNotif)} label="Thông báo qua Email" desc="Nhận email khi có thông báo quan trọng từ quản lý" />
                            <Toggle enabled={dailyReminder} onChange={() => setDailyReminder(!dailyReminder)} label="Nhắc nhở công việc hàng ngày" desc="Nhận nhắc nhở mỗi sáng để nhập MITs mới" />
                            <Toggle enabled={weeklyReport} onChange={() => setWeeklyReport(!weeklyReport)} label="Báo cáo tuần tổng hợp" desc="Tóm tắt thống kê hoàn thành task hàng tuần qua email" />
                        </div>

                        <div className="mt-6 flex items-start gap-3 text-[13px] text-slate-400 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4">
                            <span className="material-symbols-outlined text-amber-400 text-[18px] mt-0.5">info</span>
                            <span>Thay đổi tùy chọn thông báo sẽ được áp dụng ngay lập tức. Tính năng email đang trong giai đoạn phát triển.</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
