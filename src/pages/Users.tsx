import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
    UserCog, Plus, Shield, Check, X, Loader2,
    Search, Trash2, KeyRound, Users as UsersIcon,
    UserCheck, UserX, Eye, EyeOff, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useUsersStore } from '@/stores/usersStore';
import { useUserPresence } from '@/hooks/useUserPresence';
import { roleLabels } from '@/lib/utils';
import type { UserRole, UserPermission } from '@/types';

const systemResources = [
    { key: 'dashboard', label: 'لوحة التحكم' },
    { key: 'students', label: 'إدارة الطلاب' },
    { key: 'admission', label: 'القبول والتسجيل' },
    { key: 'student-promotion', label: 'نقل الطلاب' },
    { key: 'year-management', label: 'إدارة السنة الدراسية' },
    { key: 'payments', label: 'المدفوعات' },
    { key: 'treasury', label: 'إدارة الخزينة' },
    { key: 'inventory', label: 'إدارة المخزن' },
    { key: 'suppliers', label: 'سجل الموردين' },
    { key: 'purchasing', label: 'دورة المشتريات' },
    { key: 'bus', label: 'إدارة الباصات' },
    { key: 'reports', label: 'التقارير' },
    { key: 'stage-fees', label: 'الهياكل المالية' },
    { key: 'discount-settings', label: 'صلاحيات الخصم' },
    { key: 'badge-settings', label: 'إعدادات الشارات' },
    { key: 'discount-approvals', label: 'اعتمادات الخصومات' },
    { key: 'payment-approvals', label: 'اعتمادات التحويلات' },
    { key: 'accounts', label: 'شجرة الحسابات' },
    { key: 'journal-entries', label: 'القيود المحاسبية' },
    { key: 'accounting-reports', label: 'التقارير المحاسبية' },
    { key: 'accounting-periods', label: 'الفترات المحاسبية' },
    { key: 'expense-permissions', label: 'حدود الصرف' },
    { key: 'expenses', label: 'المصروفات' },
    { key: 'expense-approvals', label: 'اعتماد المصروفات' },
    { key: 'users', label: 'إدارة المستخدمين' },
    { key: 'system-logs', label: 'سجلات النظام' },
    { key: 'data-migration', label: 'هجرة البيانات' },
    { key: 'database', label: 'إدارة قاعدة البيانات' },
];

const getDefaultPermissions = (): UserPermission[] => {
    return systemResources.map(r => ({
        resource: r.key,
        canRead: false,
        canWrite: false,
        canDelete: false
    }));
};

const roleOptions: { value: UserRole; label: string }[] = [
    { value: 'system_admin', label: 'مدير النظام' },
    { value: 'school_director', label: 'مدير المدرسة' },
    { value: 'head_accountant', label: 'رئيس الحسابات' },
    { value: 'accountant', label: 'محاسب عام' },
    { value: 'treasury_accountant', label: 'محاسب خزينة' },
    { value: 'warehouse_keeper', label: 'أمين المخزن' },
    { value: 'bus_supervisor', label: 'مشرف الباصات' },
];

const roleBadgeColors: Record<string, string> = {
    system_admin: 'bg-red-100 text-red-700',
    school_director: 'bg-purple-100 text-purple-700',
    head_accountant: 'bg-teal-100 text-teal-700',
    accountant: 'bg-blue-100 text-blue-700',
    treasury_accountant: 'bg-cyan-100 text-cyan-700',
    warehouse_keeper: 'bg-amber-100 text-amber-700',
    bus_supervisor: 'bg-emerald-100 text-emerald-700',
};

export default function Users() {
    const { users, isLoading, fetchUsers, addUser, updateUser, toggleUserActive, deleteUser, changePassword } = useUsersStore();

    // Initialize user presence tracking
    useUserPresence();

    // Dialog states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);

    // Form states
    const [form, setForm] = useState({ name: '', email: '', role: 'accountant' as UserRole, password: '12345678', permissions: getDefaultPermissions() });
    const [editForm, setEditForm] = useState({ name: '', email: '', role: 'accountant' as UserRole, permissions: getDefaultPermissions() });
    const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' });

    // UI states
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [targetUser, setTargetUser] = useState<{ id: string; name: string; active: boolean } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Stats
    const stats = useMemo(() => ({
        total: users.length,
        active: users.filter(u => u.active).length,
        inactive: users.filter(u => !u.active).length,
    }), [users]);

    // Filter users
    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const matchSearch = !searchQuery ||
                u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email.toLowerCase().includes(searchQuery.toLowerCase());
            const matchRole = roleFilter === 'all' || u.role === roleFilter;
            return matchSearch && matchRole;
        });
    }, [users, searchQuery, roleFilter]);

    // Handlers
    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await addUser(form);
        setIsSubmitting(false);
        setDialogOpen(false);
        setForm({ name: '', email: '', role: 'accountant', password: '12345678', permissions: getDefaultPermissions() });
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUserId) return;
        setIsSubmitting(true);
        await updateUser(editingUserId, editForm);
        setIsSubmitting(false);
        setEditDialogOpen(false);
        setEditingUserId(null);
    };

    const openEdit = (user: any) => {
        setEditingUserId(user.id);
        
        // Merge existing permissions with defaults
        const currentPerms = user.permissions || [];
        const mergedPerms = systemResources.map(res => {
            const existing = currentPerms.find((p: any) => p.resource === res.key);
            return existing || { resource: res.key, canRead: false, canWrite: false, canDelete: false };
        });

        setEditForm({ name: user.name, email: user.email, role: user.role, permissions: mergedPerms });
        setEditDialogOpen(true);
    };

    const handleToggleActiveClick = (user: { id: string; name: string; active: boolean }) => {
        if (user.active) {
            setTargetUser(user);
            setDeactivateConfirmOpen(true);
        } else {
            toggleUserActive(user.id, user.active);
        }
    };

    const confirmDeactivate = async () => {
        if (!targetUser) return;
        await toggleUserActive(targetUser.id, targetUser.active);
        setDeactivateConfirmOpen(false);
        setTargetUser(null);
    };

    const handleDeleteClick = (user: { id: string; name: string; active: boolean }) => {
        setTargetUser(user);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!targetUser) return;
        setIsSubmitting(true);
        await deleteUser(targetUser.id);
        setIsSubmitting(false);
        setDeleteConfirmOpen(false);
        setTargetUser(null);
    };

    const handlePasswordClick = (user: { id: string; name: string; active: boolean }) => {
        setTargetUser(user);
        setPasswordForm({ password: '', confirm: '' });
        setPasswordDialogOpen(true);
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordForm.password !== passwordForm.confirm) {
            toast.error('كلمة المرور وتأكيدها غير متطابقين');
            return;
        }
        if (passwordForm.password.length < 8) {
            toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
            return;
        }
        if (!targetUser) return;
        setIsSubmitting(true);
        await changePassword(targetUser.id, passwordForm.password);
        setIsSubmitting(false);
        setPasswordDialogOpen(false);
        setTargetUser(null);
    };

    const handlePermissionChange = (isEdit: boolean, resourceKey: string, field: 'canRead' | 'canWrite' | 'canDelete', value: boolean) => {
        const targetForm = isEdit ? editForm : form;
        const setTargetForm = isEdit ? setEditForm : setForm;

        const updatedPermissions = targetForm.permissions.map(p => {
            if (p.resource === resourceKey) {
                const newPerm = { ...p, [field]: value };
                // If granting write or delete, automatically grant read
                if ((field === 'canWrite' || field === 'canDelete') && value) {
                    newPerm.canRead = true;
                }
                // If revoking read, also revoke write and delete
                if (field === 'canRead' && !value) {
                    newPerm.canWrite = false;
                    newPerm.canDelete = false;
                }
                return newPerm;
            }
            return p;
        });

        setTargetForm(prev => ({ ...prev, permissions: updatedPermissions }));
    };

    const PermissionsTable = ({ permissions, isEdit }: { permissions: UserPermission[], isEdit: boolean }) => (
        <div className="mt-4 border rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-2 text-sm font-semibold border-b flex justify-between items-center">
                <span>الصلاحيات المخصصة للمستخدم</span>
                <span className="text-xs font-normal text-muted-foreground">حدد الصلاحيات بدقة</span>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card border-b z-10 shadow-sm">
                        <tr>
                            <th className="text-right p-3 font-semibold">الشاشة / الوحدة</th>
                            <th className="text-center p-3 font-semibold text-blue-600">رؤية</th>
                            <th className="text-center p-3 font-semibold text-amber-600">إضافة/تعديل</th>
                            <th className="text-center p-3 font-semibold text-red-600">حذف</th>
                        </tr>
                    </thead>
                    <tbody>
                        {systemResources.map((res, index) => {
                            const perm = permissions.find(p => p.resource === res.key) || { canRead: false, canWrite: false, canDelete: false };
                            return (
                                <tr key={res.key} className={`border-b last:border-0 ${index % 2 === 0 ? 'bg-muted/10' : ''} hover:bg-muted/30`}>
                                    <td className="p-3 font-medium">{res.label}</td>
                                    <td className="p-3 text-center">
                                        <input 
                                            type="checkbox" 
                                            className="size-4 cursor-pointer accent-blue-600"
                                            checked={perm.canRead}
                                            onChange={(e) => handlePermissionChange(isEdit, res.key, 'canRead', e.target.checked)}
                                        />
                                    </td>
                                    <td className="p-3 text-center">
                                        <input 
                                            type="checkbox" 
                                            className="size-4 cursor-pointer accent-amber-600"
                                            checked={perm.canWrite}
                                            onChange={(e) => handlePermissionChange(isEdit, res.key, 'canWrite', e.target.checked)}
                                        />
                                    </td>
                                    <td className="p-3 text-center">
                                        <input 
                                            type="checkbox" 
                                            className="size-4 cursor-pointer accent-red-600"
                                            checked={perm.canDelete}
                                            onChange={(e) => handlePermissionChange(isEdit, res.key, 'canDelete', e.target.checked)}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <UsersIcon className="size-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold font-[Noto_Kufi_Arabic]">إدارة المستخدمين</h2>
                        <p className="text-sm text-muted-foreground">
                            {stats.total} مستخدم · {stats.active} نشط · {stats.inactive} معطل
                        </p>
                    </div>
                </div>

                {/* Add User Dialog */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button disabled={isSubmitting}>
                            <Plus className="size-4 ml-2" />إضافة مستخدم
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="font-[Noto_Kufi_Arabic]">إضافة مستخدم جديد وصلاحياته</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>الاسم</Label>
                                    <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>البريد الإلكتروني</Label>
                                    <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>الدور</Label>
                                    <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {roleOptions.map((r) => (
                                                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>كلمة المرور</Label>
                                    <Input required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                                </div>
                            </div>
                            
                            {/* Add User Permissions Matrix */}
                            <PermissionsTable permissions={form.permissions} isEdit={false} />

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>إلغاء</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="size-4 ml-2 animate-spin" />}
                                    إضافة
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-100">
                        <UsersIcon className="size-4 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">إجمالي المستخدمين</p>
                        <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                </div>
                <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
                    <div className="p-2 rounded-full bg-emerald-100">
                        <UserCheck className="size-4 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">المستخدمون النشطون</p>
                        <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
                    </div>
                </div>
                <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
                    <div className="p-2 rounded-full bg-red-100">
                        <UserX className="size-4 text-red-600" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">المستخدمون المعطلون</p>
                        <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
                    </div>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        placeholder="بحث بالاسم أو البريد الإلكتروني..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pr-10"
                    />
                </div>
                <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as UserRole | 'all')}>
                    <SelectTrigger className="w-full sm:w-52">
                        <SelectValue placeholder="فلترة حسب الدور" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">جميع الأدوار</SelectItem>
                        {roleOptions.map((r) => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Permissions Overview */}
            <div className="rounded-lg border bg-card p-5">
                <h3 className="text-sm font-bold font-[Noto_Kufi_Arabic] mb-4 flex items-center gap-2">
                    <Shield className="size-4 text-primary" />
                    صلاحيات الأدوار
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b">
                                <th className="text-right p-2 font-semibold">الصفحة</th>
                                {roleOptions.map((r) => <th key={r.value} className="text-center p-2 font-semibold">{r.label}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { page: 'لوحة التحكم', access: [true, true, true, true, true, true, true] },
                                { page: 'إدارة الطلاب والقبول', access: [true, true, true, true, false, false, false] },
                                { page: 'الخزينة والمدفوعات', access: [true, true, true, true, true, false, false] },
                                { page: 'الخصومات والاعتمادات', access: [true, true, true, false, false, false, false] },
                                { page: 'الحسابات العامة والقيود', access: [true, true, true, false, false, false, false] },
                                { page: 'المصروفات', access: [true, true, true, true, true, false, false] },
                                { page: 'دورة المشتريات', access: [true, true, true, true, false, true, false] },
                                { page: 'المخازن والموردين', access: [true, true, false, false, false, true, false] },
                                { page: 'الباصات', access: [true, true, false, false, false, false, true] },
                                { page: 'التقارير', access: [true, true, true, false, false, true, true] },
                                { page: 'النظام والأمان والمستخدمين', access: [true, false, false, false, false, false, false] },
                            ].map((row) => (
                                <tr key={row.page} className="border-b last:border-0">
                                    <td className="p-2 font-medium">{row.page}</td>
                                    {row.access.map((a, i) => (
                                        <td key={i} className="text-center p-2">
                                            {a ? <Check className="size-4 text-emerald-500 mx-auto" /> : <X className="size-4 text-gray-300 mx-auto" />}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Users Table */}
            <div className="rounded-lg border bg-card overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-muted/40">
                            <th className="text-right p-3 font-semibold">المستخدم</th>
                            <th className="text-right p-3 font-semibold">البريد الإلكتروني</th>
                            <th className="text-right p-3 font-semibold">الدور</th>
                            <th className="text-right p-3 font-semibold">الحالة</th>
                            <th className="text-right p-3 font-semibold">الحضور</th>
                            <th className="text-center p-3 font-semibold w-40">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="py-20 text-center">
                                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                        <Loader2 className="size-10 animate-spin text-primary" />
                                        <p className="font-bold">جاري تحميل المستخدمين...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-16 text-center text-muted-foreground">
                                    <UsersIcon className="size-10 mx-auto mb-3 opacity-30" />
                                    <p>لا يوجد مستخدمون مطابقون للبحث</p>
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map((u) => (
                                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                    <td className="p-3">
                                        <button
                                            onClick={() => openEdit(u)}
                                            className="flex items-center gap-3 hover:text-primary transition-colors text-right w-full"
                                        >
                                            <Avatar className="size-9">
                                                <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                                                    {u.name?.charAt(0) || '?'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <p className="font-medium hover:underline underline-offset-4">{u.name}</p>
                                        </button>
                                    </td>
                                    <td className="p-3 text-muted-foreground" dir="ltr">{u.email}</td>
                                    <td className="p-3">
                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${roleBadgeColors[u.role]}`}>
                                            {roleLabels[u.role]}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <Badge
                                            variant={u.active ? 'default' : 'secondary'}
                                            className={u.active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}
                                        >
                                            {u.active ? 'نشط' : 'معطل'}
                                        </Badge>
                                    </td>
                                    <td className="p-3">
                                        {u.isOnline ? (
                                            <div className="flex items-center gap-1.5">
                                                <span className="relative flex size-2.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500"></span>
                                                </span>
                                                <span className="text-xs text-emerald-600 font-medium">متصل الآن</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="inline-flex rounded-full size-2.5 bg-gray-300"></span>
                                                    <span className="text-xs text-muted-foreground">غير متصل</span>
                                                </div>
                                                {u.lastLogoutAt && (
                                                    <span className="text-[11px] text-muted-foreground/70 pr-4">
                                                        {new Date(u.lastLogoutAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                title="تعديل المستخدم والصلاحيات"
                                                className="p-1.5 rounded-md text-blue-500 hover:bg-blue-50 transition-colors"
                                                onClick={() => openEdit(u)}
                                            >
                                                <UserCog className="size-4" />
                                            </button>
                                            <button
                                                title={u.active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                                                className={`p-1.5 rounded-md transition-colors ${
                                                    u.active
                                                        ? 'text-red-500 hover:bg-red-50'
                                                        : 'text-emerald-500 hover:bg-emerald-50'
                                                }`}
                                                onClick={() => handleToggleActiveClick(u)}
                                            >
                                                {u.active ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
                                            </button>
                                            <button
                                                title="تغيير كلمة المرور"
                                                className="p-1.5 rounded-md text-amber-500 hover:bg-amber-50 transition-colors"
                                                onClick={() => handlePasswordClick(u)}
                                            >
                                                <KeyRound className="size-4" />
                                            </button>
                                            <button
                                                title="حذف المستخدم"
                                                className="p-1.5 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                onClick={() => handleDeleteClick(u)}
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit User Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-[Noto_Kufi_Arabic]">تعديل بيانات وصلاحيات المستخدم</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>الاسم</Label>
                                <Input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>البريد الإلكتروني</Label>
                                <Input type="email" required value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>الدور</Label>
                            <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v as UserRole })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {roleOptions.map((r) => (
                                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {/* Edit User Permissions Matrix */}
                        <PermissionsTable permissions={editForm.permissions} isEdit={true} />

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSubmitting}>إلغاء</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="size-4 ml-2 animate-spin" />}
                                حفظ التعديلات
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Change Password Dialog */}
            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="font-[Noto_Kufi_Arabic] flex items-center gap-2">
                            <KeyRound className="size-5 text-amber-500" />
                            تغيير كلمة المرور
                        </DialogTitle>
                    </DialogHeader>
                    {targetUser && (
                        <p className="text-sm text-muted-foreground">
                            تغيير كلمة مرور: <span className="font-semibold text-foreground">{targetUser.name}</span>
                        </p>
                    )}
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>كلمة المرور الجديدة</Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    minLength={6}
                                    value={passwordForm.password}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                                    className="pl-10"
                                />
                                <button
                                    type="button"
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>تأكيد كلمة المرور</Label>
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={passwordForm.confirm}
                                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={() => setPasswordDialogOpen(false)} disabled={isSubmitting}>إلغاء</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="size-4 ml-2 animate-spin" />}
                                تغيير كلمة المرور
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Deactivate Confirm Dialog */}
            <AlertDialog open={deactivateConfirmOpen} onOpenChange={setDeactivateConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-[Noto_Kufi_Arabic] flex items-center gap-2">
                            <AlertTriangle className="size-5 text-amber-500" />
                            تأكيد تعطيل الحساب
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            هل أنت متأكد من تعطيل حساب <strong>{targetUser?.name}</strong>؟
                            لن يتمكن المستخدم من تسجيل الدخول بعد التعطيل.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDeactivate}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            تعطيل الحساب
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Confirm Dialog */}
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-[Noto_Kufi_Arabic] flex items-center gap-2">
                            <AlertTriangle className="size-5 text-red-500" />
                            تأكيد حذف المستخدم
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            هل أنت متأكد من حذف مستخدم <strong>{targetUser?.name}</strong> نهائياً؟
                            هذا الإجراء لا يمكن التراجع عنه.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isSubmitting}
                        >
                            {isSubmitting && <Loader2 className="size-4 ml-2 animate-spin" />}
                            حذف نهائياً
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
