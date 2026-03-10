import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const PendingApprovalScreen = () => {
    const navigate = useNavigate();
    const [signingOut, setSigningOut] = useState(false);

    const handleSignOut = async () => {
        setSigningOut(true);
        await supabase.auth.signOut();
        navigate("/login");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 flex items-center justify-center p-6">
            {/* Decorative blobs */}
            <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl pointer-events-none" />
            <div className="fixed bottom-1/4 right-1/4 w-80 h-80 bg-indigo-100/30 rounded-full blur-3xl pointer-events-none" />

            {/* Main Card */}
            <div className="relative z-10 w-full max-w-lg">
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-10 text-center">
                    {/* Hourglass Icon */}
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-100 to-yellow-50 border border-amber-200/60 flex items-center justify-center shadow-sm">
                        <span className="text-5xl leading-none">⏳</span>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-extrabold text-slate-800 mb-3">
                        Tài khoản đang chờ phê duyệt
                    </h1>

                    {/* Description */}
                    <p className="text-[15px] text-slate-500 leading-relaxed mb-8 max-w-sm mx-auto">
                        Thông tin của bạn đã được ghi nhận. Vui lòng đợi Admin kiểm tra và cấp quyền truy cập hệ thống.
                        <br />
                        <span className="text-slate-400">Bạn có thể quay lại sau.</span>
                    </p>

                    {/* Status indicator */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200/60 mb-8">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                            Đang chờ phê duyệt
                        </span>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-100 mb-6" />

                    {/* Sign Out Button */}
                    <button
                        onClick={handleSignOut}
                        disabled={signingOut}
                        className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:text-slate-700 transition-all disabled:opacity-60 disabled:cursor-wait"
                    >
                        {signingOut ? (
                            <>
                                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                                Đang đăng xuất...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[18px]">logout</span>
                                Đăng xuất
                            </>
                        )}
                    </button>
                </div>

                {/* Footer */}
                <p className="text-center text-[11px] text-slate-400 mt-4">
                    Nếu cần hỗ trợ, liên hệ IT hoặc Admin của bạn.
                </p>
            </div>
        </div>
    );
};
