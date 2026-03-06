import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../integrations/supabase/client";

const loginSchema = z.object({
    email: z
        .string()
        .min(1, "Vui lòng nhập email")
        .email("Email không hợp lệ"),
    password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormValues) => {
        setLoading(true);
        setError(null);

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (authError) throw authError;

            navigate("/app");
        } catch (err: any) {
            console.error("Login error:", err);
            setError(err.message || "Invalid credentials");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="font-sans min-h-screen flex overflow-hidden bg-white dark:bg-slate-900">
            {/* ===== LEFT SIDEBAR (desktop only) ===== */}
            <div className="hidden lg:flex lg:w-1/2 bg-slate-50 dark:bg-slate-950 relative flex-col items-center justify-center p-12 overflow-hidden border-r border-slate-100 dark:border-slate-800">
                {/* Cloud pattern background */}
                <div className="absolute inset-0 bg-cloud-pattern opacity-60 z-0 pointer-events-none" />

                {/* Blurred gradient orbs */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40" />

                {/* Chinese Proverb */}
                <div className="relative z-10 max-w-lg text-center space-y-8">
                    <div className="space-y-4">
                        <h2 className="text-6xl font-chinese text-slate-800 dark:text-slate-200 font-light tracking-wide leading-relaxed drop-shadow-sm">
                            千里之行<br />始于足下
                        </h2>
                        <div className="h-16 w-[1px] bg-gradient-to-b from-transparent via-slate-300 to-transparent mx-auto my-6" />
                        <p className="text-2xl font-serif italic text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                            "Hành trình vạn dặm<br />bắt đầu từ một bước chân."
                        </p>
                    </div>
                    <p className="text-xs text-slate-400 uppercase tracking-[0.3em] mt-12 font-medium">
                        Wisdom • Focus • Growth
                    </p>
                </div>
            </div>

            {/* ===== RIGHT — LOGIN FORM ===== */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white dark:bg-slate-900 relative">
                {/* Gradient border wrapper */}
                <div className="w-full max-w-md p-[1px] rounded-2xl bg-gradient-to-br from-slate-200 via-blue-50 to-slate-200 dark:from-slate-700 dark:via-slate-800 dark:to-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 md:p-10 relative overflow-hidden">
                        {/* Top accent line */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-cyan-300" />

                        {/* Header */}
                        <div className="flex flex-col items-center text-center mb-8">
                            <img
                                alt="Dong Nguyen Logo"
                                className="h-16 object-contain mb-5"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD4ufR262fnIuAhSqzgOvYJSySLsvMN7MwSww1zOCbGlO1NA8EGgYMmaVcc3QK0BxiLIWjXJzIzi6S0CvF0aVRzPpp5LzWpJkmx3-r_FC4qW4XDsJ_M28Q7xVlNX6aOmQueRn4eSofGMfQXmStSkl8uK-Sp3TmdvEYWDAjv3iHEyNQAAqfWhCFvkiB0xxbhY_-T-D2ZULUEY6_5mh8d2GRzBvQvpUHHQrK6GjCezm1cvyygAqUyF83PXJA5VDMfpNf4hSpZKyNkzfcQ"
                            />
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">
                                Đăng nhập
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                Quản lý công việc quan trọng mỗi ngày
                            </p>
                        </div>

                        {/* Form */}
                        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                            {/* Email field */}
                            <div className="space-y-1">
                                <label
                                    className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 pl-1"
                                    htmlFor="email"
                                >
                                    Tài khoản
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-slate-400 group-focus-within:text-blue-500 transition-colors text-[20px]">
                                            person
                                        </span>
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        autoComplete="username"
                                        className={`w-full pl-10 pr-4 py-3 rounded-lg border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm ${errors.email
                                                ? "border-red-500"
                                                : "border-slate-200 dark:border-slate-700"
                                            }`}
                                        placeholder="Ví dụ: quang@dongnguyen.vn"
                                        {...register("email")}
                                    />
                                </div>
                                {errors.email && (
                                    <p className="mt-1 text-xs text-red-500 pl-1">
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>

                            {/* Password field */}
                            <div className="space-y-1">
                                <label
                                    className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 pl-1"
                                    htmlFor="password"
                                >
                                    Mật khẩu
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-slate-400 group-focus-within:text-blue-500 transition-colors text-[20px]">
                                            lock
                                        </span>
                                    </div>
                                    <input
                                        id="password"
                                        type="password"
                                        autoComplete="current-password"
                                        className={`w-full pl-10 pr-4 py-3 rounded-lg border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm tracking-widest ${errors.password
                                                ? "border-red-500"
                                                : "border-slate-200 dark:border-slate-700"
                                            }`}
                                        placeholder="••••••••"
                                        {...register("password")}
                                    />
                                </div>
                                {errors.password && (
                                    <p className="mt-1 text-xs text-red-500 pl-1">
                                        {errors.password.message}
                                    </p>
                                )}
                            </div>

                            {/* Remember me + Forgot */}
                            <div className="flex items-center justify-between text-sm pt-2">
                                <div className="flex items-center">
                                    <input
                                        id="remember-me"
                                        type="checkbox"
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer transition-colors"
                                    />
                                    <label
                                        htmlFor="remember-me"
                                        className="ml-2 block text-slate-600 dark:text-slate-400 cursor-pointer select-none"
                                    >
                                        Ghi nhớ
                                    </label>
                                </div>
                                <a
                                    href="#"
                                    className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 transition-colors hover:underline"
                                >
                                    Quên mật khẩu?
                                </a>
                            </div>

                            {/* Error message */}
                            {error && (
                                <div className="text-center text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                                    {error}
                                </div>
                            )}

                            {/* Submit button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white font-semibold shadow-lg shadow-blue-500/25 transform active:scale-[0.98] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center gap-2 mt-4 disabled:opacity-75 disabled:cursor-not-allowed"
                            >
                                <span>
                                    {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                                </span>
                                {!loading && (
                                    <span className="material-symbols-outlined text-[18px]">
                                        arrow_forward
                                    </span>
                                )}
                            </button>
                        </form>

                        {/* Footer link */}
                        <div className="mt-8 text-center pt-2">
                            <p className="text-sm text-slate-500">
                                Chưa có tài khoản?{" "}
                                <Link
                                    to="/register"
                                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                                >
                                    Đăng ký ngay
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
