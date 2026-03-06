import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
    id: string;
    full_name: string | null;
    email: string | null;
    employee_code: string | null;
    department: string | null;
    role: string;
    status: string;
    total_xp: number;
    created_at: string;
}

const ROLE_OPTIONS = [
    { value: "member", label: "Nhân viên", color: "bg-slate-100 text-slate-600 border-slate-200" },
    { value: "manager", label: "Quản lý", color: "bg-blue-50 text-blue-700 border-blue-200" },
    { value: "admin", label: "Admin", color: "bg-violet-50 text-violet-700 border-violet-200" },
] as const;

const DEPT_OPTIONS = ["BOD", "HR", "OPS", "MKT", "ACC", "CX", "QAQC", "R&D", "SP", "BD"] as const;

export const AdminUsersView = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    /* Modal state */
    const [showModal, setShowModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({
        full_name: "", employee_code: "", email: "", password: "",
        department: "", role: "member",
    });

    /* Fetch all users */
    const fetchUsers = useCallback(async () => {
        try {
            const { data, error } = await (supabase as any)
                .from("profiles")
                .select("id, full_name, email, employee_code, department, role, status, total_xp, created_at")
                .order("created_at", { ascending: true });

            if (error) { console.error("Fetch users error:", error); return; }
            setUsers(data || []);
        } catch (err) {
            console.error("AdminUsersView error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    /* Auto-save role change */
    const updateUserRole = async (userId: string, newRole: string) => {
        setUpdatingId(userId);
        try {
            const { error } = await (supabase as any)
                .from("profiles")
                .update({ role: newRole })
                .eq("id", userId);
            if (error) throw error;
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            showToast("Đã cập nhật quyền thành công!", "success");
        } catch (err: any) {
            console.error("Update role error:", err);
            showToast(`Lỗi: ${err.message || "Không thể cập nhật"}`, "error");
        } finally {
            setUpdatingId(null);
        }
    };

    /* Approve user */
    const approveUser = async (userId: string) => {
        setApprovingId(userId);
        try {
            const { error } = await (supabase as any)
                .from("profiles")
                .update({ status: "active" })
                .eq("id", userId);
            if (error) throw error;
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: "active" } : u));
            showToast("Đã duyệt nhân viên thành công!", "success");
        } catch (err: any) {
            console.error("Approve error:", err);
            showToast(`Lỗi: ${err.message || "Không thể duyệt"}`, "error");
        } finally {
            setApprovingId(null);
        }
    };

    /* Create user via Edge Function */
    const createUser = async () => {
        if (!form.full_name || !form.employee_code || !form.email || !form.password) {
            showToast("Vui lòng điền đầy đủ thông tin bắt buộc", "error");
            return;
        }
        setCreating(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Phiên đăng nhập hết hạn");

            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const res = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    email: form.email,
                    password: form.password,
                    full_name: form.full_name,
                    employee_code: form.employee_code,
                    department: form.department || null,
                    role: form.role,
                }),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Lỗi tạo tài khoản");

            // Add to local state
            if (result.user) {
                setUsers(prev => [...prev, {
                    ...result.user,
                    total_xp: 0,
                    created_at: new Date().toISOString(),
                }]);
            }

            showToast("Tạo tài khoản thành công!", "success");
            setShowModal(false);
            setForm({ full_name: "", employee_code: "", email: "", password: "", department: "", role: "member" });
        } catch (err: any) {
            console.error("Create user error:", err);
            showToast(`Lỗi: ${err.message}`, "error");
        } finally {
            setCreating(false);
        }
    };

    /* Toast */
    const showToast = (message: string, type: "success" | "error") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    /* Filtered users */
    const filtered = users.filter(u => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            (u.full_name || "").toLowerCase().includes(q) ||
            (u.employee_code || "").toLowerCase().includes(q) ||
            (u.email || "").toLowerCase().includes(q)
        );
    });

    /* Stats */
    const totalUsers = users.length;
    const totalManagers = users.filter(u => u.role === "manager").length;
    const totalAdmins = users.filter(u => u.role === "admin").length;
    const totalPending = users.filter(u => u.status === "pending").length;

    /* Get role display */
    const getRoleOption = (role: string) =>
        ROLE_OPTIONS.find(r => r.value === role) || ROLE_OPTIONS[0];

    return (
        <div className="space-y-6 pb-10 anim-fade-in-up">
            {/* Toast notification */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 anim-fade-in-up ${toast.type === "success"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-red-50 text-red-600 border-red-200"
                    }`}>
                    <span className="material-symbols-outlined text-[18px]">
                        {toast.type === "success" ? "check_circle" : "error"}
                    </span>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-3">
                        <span className="material-symbols-outlined text-[28px] text-violet-500">manage_accounts</span>
                        Quản lý Nhân sự
                    </h2>
                    <p className="text-[15px] text-slate-400 mt-2">
                        Quản lý tài khoản và phân quyền cho toàn bộ hệ thống
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
                        </div>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Tìm theo tên, mã NV, email..."
                            className="pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-400 transition-all w-64"
                        />
                    </div>
                    {/* Add user button */}
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-500/25 hover:-translate-y-0.5 transition-all"
                    >
                        <span className="material-symbols-outlined text-[18px]">person_add</span>
                        Thêm nhân viên
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200/80 px-5 py-4 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tổng nhân sự</p>
                    <p className="text-3xl font-extrabold text-slate-800 mt-1">{totalUsers}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/80 px-5 py-4 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Quản lý</p>
                    <p className="text-3xl font-extrabold text-blue-600 mt-1">{totalManagers}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/80 px-5 py-4 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Admin</p>
                    <p className="text-3xl font-extrabold text-violet-600 mt-1">{totalAdmins}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/80 px-5 py-4 shadow-sm">
                    <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest">Chờ duyệt</p>
                    <p className={`text-3xl font-extrabold mt-1 ${totalPending > 0 ? "text-amber-500" : "text-slate-300"}`}>
                        {totalPending}
                    </p>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-100 bg-slate-50/50">
                    <div className="col-span-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Thông tin</div>
                    <div className="col-span-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Định danh</div>
                    <div className="col-span-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Phòng ban</div>
                    <div className="col-span-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Quyền hạn</div>
                    <div className="col-span-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Trạng thái</div>
                </div>

                {loading ? (
                    <div className="px-6 py-16 text-center">
                        <div className="w-8 h-8 border-3 border-violet-200 border-t-violet-600 rounded-full anim-spin mx-auto" />
                        <p className="text-sm text-slate-400 mt-3">Đang tải danh sách nhân sự...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <span className="material-symbols-outlined text-5xl text-slate-200">person_search</span>
                        <p className="text-sm text-slate-400 mt-3">
                            {search ? `Không tìm thấy kết quả cho "${search}"` : "Không có nhân sự nào trong hệ thống"}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filtered.map(user => {
                            const roleOpt = getRoleOption(user.role);
                            const isUpdating = updatingId === user.id;
                            const isApproving = approvingId === user.id;
                            const initial = (user.full_name || "?").charAt(0).toUpperCase();
                            const isPending = user.status === "pending";

                            return (
                                <div
                                    key={user.id}
                                    className={`grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors ${isUpdating || isApproving ? "opacity-60" : ""}`}
                                >
                                    {/* Info: Avatar + Name + Email */}
                                    <div className="col-span-3 flex items-center gap-3 min-w-0">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border ${isPending
                                                ? "bg-amber-50 border-amber-200"
                                                : "bg-gradient-to-br from-violet-100 to-indigo-100 border-violet-200/50"
                                            }`}>
                                            <span className={`text-sm font-bold ${isPending ? "text-amber-500" : "text-violet-600"}`}>
                                                {initial}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[14px] font-semibold text-slate-700 truncate">{user.full_name || "—"}</p>
                                            <p className="text-[11px] text-slate-400 truncate">{user.email || "—"}</p>
                                        </div>
                                    </div>

                                    {/* Identity: Employee code */}
                                    <div className="col-span-2">
                                        <p className="text-[13px] font-mono font-semibold text-slate-600">{user.employee_code || "—"}</p>
                                    </div>

                                    {/* Department */}
                                    <div className="col-span-2">
                                        {user.department ? (
                                            <span className="inline-block px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 text-slate-600">
                                                {user.department}
                                            </span>
                                        ) : (
                                            <span className="text-[12px] text-slate-300">—</span>
                                        )}
                                    </div>

                                    {/* Role Dropdown */}
                                    <div className="col-span-2">
                                        <div className="relative">
                                            <select
                                                value={user.role || "member"}
                                                onChange={e => updateUserRole(user.id, e.target.value)}
                                                disabled={isUpdating}
                                                className={`appearance-none w-full pl-3 pr-7 py-1.5 text-[12px] font-semibold rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-100 transition-all disabled:cursor-wait ${roleOpt.color}`}
                                            >
                                                {ROLE_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 pointer-events-none">
                                                {isUpdating ? (
                                                    <div className="w-3.5 h-3.5 border-2 border-violet-300 border-t-violet-600 rounded-full anim-spin" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-[14px] text-slate-400">expand_more</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div className="col-span-3 flex items-center gap-2">
                                        {isPending ? (
                                            <>
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 anim-pulse" />
                                                    Chờ duyệt
                                                </span>
                                                <button
                                                    onClick={() => approveUser(user.id)}
                                                    disabled={isApproving}
                                                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                                >
                                                    {isApproving ? (
                                                        <div className="w-3 h-3 border-2 border-emerald-300 border-t-emerald-600 rounded-full anim-spin" />
                                                    ) : (
                                                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                    )}
                                                    Duyệt
                                                </button>
                                            </>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                Đang hoạt động
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Footer count */}
                {!loading && filtered.length > 0 && (
                    <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/30">
                        <p className="text-[11px] text-slate-400">
                            Hiển thị <span className="font-semibold text-slate-500">{filtered.length}</span> / {users.length} nhân sự
                            {totalPending > 0 && (
                                <span className="ml-3 text-amber-500 font-semibold">• {totalPending} chờ duyệt</span>
                            )}
                        </p>
                    </div>
                )}
            </div>

            {/* ===== CREATE USER MODAL ===== */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm anim-fade-in-up">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                        {/* Modal header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-[16px] font-bold text-slate-800 flex items-center gap-2">
                                <span className="material-symbols-outlined text-violet-500 text-[20px]">person_add</span>
                                Thêm nhân viên mới
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>

                        {/* Modal body */}
                        <div className="px-6 py-5 space-y-4">
                            {/* Row 1: Full name + Employee code */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                                        Họ tên <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.full_name}
                                        onChange={e => setForm({ ...form, full_name: e.target.value })}
                                        placeholder="Nguyễn Văn A"
                                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-400 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                                        Mã NV <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.employee_code}
                                        onChange={e => setForm({ ...form, employee_code: e.target.value.toUpperCase() })}
                                        placeholder="TM0001"
                                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-400 transition-all font-mono"
                                    />
                                </div>
                            </div>

                            {/* Row 2: Email + Password */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                                        Email <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                        placeholder="email@company.com"
                                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-400 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                                        Mật khẩu <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="password"
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                        placeholder="••••••••"
                                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-400 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Row 3: Department + Role */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                                        Phòng ban
                                    </label>
                                    <select
                                        value={form.department}
                                        onChange={e => setForm({ ...form, department: e.target.value })}
                                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-400 transition-all"
                                    >
                                        <option value="">— Chọn phòng ban —</option>
                                        {DEPT_OPTIONS.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                                        Quyền hạn
                                    </label>
                                    <select
                                        value={form.role}
                                        onChange={e => setForm({ ...form, role: e.target.value })}
                                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-400 transition-all"
                                    >
                                        {ROLE_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Modal footer */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={createUser}
                                disabled={creating}
                                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-500/25 transition-all disabled:opacity-60 disabled:cursor-wait"
                            >
                                {creating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full anim-spin" />
                                        Đang tạo...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[16px]">check</span>
                                        Tạo tài khoản
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
