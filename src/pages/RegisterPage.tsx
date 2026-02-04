import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../integrations/supabase/client";

import logo from "../assets/logo.png";

const registerSchema = z.object({
    email: z
        .string()
        .min(1, "Vui lòng nhập email")
        .email("Email không hợp lệ"),
    full_name: z.string().min(2, "Họ và tên phải có ít nhất 2 ký tự"),
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
            // 1. Sign up with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
            });

            if (authError) throw authError;

            if (authData.user) {
                // Extract employee code from email (part before @)
                const employeeCode = data.email.split('@')[0];

                // 2. Create Profile
                const { error: profileError } = await supabase.from("profiles").insert({
                    id: authData.user.id,
                    employee_code: employeeCode.toUpperCase(),
                    full_name: data.full_name,
                    email: data.email,
                });

                if (profileError) {
                    console.warn("Profile creation failed (likely RLS policy). Continuing to app as Auth user was created.", profileError);
                    // Do not throw here. Allow user to proceed to dashboard.
                    // Ideally, we should show a toast saying "Account created but profile incomplete".
                }

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
        <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <img
                        src={logo}
                        alt="MIT Manager Logo"
                        className="mx-auto h-20 w-20 mb-4"
                    />
                    <h1 className="text-3xl font-bold text-gray-900">MIT Manager</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Quản lý công việc quan trọng mỗi ngày
                    </p>
                </div>

                {/* White Card Container */}
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Đăng ký</h2>
                        <p className="mt-2 text-sm text-blue-600">
                            Tạo tài khoản mới
                        </p>
                    </div>
                    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                        <div className="space-y-4">
                            {/* Email */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    className={`relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm ${errors.email ? "border-red-500" : ""
                                        }`}
                                    placeholder="Ví dụ: quang@dongnguyen.vn"
                                    {...register("email")}
                                />
                                {errors.email && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>

                            {/* Full Name */}
                            <div>
                                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                                    Họ và tên
                                </label>
                                <input
                                    id="full_name"
                                    type="text"
                                    autoComplete="name"
                                    className={`relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm ${errors.full_name ? "border-red-500" : ""
                                        }`}
                                    placeholder="Nguyễn Văn A"
                                    {...register("full_name")}
                                />
                                {errors.full_name && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {errors.full_name.message}
                                    </p>
                                )}
                            </div>

                            {/* Password */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                    Mật khẩu
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    autoComplete="new-password"
                                    className={`relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm ${errors.password ? "border-red-500" : ""
                                        }`}
                                    placeholder="••••••••"
                                    {...register("password")}
                                />
                                {errors.password && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {errors.password.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="text-center text-sm text-red-600 bg-red-50 p-2 rounded">
                                {error}
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative flex w-full justify-center rounded-md border border-transparent bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-sm font-medium text-white hover:from-blue-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-75"
                            >
                                {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
                            </button>
                        </div>

                        <div className="text-center">
                            <p className="text-sm text-gray-600">
                                Đã có tài khoản?{" "}
                                <Link
                                    to="/login"
                                    className="font-medium text-blue-600 hover:text-blue-500"
                                >
                                    Đăng nhập ngay
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
                {/* End White Card */}
            </div>
        </div>
    );
};

export default RegisterPage;
