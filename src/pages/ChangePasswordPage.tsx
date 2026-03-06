import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import { supabase } from "../integrations/supabase/client";
import { Lock, KeyRound, CheckCircle, ArrowLeft, ArrowRight } from "lucide-react";
import logo from "../assets/logo.png";

const changePasswordSchema = z.object({
    old_password: z.string().min(1, "Vui lòng nhập mật khẩu cũ"),
    new_password: z.string().min(6, "Mật khẩu mới phải có ít nhất 6 ký tự"),
    confirm_password: z.string().min(1, "Vui lòng xác nhận mật khẩu mới"),
}).refine((data) => data.new_password === data.confirm_password, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirm_password"],
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

// Password strength calculator
const getPasswordStrength = (password: string): number => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    return score; // 0–4
};

const strengthColors = ["bg-slate-200", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-500"];

const ChangePasswordPage = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<ChangePasswordFormValues>({
        resolver: zodResolver(changePasswordSchema),
    });

    const newPassword = watch("new_password", "");
    const strength = getPasswordStrength(newPassword);

    const onSubmit = async (data: ChangePasswordFormValues) => {
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: data.new_password
            });

            if (error) throw error;

            setSuccess(true);
            setTimeout(() => {
                navigate("/app");
            }, 2000);

        } catch (err: any) {
            console.error("Change password error:", err);
            setError(err.message || "Không thể đổi mật khẩu. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-50 font-sans h-screen w-screen flex flex-col items-center justify-center overflow-hidden relative">
            {/* ===== Background decoration ===== */}
            <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
                <div className="w-[800px] h-[800px] bg-blue-100/50 rounded-full blur-3xl absolute -top-40 -left-20 mix-blend-multiply opacity-40 animate-pulse"></div>
                <div className="w-[600px] h-[600px] bg-cyan-100/50 rounded-full blur-3xl absolute -bottom-20 -right-20 mix-blend-multiply opacity-40"></div>
                <div className="absolute text-[400px] text-slate-200/20 select-none pointer-events-none transform rotate-12" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                    云
                </div>
            </div>

            {/* ===== Main card ===== */}
            <div className="relative z-10 w-full max-w-lg px-4 flex flex-col items-center justify-center h-full">
                <div className="w-full p-[1px] rounded-2xl bg-gradient-to-br from-white/60 via-blue-50/50 to-white/60 backdrop-blur-sm shadow-2xl shadow-slate-200/50 border border-white/50">
                    <div className="bg-white/90 rounded-2xl p-8 md:p-10 relative overflow-hidden backdrop-blur-xl">
                        {/* Top gradient bar */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-cyan-300"></div>

                        {/* Header */}
                        <div className="flex flex-col items-center text-center mb-8">
                            <img
                                alt="MIT Manager Logo"
                                className="h-28 object-contain mb-2"
                                src={logo}
                            />
                            <h1 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight">Đổi mật khẩu</h1>
                            <p className="text-slate-500 text-sm">Cập nhật mật khẩu để bảo vệ tài khoản của bạn</p>
                        </div>

                        {success ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle size={32} />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900">Đổi mật khẩu thành công!</h3>
                                <p className="text-slate-500 mt-2">Đang chuyển hướng về trang chủ...</p>
                            </div>
                        ) : (
                            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
                                {/* Old password */}
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 pl-1" htmlFor="old_password">
                                        Mật khẩu cũ
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                        </div>
                                        <input
                                            id="old_password"
                                            type="password"
                                            className={`w-full pl-10 pr-4 py-3 rounded-lg border bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm tracking-widest ${
                                                errors.old_password ? "border-red-400" : "border-slate-200/80"
                                            }`}
                                            placeholder="••••••••"
                                            {...register("old_password")}
                                        />
                                    </div>
                                    {errors.old_password && (
                                        <p className="text-xs text-red-500 pl-1">{errors.old_password.message}</p>
                                    )}
                                </div>

                                {/* New password */}
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 pl-1" htmlFor="new_password">
                                        Mật khẩu mới
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <KeyRound className="w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                        </div>
                                        <input
                                            id="new_password"
                                            type="password"
                                            className={`w-full pl-10 pr-4 py-3 rounded-lg border bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm tracking-widest ${
                                                errors.new_password ? "border-red-400" : "border-slate-200/80"
                                            }`}
                                            placeholder="••••••••"
                                            {...register("new_password")}
                                        />
                                    </div>
                                    {/* Strength indicator */}
                                    <div className="flex gap-1 mt-2 px-1">
                                        {[1, 2, 3, 4].map((level) => (
                                            <div key={level} className="h-1 flex-1 bg-slate-200 rounded-full overflow-hidden">
                                                {strength >= level && (
                                                    <div className={`h-full w-full ${strengthColors[strength]} transition-all duration-300`}></div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-slate-400 px-1 mt-1">Tối thiểu 6 ký tự, bao gồm chữ hoa và số.</p>
                                    {errors.new_password && (
                                        <p className="text-xs text-red-500 pl-1">{errors.new_password.message}</p>
                                    )}
                                </div>

                                {/* Confirm password */}
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 pl-1" htmlFor="confirm_password">
                                        Nhập lại mật khẩu mới
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <CheckCircle className="w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                        </div>
                                        <input
                                            id="confirm_password"
                                            type="password"
                                            className={`w-full pl-10 pr-4 py-3 rounded-lg border bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm tracking-widest ${
                                                errors.confirm_password ? "border-red-400" : "border-slate-200/80"
                                            }`}
                                            placeholder="••••••••"
                                            {...register("confirm_password")}
                                        />
                                    </div>
                                    {errors.confirm_password && (
                                        <p className="text-xs text-red-500 pl-1">{errors.confirm_password.message}</p>
                                    )}
                                </div>

                                {/* Error message */}
                                {error && (
                                    <div className="text-center text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                                        {error}
                                    </div>
                                )}

                                {/* Submit button */}
                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white font-semibold shadow-lg shadow-blue-500/25 transform active:scale-[0.98] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center gap-2 disabled:opacity-70"
                                    >
                                        <span>{loading ? "Đang cập nhật..." : "Cập nhật"}</span>
                                        {!loading && <ArrowRight size={16} />}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Back to home link */}
                        <div className="mt-6 text-center border-t border-slate-100 pt-6">
                            <button
                                onClick={() => navigate("/app")}
                                className="text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
                            >
                                <ArrowLeft size={16} />
                                Quay lại trang chủ
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer version */}
                <p className="text-center text-xs text-slate-400 mt-8 font-medium tracking-widest uppercase">
                    MIT Manager Security • Ver 3.0
                </p>
            </div>
        </div>
    );
};

export default ChangePasswordPage;
