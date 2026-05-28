import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Filter, Eye, GraduationCap, Loader2, Edit, Trash2, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStudentsStore } from '@/stores/studentsStore';
import { usePaymentsStore } from '@/stores/paymentsStore';
import { formatCurrency, formatDateShort, stageLabels, statusLabels } from '@/lib/utils';
import type { Stage, Student, StudentStatus } from '@/types';
import StatCard from '@/components/features/StatCard';

const stageOptions: { value: Stage; label: string }[] = [
    { value: 'kg', label: 'رياض الأطفال' },
    { value: 'primary', label: 'المرحلة الابتدائية' },
    { value: 'preparatory', label: 'المرحلة الإعدادية' },
    { value: 'secondary', label: 'المرحلة الثانوية' },
];

const statusOptions: { value: StudentStatus; label: string }[] = [
    { value: 'active', label: 'نشط' },
    { value: 'inactive', label: 'غير نشط' },
    { value: 'graduated', label: 'متخرج' },
    { value: 'transferred', label: 'منقول' },
];

const statusColors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-700',
    graduated: 'bg-blue-100 text-blue-700',
    transferred: 'bg-amber-100 text-amber-700',
};

export default function Students() {
    const { students, isLoading, fetchStudents, updateStudent, deleteStudent } = useStudentsStore();
    const { payments, fetchPayments } = usePaymentsStore();
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
    const [search, setSearch] = useState('');
    const [stageFilter, setStageFilter] = useState<string>('all');
    const [gradeFilter, setGradeFilter] = useState<string>('all');
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    useEffect(() => { fetchPayments(); }, [fetchPayments]);

    const [form, setForm] = useState({
        nationalId: '', name: '', stage: 'primary' as Stage, grade: '', className: '',
        guardianName: '', guardianPhone: '', address: '', totalFees: 0, status: 'active' as StudentStatus
    });

    const enrolledStudents = useMemo(() => {
        if (!Array.isArray(students)) return [];
        return students.filter(s => s && ['active', 'admitted', 'inactive', 'graduated', 'transferred'].includes(s.status));
    }, [students]);

    const activeStudents = useMemo(() => enrolledStudents.filter(s => ['active', 'admitted'].includes(s.status)), [enrolledStudents]);
    const archivedStudents = useMemo(() => enrolledStudents.filter(s => ['graduated', 'transferred', 'inactive'].includes(s.status)), [enrolledStudents]);

    const stats = useMemo(() => {
        const validStudents = enrolledStudents.filter(s => s && s.id && s.name);
        const active = validStudents.filter(s => s.status === 'active' || s.status === 'admitted').length;
        const totalFees = validStudents.reduce((sum, s) => sum + Number(s.totalFees || 0), 0);
        const totalPaid = validStudents.reduce((sum, s) => sum + Number(s.paidAmount || 0), 0);
        const debt = totalFees - totalPaid;
        return { active, totalFees, totalPaid, debt };
    }, [enrolledStudents]);

    const rejectedRequests = useMemo(() => {
        return enrolledStudents.filter(s => s && s.paymentRequestStatus === 'rejected');
    }, [enrolledStudents]);

    const filtered = useMemo(() => {
        const base = activeTab === 'active' ? activeStudents : archivedStudents;
        return base.filter((s) => {
            if (!s || !s.name || !s.nationalId) return false;
            const matchSearch = (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
                              (s.nationalId || '').includes(search) ||
                              (s.guardianPhone || '').includes(search);
            const matchStage = stageFilter === 'all' || s.stage === stageFilter;
            const matchGrade = gradeFilter === 'all' || s.grade === gradeFilter;
            return matchSearch && matchStage && matchGrade;
        });
    }, [activeTab, activeStudents, archivedStudents, search, stageFilter, gradeFilter]);

    const lastPaymentByStudent = useMemo(() => {
        const map: Record<string, string> = {};
        for (const p of payments) {
            if (!p.studentId) continue;
            if (!map[p.studentId] || p.date > map[p.studentId]) {
                map[p.studentId] = p.date;
            }
        }
        return map;
    }, [payments]);

    const gradeOptions = useMemo(() => {
        const base = activeTab === 'active' ? activeStudents : archivedStudents;
        const grades = [...new Set(base.map(s => s.grade).filter(Boolean))].sort();
        return grades;
    }, [activeTab, activeStudents, archivedStudents]);

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStudent) return;
        await updateStudent(editingStudent.id, form);
        toast.success('تم تحديث بيانات الطالب بنجاح');
        setEditDialogOpen(false);
        setEditingStudent(null);
        resetForm();
    };

    const openEditDialog = (student: Student) => {
        setEditingStudent(student);
        setForm({
            nationalId: student.nationalId,
            name: student.name,
            stage: student.stage,
            grade: student.grade,
            className: student.className,
            guardianName: student.guardianName,
            guardianPhone: student.guardianPhone,
            address: student.address,
            totalFees: student.totalFees,
            status: student.status,
        });
        setEditDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
            await deleteStudent(id);
            toast.success('تم حذف الطالب');
        }
    };

    const resetForm = () => {
        setForm({ nationalId: '', name: '', stage: 'primary', grade: '', className: '', guardianName: '', guardianPhone: '', address: '', totalFees: 0, status: 'active' });
    };

    return (
        <div className="space-y-6">
            {/* Rejected Requests Alert */}
            {rejectedRequests.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <h3 className="text-red-800 font-bold flex items-center gap-2 mb-3">
                        <AlertCircle className="size-5" />
                        تنبيه: يوجد طلبات تحصيل مرفوضة من الخزينة للتعديل ({rejectedRequests.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {rejectedRequests.map(s => (
                            <div key={s.id} className="bg-white p-3 rounded border border-red-100 flex items-center justify-between shadow-sm">
                                <div>
                                    <p className="font-bold text-sm text-red-900">{s.name}</p>
                                    <p className="text-xs text-red-700/80">المبلغ المرفوض: {formatCurrency(s.pendingPaymentAmount)}</p>
                                </div>
                                <Link to={`/students/${s.id}`}>
                                    <Button size="sm" variant="destructive" className="h-8 text-xs">مراجعة وتعديل</Button>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="إجمالي الطلاب" value={enrolledStudents.length.toString()} icon={Users} colorClass="teal" />
                <StatCard title="الطلاب النشطين" value={stats.active.toString()} icon={GraduationCap} colorClass="sky" />
                <StatCard title="إجمالي المحصل" value={formatCurrency(stats.totalPaid)} icon={TrendingUp} colorClass="emerald" />
                <StatCard title="المستحقات المتأخرة" value={formatCurrency(stats.debt)} icon={AlertCircle} colorClass="rose" />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'active' | 'archived'); setSearch(''); setStageFilter('all'); setGradeFilter('all'); }}>
                <TabsList>
                    <TabsTrigger value="active">الطلاب النشطون <span className="mr-1.5 bg-primary/10 text-primary text-[10px] px-1.5 rounded-full">{activeStudents.length}</span></TabsTrigger>
                    <TabsTrigger value="archived">الأرشيف <span className="mr-1.5 bg-muted text-muted-foreground text-[10px] px-1.5 rounded-full">{archivedStudents.length}</span></TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 items-center bg-card p-4 rounded-lg border">
                <div className="relative flex-1 min-w-[180px] max-w-sm">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input placeholder="بحث بالاسم أو الرقم القومي..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
                </div>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                    <SelectTrigger className="w-44">
                        <Filter className="size-4 ml-2" />
                        <SelectValue placeholder="كل المراحل" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">كل المراحل</SelectItem>
                        {stageOptions.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={gradeFilter} onValueChange={setGradeFilter}>
                    <SelectTrigger className="w-32">
                        <SelectValue placeholder="كل الصفوف" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">كل الصفوف</SelectItem>
                        {gradeOptions.map(g => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {(stageFilter !== 'all' || gradeFilter !== 'all') && (
                    <Button variant="ghost" size="sm" onClick={() => { setStageFilter('all'); setGradeFilter('all'); }}>
                        مسح الفلاتر ✕
                    </Button>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="font-[Noto_Kufi_Arabic]">تعديل بيانات الطالب</DialogTitle></DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <StudentFormFields form={form} setForm={setForm} isEdit />
                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>إلغاء</Button>
                            <Button type="submit">حفظ التعديلات</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Table */}
            <div className="rounded-lg border bg-card overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-muted/40">
                            <th className="text-right p-3 font-semibold">الطالب</th>
                            <th className="text-right p-3 font-semibold hidden md:table-cell">المرحلة</th>
                            <th className="text-right p-3 font-semibold">الصف / الفصل</th>
                            <th className="text-right p-3 font-semibold hidden lg:table-cell">ولي الأمر</th>
                            <th className="text-right p-3 font-semibold">التحصيل المالي</th>
                            <th className="text-right p-3 font-semibold hidden xl:table-cell">آخر دفعة</th>
                            <th className="text-right p-3 font-semibold hidden sm:table-cell">الحالة</th>
                            <th className="text-right p-3 font-semibold w-24">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={7} className="py-20 text-center"><Loader2 className="size-10 animate-spin mx-auto text-primary" /><p className="mt-2">جاري التحميل...</p></td></tr>
                        ) : (
                            filtered.map((s) => {
                                const pct = Math.round((s.paidAmount / s.totalFees) * 100);
                                return (
                                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                        <td className="p-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-medium">{s.name}</p>
                                                {s.badge && (
                                                    <span
                                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                                                        style={{ backgroundColor: s.badge.color }}
                                                        title={`${s.badge.name} — خصم ${s.badge.discountPercentage}%`}
                                                    >
                                                        {s.badge.icon && <span>{s.badge.icon}</span>}
                                                        {s.badge.name}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">{s.nationalId}</p>
                                        </td>
                                        <td className="p-3 hidden md:table-cell text-muted-foreground">{stageLabels[s.stage]}</td>
                                        <td className="p-3">{s.grade} / {s.className}</td>
                                        <td className="p-3 hidden lg:table-cell">
                                            <p>{s.guardianName}</p>
                                            <p className="text-xs text-muted-foreground tabular-nums">{s.guardianPhone}</p>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 min-w-[60px] h-1.5 rounded-full bg-muted overflow-hidden">
                                                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className="text-[10px] tabular-nums font-medium">{pct}%</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">{formatCurrency(s.paidAmount)} / {formatCurrency(s.totalFees)}</p>
                                        </td>
                                        <td className="p-3 hidden xl:table-cell text-xs text-muted-foreground tabular-nums">
                                            {lastPaymentByStudent[s.id] ? formatDateShort(lastPaymentByStudent[s.id]) : '—'}
                                        </td>
                                        <td className="p-3 hidden sm:table-cell">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-medium ${statusColors[s.status]}`}>
                                                {statusLabels[s.status]}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-1">
                                                <Link to={`/students/${s.id}`}>
                                                    <Button variant="ghost" size="icon" className="size-8" title="عرض"><Eye className="size-4" /></Button>
                                                </Link>
                                                {activeTab === 'active' && (
                                                    <>
                                                        <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditDialog(s)} title="تعديل"><Edit className="size-4" /></Button>
                                                        <Button variant="ghost" size="icon" className="size-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(s.id)} title="حذف"><Trash2 className="size-4" /></Button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
                {!isLoading && filtered.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <GraduationCap className="size-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">لا يوجد طلاب مطابقون للبحث</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function StudentFormFields({ form, setForm, isEdit = false }: { form: any, setForm: any, isEdit?: boolean }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>اسم الطالب</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
                <Label>الرقم القومي</Label>
                <Input required value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
            </div>
            <div className="space-y-2">
                <Label>المرحلة</Label>
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v as Stage })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {stageOptions.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>الصف</Label>
                <Input required value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="مثال: الأول" />
            </div>
            <div className="space-y-2">
                <Label>الفصل</Label>
                <Input required value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} placeholder="مثال: 1/أ" />
            </div>
            {isEdit && (
                <div className="space-y-2">
                    <Label>الحالة</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as StudentStatus })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {statusOptions.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            <div className="space-y-2">
                <Label>اسم ولي الأمر</Label>
                <Input required value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} />
            </div>
            <div className="space-y-2">
                <Label>هاتف ولي الأمر</Label>
                <Input required value={form.guardianPhone} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} />
            </div>
            <div className="space-y-2">
                <Label>إجمالي الرسوم</Label>
                <Input type="number" required value={form.totalFees || ''} onChange={(e) => setForm({ ...form, totalFees: Number(e.target.value) })} />
            </div>
            <div className="col-span-1 sm:col-span-2 space-y-2">
                <Label>العنوان</Label>
                <Input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
        </div>
    );
}
