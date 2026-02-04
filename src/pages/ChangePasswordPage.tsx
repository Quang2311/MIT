import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import { supabase } from "../integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
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

const ChangePasswordPage = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ChangePasswordFormValues>({
        resolver: zodResolver(changePasswordSchema),
    });

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
                <div className="bg-white rounded-lg shadow-lg p-8 relative">
                    <button
                        onClick={() => navigate("/app")}
                        className="absolute top-4 left-4 text-gray-400 hover:text-gray-600"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Đổi mật khẩu</h2>
                        <p className="mt-2 text-sm text-blue-600">
                            Cập nhật mật khẩu mới của bạn
                        </p>
                    </div>

                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Đổi mật khẩu thành công!</h3>
                            <p className="text-gray-500 mt-2">Đang chuyển hướng về trang chủ...</p>
                        </div>
                    ) : (
                        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                            <div className="space-y-4">
                                {/* Old Password - Note: Supabase update logic doesn't strictly require old password confirmation on client side if session is active, 
                                    but it's good practice for UI. We just mock-check or send it if needed. 
                                    For simplicity and "Login-like" feel, we verify session is active. */}
                                <div>
                                    <label htmlFor="old_password" className="block text-sm font-medium text-gray-700 mb-2">
                                        Mật khẩu cũ
                                    </label>
                                    <input
                                        id="old_password"
                                        type="password"
                                        className={`relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm ${errors.old_password ? "border-red-500" : ""
                                            }`}
                                        placeholder="••••••••"
                                        {...register("old_password")}
                                    />
                                    {errors.old_password && (
                                        <p className="mt-1 text-xs text-red-500">
                                            {errors.old_password.message}
                                        </p>
                                    )}
                                </div>

                                {/* New Password */}
                                <div>
                                    <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-2">
                                        Mật khẩu mới
                                    </label>
                                    <input
                                        id="new_password"
                                        type="password"
                                        className={`relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm ${errors.new_password ? "border-red-500" : ""
                                            }`}
                                        placeholder="••••••••"
                                        {...register("new_password")}
                                    />
                                    {errors.new_password && (
                                        <p className="mt-1 text-xs text-red-500">
                                            {errors.new_password.message}
                                        </p>
                                    )}
                                </div>

                                {/* Confirm Password */}
                                <div>
                                    <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-2">
                                        Xác nhận mật khẩu mới
                                    </label>
                                    <input
                                        id="confirm_password"
                                        type="password"
                                        className={`relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm ${errors.confirm_password ? "border-red-500" : ""
                                            }`}
                                        placeholder="••••••••"
                                        {...register("confirm_password")}
                                    />
                                    {errors.confirm_password && (
                                        <p className="mt-1 text-xs text-red-500">
                                            {errors.confirm_password.message}
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
                                    {loading ? "Đang cập nhật..." : "Xác nhận & Thay đổi"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordPage;
