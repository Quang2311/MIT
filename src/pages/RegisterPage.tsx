import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../integrations/supabase/client";
import type { DepartmentCode } from "../integrations/supabase/types";

const DEPARTMENTS: { value: DepartmentCode; label: string }[] = [
    { value: "BOD", label: "Ban Giám Đốc (BOD)" },
    { value: "HR", label: "Nhân Sự (HR)" },
    { value: "OPS", label: "Vận Hành (OPS)" },
    { value: "MKT", label: "Marketing (MKT)" },
    { value: "ACC", label: "Tài chính kế toán (ACC)" },
    { value: "CX", label: "Trải Nghiệm Khách Hàng (CX)" },
    { value: "QAQC", label: "Quản lý chất lượng (QAQC)" },
    { value: "R&D", label: "Nghiên cứu & Phát triển (R&D)" },
    { value: "SP", label: "Chiến lược (SP)" },
    { value: "BD", label: "Phát triển kinh doanh (BD)" },
];

const registerSchema = z.object({
    email: z
        .string()
        .min(1, "Vui lòng nhập email")
        .email("Email không hợp lệ"),
    full_name: z.string().min(2, "Họ và tên phải có ít nhất 2 ký tự"),
    employee_code: z
        .string()
        .min(1, "Vui lòng nhập mã nhân viên")
        .regex(/^TM\d{4}$/, "Mã NV phải theo format TMxxxx (VD: TM0142)"),
    department: z.string().min(1, "Vui lòng chọn phòng ban"),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const RegisterPage = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterFormValues) => {
        setLoading(true);
        setError(null);

        try {
            // Pass metadata via signUp — trigger will auto-create profile
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        full_name: data.full_name,
                        employee_code: data.employee_code.toUpperCase(),
                        department: data.department,
                    },
                },
            });

            if (authError) throw authError;

            if (authData.user) {
                navigate("/app");
            }
        } catch (err: any) {
            console.error("Registration error:", err);
            setError(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="font-sans min-h-screen flex overflow-hidden bg-white dark:bg-slate-900">
            {/* ===== LEFT SIDEBAR (desktop only) ===== */}
            <div className="hidden lg:flex lg:w-1/2 bg-slate-50 dark:bg-slate-950 relative flex-col items-center justify-center p-12 overflow-hidden border-r border-slate-100 dark:border-slate-800">
                <div className="absolute inset-0 bg-cloud-pattern opacity-60 z-0 pointer-events-none" />
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40" />

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

            {/* ===== RIGHT — REGISTER FORM ===== */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white dark:bg-slate-900 relative overflow-y-auto">
                <div className="w-full max-w-md p-[1px] rounded-2xl bg-gradient-to-br from-slate-200 via-blue-50 to-slate-200 dark:from-slate-700 dark:via-slate-800 dark:to-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 my-8">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 md:p-10 relative overflow-hidden">
                        {/* Top accent line */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-cyan-300" />

                        {/* Header */}
                        <div className="flex flex-col items-center text-center mb-6">
                            <img
                                alt="Dong Nguyen Logo"
                                className="h-16 object-contain mb-4"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD4ufR262fnIuAhSqzgOvYJSySLsvMN7MwSww1zOCbGlO1NA8EGgYMmaVcc3QK0BxiLIWjXJzIzi6S0CvF0aVRzPpp5LzWpJkmx3-r_FC4qW4XDsJ_M28Q7xVlNX6aOmQueRn4eSofGMfQXmStSkl8uK-Sp3TmdvEYWDAjv3iHEyNQAAqfWhCFvkiB0xxbhY_-T-D2ZULUEY6_5mh8d2GRzBvQvpUHHQrK6GjCezm1cvyygAqUyF83PXJA5VDMfpNf4hSpZKyNkzfcQ"
                            />
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1 tracking-tight">
                                Đăng ký
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                Tạo tài khoản mới
                            </p>
                        </div>

                        {/* Form */}
                        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                            {/* Email */}
                            <div className="space-y-1">
                                <label
                                    className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 pl-1"
                                    htmlFor="email"
                                >
                                    Email
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-slate-400 group-focus-within:text-blue-500 transition-colors text-[20px]">
                                            mail
                                        </span>
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        autoComplete="email"
                                        className={`w-full pl-10 pr-4 py-2.5 rounded-lg border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm ${errors.email
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

                            {/* Full Name */}
                            <div className="space-y-1">
                                <label
                                    className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 pl-1"
                                    htmlFor="full_name"
                                >
                                    Họ và tên
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-slate-400 group-focus-within:text-blue-500 transition-colors text-[20px]">
                                            badge
                                        </span>
                                    </div>
                                    <input
                                        id="full_name"
                                        type="text"
                                        autoComplete="name"
                                        className={`w-full pl-10 pr-4 py-2.5 rounded-lg border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm ${errors.full_name
                                            ? "border-red-500"
                                            : "border-slate-200 dark:border-slate-700"
                                            }`}
                                        placeholder="Nguyễn Văn A"
                                        {...register("full_name")}
                                    />
                                </div>
                                {errors.full_name && (
                                    <p className="mt-1 text-xs text-red-500 pl-1">
                                        {errors.full_name.message}
                                    </p>
                                )}
                            </div>

                            {/* Employee Code */}
                            <div className="space-y-1">
                                <label
                                    className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 pl-1"
                                    htmlFor="employee_code"
                                >
                                    Mã nhân viên
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-slate-400 group-focus-within:text-blue-500 transition-colors text-[20px]">
                                            id_card
                                        </span>
                                    </div>
                                    <input
                                        id="employee_code"
                                        type="text"
                                        className={`w-full pl-10 pr-4 py-2.5 rounded-lg border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm uppercase ${errors.employee_code
                                            ? "border-red-500"
                                            : "border-slate-200 dark:border-slate-700"
                                            }`}
                                        placeholder="TM0142"
                                        maxLength={6}
                                        {...register("employee_code")}
                                    />
                                </div>
                                {errors.employee_code && (
                                    <p className="mt-1 text-xs text-red-500 pl-1">
                                        {errors.employee_code.message}
                                    </p>
                                )}
                            </div>

                            {/* Department */}
                            <div className="space-y-1">
                                <label
                                    className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 pl-1"
                                    htmlFor="department"
                                >
                                    Phòng ban
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-slate-400 group-focus-within:text-blue-500 transition-colors text-[20px]">
                                            apartment
                                        </span>
                                    </div>
                                    <select
                                        id="department"
                                        className={`w-full pl-10 pr-10 py-2.5 rounded-lg border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm appearance-none ${errors.department
                                            ? "border-red-500"
                                            : "border-slate-200 dark:border-slate-700"
                                            }`}
                                        defaultValue=""
                                        {...register("department")}
                                    >
                                        <option disabled value="">
                                            -- Chọn phòng ban --
                                        </option>
                                        {DEPARTMENTS.map((dept) => (
                                            <option key={dept.value} value={dept.value}>
                                                {dept.label}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                        <span className="material-symbols-outlined text-slate-400 text-[20px]">
                                            expand_more
                                        </span>
                                    </div>
                                </div>
                                {errors.department && (
                                    <p className="mt-1 text-xs text-red-500 pl-1">
                                        {errors.department.message}
                                    </p>
                                )}
                            </div>

                            {/* Password */}
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
                                        autoComplete="new-password"
                                        className={`w-full pl-10 pr-4 py-2.5 rounded-lg border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm tracking-widest ${errors.password
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
                                    {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
                                </span>
                            </button>
                        </form>

                        {/* Footer link */}
                        <div className="mt-6 text-center">
                            <p className="text-sm text-slate-500">
                                Đã có tài khoản?{" "}
                                <Link
                                    to="/login"
                                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                                >
                                    Đăng nhập ngay
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
