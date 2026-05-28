import { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
    ArrowRight, User, Phone, MapPin, Calendar, CreditCard, BookOpen,
    CheckCircle2, Clock, AlertCircle, Bus, Printer, Tag, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStudentsStore } from '@/stores/studentsStore';
import { usePaymentsStore } from '@/stores/paymentsStore';
import { useBusStore } from '@/stores/busStore';
import { useDeliveryOrderStore } from '@/stores/deliveryOrderStore';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency, formatDateShort, stageLabels, paymentTypeLabels, paymentMethodLabels } from '@/lib/utils';
import { getAuthHeaders } from '@/stores/authStore';
import type { PaymentType, PaymentMethod, Badge as BadgeType, StudentContactLog, ContactOutcome } from '@/types';
import { printPaymentReceipt } from '@/hooks/usePrintReceipt';
import StudentStatement from '@/components/student/StudentStatement';

const instStatusConfig = {
    paid: { label: 'مسدد', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    pending: { label: 'قادم', icon: Clock, color: 'text-amber-600 bg-amber-50' },
    overdue: { label: 'متأخر', icon: AlertCircle, color: 'text-red-600 bg-red-50' },
};

export default function StudentDetail() {
    const { id } = useParams<{ id: string }>();
    const { students, fetchStudents, updateStudent } = useStudentsStore();
    const { user } = useAuthStore();
    const {
        payments,
        fetchPayments,
        addPayment,
        installmentPlans,
        fetchStudentInstallments,
        saveInstallmentPlan,
        payInstallment,
        fetchStudentInventory,
        inventoryTx: inventoryTxMap
    } = usePaymentsStore();
    const { subscriptions, routes } = useBusStore();
    const { orders: deliveryOrders, fetchOrders: fetchDeliveryOrders } = useDeliveryOrderStore();

    useEffect(() => {
        fetchStudents();
        fetchPayments();
        if (id) {
            fetchStudentInstallments(id);
            fetchStudentInventory(id);
        }
    }, [fetchStudents, fetchPayments, fetchStudentInstallments, fetchStudentInventory, id]);

    useEffect(() => {
        if (id) fetchDeliveryOrders({ studentId: id });
    }, [id]);

    const student = students.find((s) => s.id === id);
    const studentPayments = useMemo(
      () => payments.filter(p =>
        p.studentId === id &&
        p.type !== 'application_fee' &&
        (!p.academicYear || p.academicYear === student?.academicYear)
      ),
      [payments, id, student?.academicYear]
    );
    const studentInstallments = useMemo(() => {
        const plan = id ? installmentPlans[id] : null;
        return plan ? [plan] : [];
    }, [installmentPlans, id]);
    const studentInventoryTx = useMemo(
        () => (id ? (inventoryTxMap[id] ?? []) : []),
        [inventoryTxMap, id]
    );
    const busSub = subscriptions.find((s) => s.studentId === id && s.status === 'active');
    const studentDeliveries = deliveryOrders.filter(o => o.studentId === id);

    const [payDialogOpen, setPayDialogOpen] = useState(false);
    const [instDialogOpen, setInstDialogOpen] = useState(false);
    const [payForm, setPayForm] = useState({ amount: 0, type: 'tuition' as PaymentType, method: 'cash' as PaymentMethod, notes: '', walletPhoneNumber: '' });
    const [instForm, setInstForm] = useState({ totalAmount: 0, numberOfInstallments: 3 });
    const [installmentsPreview, setInstallmentsPreview] = useState<{id?: string, dueDate: string, amount: number, status?: string, paidAmount?: number}[]>([]);
    const [payingInstallment, setPayingInstallment] = useState<{planId: string, instId: string, maxAmount: number} | null>(null);
    const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
    const [badges, setBadges] = useState<BadgeType[]>([]);
    const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
    const [assigningBadge, setAssigningBadge] = useState(false);
    const [editingPhone, setEditingPhone] = useState(false);
    const [phoneValue, setPhoneValue] = useState('');
    const [classDialogOpen, setClassDialogOpen] = useState(false);
    const [classForm, setClassForm] = useState({ grade: '', className: '' });
    const [savingField, setSavingField] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [contactLogs, setContactLogs] = useState<StudentContactLog[]>([]);
    const [contactForm, setContactForm] = useState({ date: new Date().toISOString().split('T')[0], notes: '', outcome: 'contacted' as ContactOutcome });
    const [savingContact, setSavingContact] = useState(false);

    useEffect(() => {
        fetch('/api/badges', { headers: getAuthHeaders() })
            .then(r => r.json()).then(setBadges).catch(() => {});
    }, []);

    useEffect(() => {
        if (!id) return;
        fetch(`/api/students/${id}/contacts`, { headers: getAuthHeaders() })
            .then(r => r.json()).then(setContactLogs).catch(() => {});
    }, [id]);

    const handleAssignBadge = async (badgeId: string | null) => {
        if (!student) return;
        setAssigningBadge(true);
        try {
            const res = await fetch(`/api/students/${student.id}/badge`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ badgeId }),
            });
            if (!res.ok) throw new Error();
            toast.success(badgeId ? 'تم تعيين الشارة وتطبيق الخصم تلقائياً' : 'تم إزالة الشارة');
            setBadgeDialogOpen(false);
            await fetchStudents();
        } catch {
            toast.error('فشل تعيين الشارة');
        } finally {
            setAssigningBadge(false);
        }
    };

    const handleSavePhone = async () => {
        if (!student || !phoneValue.trim()) return;
        setSavingField(true);
        try {
            await updateStudent(student.id, { guardianPhone: phoneValue.trim() });
            setEditingPhone(false);
            toast.success('تم تحديث رقم الهاتف');
        } catch {
            toast.error('فشل تحديث الرقم');
        } finally {
            setSavingField(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !student) return;
        if (file.size > 500 * 1024) { toast.error('الصورة أكبر من 500KB — يرجى ضغطها أولاً'); return; }
        setUploadingPhoto(true);
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const res = await fetch(`/api/students/${student.id}/photo`, {
                    method: 'POST',
                    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ photoUrl: reader.result as string }),
                });
                if (!res.ok) throw new Error();
                await fetchStudents();
                toast.success('تم تحديث الصورة');
            } catch {
                toast.error('فشل رفع الصورة');
            } finally {
                setUploadingPhoto(false);
            }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleSaveContact = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!student || !contactForm.notes.trim()) return;
        setSavingContact(true);
        try {
            const res = await fetch(`/api/students/${student.id}/contacts`, {
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(contactForm),
            });
            if (!res.ok) throw new Error();
            const newLog = await res.json();
            setContactLogs(prev => [newLog, ...prev]);
            setContactForm(f => ({ ...f, notes: '', outcome: 'contacted' }));
            toast.success('تم تسجيل التواصل');
        } catch {
            toast.error('فشل حفظ السجل');
        } finally {
            setSavingContact(false);
        }
    };

    const handleSaveClass = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!student) return;
        setSavingField(true);
        try {
            await updateStudent(student.id, { grade: classForm.grade.trim(), className: classForm.className.trim() });
            setClassDialogOpen(false);
            toast.success('تم نقل الطالب للفصل الجديد');
        } catch {
            toast.error('فشل تحديث الفصل');
        } finally {
            setSavingField(false);
        }
    };

    // Pre-fill form if there's a rejected request
    useEffect(() => {
        if (student && student.paymentRequestStatus === 'rejected' && payDialogOpen) {
            setPayForm(prev => ({
                ...prev,
                amount: student.pendingPaymentAmount || 0,
                type: (student.pendingPaymentType as PaymentType) || 'tuition',
                method: (student.pendingPaymentMethod as PaymentMethod) || 'cash',
                walletPhoneNumber: student.pendingWalletPhoneNumber || ''
            }));
            if (student.pendingInstallmentPlanId && student.pendingInstallmentId) {
                setPayingInstallment({
                    planId: student.pendingInstallmentPlanId,
                    instId: student.pendingInstallmentId,
                    maxAmount: student.pendingPaymentAmount || 0
                });
            }
        }
    }, [payDialogOpen, student]);

    if (!student) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <p className="text-lg text-muted-foreground">الطالب غير موجود</p>
                <Link to="/students"><Button variant="outline">العودة للطلاب</Button></Link>
            </div>
        );
    }

    const totalPaidFromPayments = useMemo(() => studentPayments.reduce((sum, p) => sum + Number(p.amount), 0), [studentPayments]);
    const remaining = student.totalFees - totalPaidFromPayments;
    const totalDebt = student.yearlyFinance?.reduce((sum, yf) => sum + (Number(yf.totalFees) - Number(yf.paidAmount)), 0) || remaining;
    const paidPct = student.totalFees > 0 ? Math.round((totalPaidFromPayments / student.totalFees) * 100) : 0;

    // Initialize installment plan dialog
    useEffect(() => {
        if (instDialogOpen && student) {
            if (editingPlanId) {
                const plan = studentInstallments.find(p => p.id === editingPlanId);
                if (plan) {
                    setInstForm({ totalAmount: plan.totalAmount, numberOfInstallments: plan.numberOfInstallments });
                    setInstallmentsPreview(plan.installments.map(i => ({
                        id: i.id,
                        dueDate: i.dueDate,
                        amount: i.amount,
                        status: i.status,
                        paidAmount: i.paidAmount
                    })));
                }
            } else {
                setInstForm({ totalAmount: totalDebt, numberOfInstallments: 3 });
                generateInstallmentsPreview(totalDebt, 3);
            }
        } else {
            setEditingPlanId(null);
        }
    }, [instDialogOpen, editingPlanId]);

    const generateInstallmentsPreview = (total: number, count: number) => {
        const instAmount = Math.ceil(total / count);
        const preview = Array.from({ length: count }, (_, i) => {
            const dueDate = new Date();
            dueDate.setMonth(dueDate.getMonth() + i + 1);
            return {
                dueDate: dueDate.toISOString().split('T')[0],
                amount: i === count - 1 ? total - instAmount * (count - 1) : instAmount,
            };
        });
        setInstallmentsPreview(preview);
    };

    const handleUpdatePreview = (index: number, field: 'dueDate' | 'amount', value: any) => {
        const newPreview = [...installmentsPreview];
        newPreview[index] = { ...newPreview[index], [field]: value };
        setInstallmentsPreview(newPreview);
    };

    const handlePay = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (payForm.method === 'wallet' && !payForm.walletPhoneNumber) {
            toast.error('يرجى إدخال رقم المحفظة المحول منها');
            return;
        }

        try {
            const nextStatus = payForm.method === 'cash' ? 'pending_treasury' : 'pending_director';
            await updateStudent(student.id, { 
                pendingPaymentAmount: payForm.amount,
                pendingPaymentType: payForm.type,
                pendingPaymentMethod: payForm.method,
                pendingWalletPhoneNumber: payForm.method === 'wallet' ? payForm.walletPhoneNumber : undefined,
                pendingPaymentNotes: payForm.notes,
                pendingInstallmentPlanId: payingInstallment?.planId,
                pendingInstallmentId: payingInstallment?.instId,
                paymentRequestStatus: nextStatus
            });
            if (nextStatus === 'pending_treasury') {
                toast.success('تم إرسال طلب التحصيل إلى الخزينة للتأكيد');
            } else {
                toast.success('تم إرسال طلب التحصيل إلى مدير المدرسة للاعتماد');
            }
            setPayDialogOpen(false);
            setPayingInstallment(null);
            setPayForm({ amount: 0, type: 'tuition', method: 'cash', notes: '', walletPhoneNumber: '' });
        } catch (error) {
            toast.error('حدث خطأ أثناء إرسال الطلب');
        }
    };

    const handleCreatePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate total amounts match
        const sum = installmentsPreview.reduce((acc, curr) => acc + Number(curr.amount), 0);
        if (sum !== instForm.totalAmount) {
            toast.error(`مجموع الأقساط (${formatCurrency(sum)}) لا يتطابق مع إجمالي المبلغ (${formatCurrency(instForm.totalAmount)})`);
            return;
        }

        const installments = installmentsPreview.map((preview) => ({
            dueDate: preview.dueDate,
            amount: Number(preview.amount),
            status: (preview.status as any) || 'pending',
            paidAmount: preview.paidAmount || 0,
        }));

        if (editingPlanId) {
            toast.info('تعديل الخطة سيتم حفظه في قاعدة البيانات قريباً');
        } else {
            const success = await saveInstallmentPlan(student.id, instForm.totalAmount, student.academicYear, installments);
            if (success) {
                toast.success('تم إنشاء وحفظ خطة الأقساط في قاعدة البيانات بنجاح');
            } else {
                toast.error('حدث خطأ أثناء حفظ الخطة');
            }
        }
        setInstDialogOpen(false);
    };

    const handlePayInstallment = (planId: string, installmentId: string, amount: number) => {
        setPayingInstallment({ planId, instId: installmentId, maxAmount: amount });
        setPayForm({ amount, type: 'tuition', method: 'cash', notes: '', walletPhoneNumber: '' });
        setPayDialogOpen(true);
    };

    const isOverdue = student
        ? Number(student.totalFees) - Number(student.paidAmount) > 0
        : false;
    const booksReceived = studentPayments.some(p => p.type === 'books');
    const uniformReceived = studentPayments.some(p => p.type === 'uniform');
    const booksRequired = student ? Number(student.booksFees) > 0 : false;
    const uniformRequired = student ? Number(student.uniformFees) > 0 : false;
    const isReadOnly = student ? ['graduated', 'transferred', 'inactive'].includes(student.status) : false;
    const readOnlyLabel: Record<string, string> = { graduated: 'متخرج', transferred: 'منقول', inactive: 'غير نشط' };

    return (
        <div className="space-y-6">
            <Link to="/students" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowRight className="size-4" />
                العودة لقائمة الطلاب
            </Link>

            {/* Status Bar */}
            {student && (
                <div className="flex flex-wrap gap-2">
                    {isReadOnly && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border bg-slate-100 text-slate-600 border-slate-300">
                            🔒 عرض فقط — {readOnlyLabel[student.status] ?? student.status}
                        </span>
                    )}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${isOverdue ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        <span className={`size-2 rounded-full ${isOverdue ? 'bg-red-500' : 'bg-emerald-500'}`} />
                        {isOverdue ? `متأخر — متبقي ${formatCurrency(Number(student.totalFees) - Number(student.paidAmount))}` : 'منتظم في السداد'}
                    </span>
                    {booksRequired && (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${booksReceived ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            📚 الكتب: {booksReceived ? 'مُسدَّدة ✓' : 'لم تُسدَّد'}
                        </span>
                    )}
                    {uniformRequired && (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${uniformReceived ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            👔 الزي: {uniformReceived ? 'مُسدَّد ✓' : 'لم يُسدَّد'}
                        </span>
                    )}
                    {student.arrearsFees > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border bg-orange-50 text-orange-700 border-orange-200">
                            ⚠️ مديونية سابقة: {formatCurrency(student.arrearsFees)}
                        </span>
                    )}
                </div>
            )}

            {/* Student Header */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-lg border bg-card p-6">
                    <div className="flex items-start gap-4">
                        {isReadOnly ? (
                            <div className="size-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary overflow-hidden">
                                {student.photoUrl ? (
                                    <img src={student.photoUrl} alt={student.name} className="size-full object-cover" />
                                ) : (
                                    <User className="size-8" />
                                )}
                            </div>
                        ) : (
                            <label className="size-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary cursor-pointer hover:bg-primary/20 transition-colors overflow-hidden relative group" title="انقر لتغيير الصورة">
                                {student.photoUrl ? (
                                    <img src={student.photoUrl} alt={student.name} className="size-full object-cover" />
                                ) : (
                                    <User className="size-8" />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs">
                                    {uploadingPhoto ? '...' : '📷'}
                                </div>
                                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                            </label>
                        )}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-xl font-bold font-[Noto_Kufi_Arabic]">{student.name}</h2>
                                {student.badge && (
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white"
                                        style={{ backgroundColor: student.badge.color }}
                                        title={`خصم ${student.badge.discountPercentage}%`}
                                    >
                                        {student.badge.icon && <span>{student.badge.icon}</span>}
                                        {student.badge.name}
                                    </span>
                                )}
                                {!isReadOnly && (
                                    <button
                                        onClick={() => setBadgeDialogOpen(true)}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                                    >
                                        <Tag className="size-3" />
                                        {student.badge ? 'تغيير الشارة' : 'تعيين شارة'}
                                    </button>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                {stageLabels[student.stage]} — {student.grade} / {student.className}
                                {!isReadOnly && (
                                    <button
                                        className="mr-1 text-muted-foreground hover:text-primary opacity-60 hover:opacity-100 text-xs"
                                        onClick={() => { setClassForm({ grade: student.grade, className: student.className || '' }); setClassDialogOpen(true); }}
                                        title="نقل لفصل آخر"
                                    >✏️</button>
                                )}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground"><BookOpen className="size-4" /> الرقم القومي: <span className="tabular-nums font-medium text-foreground">{student.nationalId}</span></div>
                                <div className="flex items-center gap-2 text-muted-foreground"><Phone className="size-4" /> ولي الأمر: <span className="font-medium text-foreground">{student.guardianName}</span></div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Phone className="size-4" /> الهاتف:{' '}
                                    {editingPhone ? (
                                        <span className="flex items-center gap-1">
                                            <Input
                                                autoFocus
                                                dir="ltr"
                                                className="h-7 w-36 tabular-nums text-sm"
                                                value={phoneValue}
                                                onChange={e => setPhoneValue(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') handleSavePhone(); if (e.key === 'Escape') setEditingPhone(false); }}
                                            />
                                            <Button size="icon" className="size-7" onClick={handleSavePhone} disabled={savingField || !phoneValue.trim()}>✓</Button>
                                            <Button size="icon" variant="ghost" className="size-7" onClick={() => { setPhoneValue(''); setEditingPhone(false); }}>✕</Button>
                                        </span>
                                    ) : (
                                        <span className="tabular-nums font-medium text-foreground" dir="ltr">
                                            {student.guardianPhone}
                                            {!isReadOnly && (
                                                <button
                                                    className="mr-1 text-muted-foreground hover:text-primary opacity-60 hover:opacity-100"
                                                    onClick={() => { setPhoneValue(student.guardianPhone); setEditingPhone(true); }}
                                                    title="تعديل الرقم"
                                                >✏️</button>
                                            )}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="size-4" /> العنوان: <span className="font-medium text-foreground">{student.address}</span></div>
                                <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="size-4" /> تاريخ التسجيل: <span className="font-medium text-foreground">{formatDateShort(student.enrollmentDate)}</span></div>
                                {busSub && (
                                    <div className="flex items-center gap-2 text-muted-foreground"><Bus className="size-4" /> الباص: <span className="font-medium text-foreground">{busSub.routeName}</span></div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Arrears Alert Banner */}
                {student.arrearsFees > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="size-5 text-amber-600 shrink-0" />
                      <p className="text-sm font-medium text-amber-800">
                        يوجد متأخرات من سنوات سابقة:{' '}
                        <span className="font-bold tabular-nums">{formatCurrency(student.arrearsFees)}</span>
                      </p>
                    </div>
                    {!isReadOnly && <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-300 text-amber-800 hover:bg-amber-100 shrink-0"
                      onClick={() => {
                        setPayForm(f => ({ ...f, type: 'arrears' as PaymentType, amount: student.arrearsFees }));
                        setPayDialogOpen(true);
                      }}
                    >
                      تسجيل دفعة للمتأخرات
                    </Button>}
                  </div>
                )}

                {/* Financial Summary */}
                <div className="rounded-lg border bg-card p-6 space-y-4">
                    <h3 className="font-bold font-[Noto_Kufi_Arabic]">الملخص المالي</h3>
                    <div className="space-y-3">
                        <div className="space-y-1.5 mb-3 bg-muted/30 p-3 rounded-lg border">
                            <p className="text-xs font-bold text-muted-foreground mb-2">تفاصيل الرسوم المستحقة:</p>
                            {student.tuitionFees > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">مصروفات دراسية</span><span className="font-medium tabular-nums">{formatCurrency(student.tuitionFees)}</span></div>}
                            {student.booksFees > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">كتب دراسية</span><span className="font-medium tabular-nums">{formatCurrency(student.booksFees)}</span></div>}
                            {student.uniformFees > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">زي مدرسي</span><span className="font-medium tabular-nums">{formatCurrency(student.uniformFees)}</span></div>}
                            {student.busFees > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">اشتراك باص</span><span className="font-medium tabular-nums">{formatCurrency(student.busFees)}</span></div>}
                            {student.otherFees > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">رسوم أخرى</span><span className="font-medium tabular-nums">{formatCurrency(student.otherFees)}</span></div>}
                        </div>
                        {student.discountAmount > 0 && (
                            <div className="flex justify-between text-sm text-orange-600">
                                <span>الخصم المطبق ({Number(student.discountPercentage)}%)</span>
                                <span className="font-bold tabular-nums">−{formatCurrency(student.discountAmount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">إجمالي الرسوم المطلوبة</span><span className="font-bold tabular-nums">{formatCurrency(student.totalFees)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">المدفوع (السنة الحالية)</span><span className="font-bold text-emerald-600 tabular-nums">{formatCurrency(totalPaidFromPayments)}</span></div>
                        <div className="flex justify-between text-sm border-t pt-2 mt-2"><span className="text-muted-foreground font-bold">إجمالي الرصيد المتبقي (غير مسدد)</span><span className="font-bold text-red-600 tabular-nums">{formatCurrency(totalDebt)}</span></div>
                        <div>
                            <div className="flex justify-between text-xs mb-1"><span>{paidPct}%</span></div>
                            <div className="h-3 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${paidPct}%` }} />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
                            {!isReadOnly && <DialogTrigger asChild>
                                <Button className="flex-1" size="sm"><CreditCard className="size-4 ml-1" />تسجيل دفعة</Button>
                            </DialogTrigger>}
                            <DialogContent>
                                <DialogHeader><DialogTitle className="font-[Noto_Kufi_Arabic]">تسجيل دفعة جديدة</DialogTitle></DialogHeader>
                                <form onSubmit={handlePay} className="space-y-4">
                                    {payingInstallment && (
                                        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded text-sm mb-3 font-medium">
                                            أنت تقوم بتسديد قسط محدد (بإمكانك تسديد جزء من القسط)
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>المبلغ المطلوب تحصيله</Label>
                                            <Input type="number" required min={1} max={payingInstallment ? payingInstallment.maxAmount : totalDebt} value={payForm.amount || ''} onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>النوع</Label>
                                            <Select value={payForm.type} onValueChange={(v) => setPayForm({ ...payForm, type: v as PaymentType })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(paymentTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>طريقة الدفع</Label>
                                        <Select value={payForm.method} onValueChange={(v) => setPayForm({ ...payForm, method: v as PaymentMethod })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(paymentMethodLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {payForm.method === 'wallet' && (
                                        <div className="space-y-2 border p-3 rounded-lg bg-slate-50">
                                            <Label className="text-primary font-bold">رقم المحفظة (الرقم المحول منه)</Label>
                                            <Input 
                                                required 
                                                type="tel" 
                                                dir="ltr"
                                                placeholder="مثال: 01012345678" 
                                                value={payForm.walletPhoneNumber} 
                                                onChange={(e) => setPayForm({ ...payForm, walletPhoneNumber: e.target.value })} 
                                                className="font-mono text-right"
                                            />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label>ملاحظات (اختياري)</Label>
                                        <Input value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} />
                                    </div>
                                    <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setPayDialogOpen(false)}>إلغاء</Button><Button type="submit">إرسال الطلب</Button></div>
                                </form>
                            </DialogContent>
                        </Dialog>
                        <Dialog open={instDialogOpen} onOpenChange={setInstDialogOpen}>
                            {!isReadOnly && <DialogTrigger asChild>
                                <Button variant="outline" className="flex-1" size="sm" disabled={studentInstallments.length > 0}>
                                    {studentInstallments.length > 0 ? 'يوجد خطة أقساط (للتعديل من الأسفل)' : 'خطة أقساط'}
                                </Button>
                            </DialogTrigger>}
                            <DialogContent>
                                <DialogHeader><DialogTitle className="font-[Noto_Kufi_Arabic]">{editingPlanId ? 'تعديل خطة الأقساط' : 'إنشاء خطة أقساط'}</DialogTitle></DialogHeader>
                                <form onSubmit={handleCreatePlan} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>إجمالي المبلغ</Label>
                                            <Input 
                                                type="number" 
                                                required 
                                                min={1} 
                                                max={totalDebt}
                                                value={instForm.totalAmount || ''} 
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    setInstForm({ ...instForm, totalAmount: val });
                                                    generateInstallmentsPreview(val, instForm.numberOfInstallments);
                                                }} 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>عدد الأقساط</Label>
                                            <Input 
                                                type="number" 
                                                required 
                                                min={2} 
                                                max={12} 
                                                value={instForm.numberOfInstallments} 
                                                onChange={(e) => {
                                                    const count = Number(e.target.value);
                                                    setInstForm({ ...instForm, numberOfInstallments: count });
                                                    generateInstallmentsPreview(instForm.totalAmount, count);
                                                }} 
                                            />
                                        </div>
                                    </div>

                                    {installmentsPreview.length > 0 && (
                                        <div className="space-y-3 mt-4 border rounded-lg p-4 bg-slate-50/50">
                                            <div className="flex justify-between items-center mb-2">
                                                <Label className="font-bold text-primary">تفاصيل الأقساط</Label>
                                                <Badge variant="outline" className={installmentsPreview.reduce((s, p) => s + Number(p.amount), 0) === instForm.totalAmount ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}>
                                                    المجموع: {formatCurrency(installmentsPreview.reduce((s, p) => s + Number(p.amount), 0))}
                                                </Badge>
                                            </div>
                                            <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2">
                                                {installmentsPreview.map((preview, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded border shadow-sm">
                                                        <div className="w-8 text-center text-sm font-bold text-muted-foreground bg-slate-100 rounded-md py-1">{idx + 1}</div>
                                                        <div className="flex-1 space-y-1">
                                                            <Label className="text-xs text-muted-foreground">تاريخ الاستحقاق</Label>
                                                            <Input 
                                                                type="date" 
                                                                className="h-8 text-sm" 
                                                                value={preview.dueDate} 
                                                                onChange={(e) => handleUpdatePreview(idx, 'dueDate', e.target.value)}
                                                                required
                                                            />
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <Label className="text-xs text-muted-foreground">قيمة القسط</Label>
                                                            <Input 
                                                                type="number" 
                                                                className="h-8 text-sm" 
                                                                value={preview.amount || ''} 
                                                                onChange={(e) => handleUpdatePreview(idx, 'amount', Number(e.target.value))}
                                                                required
                                                                min={1}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-3 pt-2">
                                        <Button type="button" variant="outline" onClick={() => setInstDialogOpen(false)}>إلغاء</Button>
                                        <Button type="submit">{editingPlanId ? 'حفظ التعديلات' : 'إنشاء الخطة'}</Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            {/* Rejected Request Alert */}
            {student.paymentRequestStatus === 'rejected' && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-start gap-3">
                    <AlertCircle className="size-5 mt-0.5 text-red-600 shrink-0" />
                    <div>
                        <p className="font-bold">طلب تحصيل مرفوض أو معترض عليه</p>
                        <p className="text-sm mt-1">لقد تم إرجاع طلب التحصيل الأخير (المبلغ: {formatCurrency(student.pendingPaymentAmount || 0)}). يرجى مراجعة البيانات وتعديلها عبر زر "تسجيل دفعة" لإعادة إرسال الطلب.</p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="payments" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="contacts">سجل التواصل {contactLogs.length > 0 && <span className="mr-1 bg-primary/10 text-primary text-[10px] px-1.5 rounded-full">{contactLogs.length}</span>}</TabsTrigger>
                    <TabsTrigger value="payments">سجل المدفوعات</TabsTrigger>
                    <TabsTrigger value="installments">خطط الأقساط</TabsTrigger>
                    <TabsTrigger value="history">السجل المالي للسنوات</TabsTrigger>
                    <TabsTrigger value="statement">كشف الحساب</TabsTrigger>
                    <TabsTrigger value="deliveries">ما تم استلامه</TabsTrigger>
                </TabsList>

                <TabsContent value="contacts" className="space-y-4">
                    {/* Add new contact */}
                    <div className="rounded-lg border bg-card p-5">
                        <h4 className="font-bold mb-4 font-[Noto_Kufi_Arabic]">تسجيل محاولة تواصل جديدة</h4>
                        <form onSubmit={handleSaveContact} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>التاريخ</Label>
                                    <Input type="date" value={contactForm.date} onChange={e => setContactForm(f => ({ ...f, date: e.target.value }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>النتيجة</Label>
                                    <Select value={contactForm.outcome} onValueChange={v => setContactForm(f => ({ ...f, outcome: v as ContactOutcome }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="contacted">تم التواصل</SelectItem>
                                            <SelectItem value="no_answer">لم يرد</SelectItem>
                                            <SelectItem value="promised">وعد بالسداد</SelectItem>
                                            <SelectItem value="paid_after">سدد بعد التواصل</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>ملاحظات</Label>
                                <Input
                                    required
                                    placeholder="مثال: وعد بالحضور الأسبوع القادم..."
                                    value={contactForm.notes}
                                    onChange={e => setContactForm(f => ({ ...f, notes: e.target.value }))}
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button type="submit" disabled={savingContact || !contactForm.notes.trim()} size="sm">
                                    {savingContact ? 'جارٍ الحفظ...' : 'حفظ التواصل'}
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* Contact log list */}
                    {contactLogs.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            <Phone className="size-10 mx-auto mb-3 opacity-30" />
                            <p>لا يوجد سجل تواصل بعد</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {contactLogs.map(log => {
                                const outcomeConfig: Record<string, { label: string; color: string }> = {
                                    contacted:  { label: 'تم التواصل',        color: 'bg-emerald-100 text-emerald-700' },
                                    no_answer:  { label: 'لم يرد',            color: 'bg-gray-100 text-gray-600' },
                                    promised:   { label: 'وعد بالسداد',       color: 'bg-blue-100 text-blue-700' },
                                    paid_after: { label: 'سدد بعد التواصل',   color: 'bg-violet-100 text-violet-700' },
                                };
                                const cfg = outcomeConfig[log.outcome] ?? { label: log.outcome, color: 'bg-gray-100 text-gray-600' };
                                return (
                                    <div key={log.id} className="rounded-lg border bg-card p-4 flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm">{log.notes}</p>
                                            <p className="text-xs text-muted-foreground mt-1">{formatDateShort(log.date)} · {log.createdBy}</p>
                                        </div>
                                        <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="payments">
                    <div className="rounded-lg border bg-card overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40">
                                    <th className="text-right p-3 font-semibold">رقم الإيصال</th>
                                    <th className="text-right p-3 font-semibold">المبلغ</th>
                                    <th className="text-right p-3 font-semibold">النوع</th>
                                    <th className="text-right p-3 font-semibold hidden sm:table-cell">الطريقة</th>
                                    <th className="text-right p-3 font-semibold hidden md:table-cell">التاريخ</th>
                                    <th className="text-right p-3 font-semibold w-14">طباعة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {studentPayments.map((p) => (
                                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                                        <td className="p-3 tabular-nums font-mono text-xs">{p.receiptNumber}</td>
                                        <td className="p-3 font-bold tabular-nums text-primary">{formatCurrency(p.amount)}</td>
                                        <td className="p-3">{paymentTypeLabels[p.type]}</td>
                                        <td className="p-3 hidden sm:table-cell">{paymentMethodLabels[p.method]}</td>
                                        <td className="p-3 hidden md:table-cell text-muted-foreground">{formatDateShort(p.date)}</td>
                                        <td className="p-3">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-7 text-muted-foreground hover:text-primary"
                                                onClick={() => printPaymentReceipt(p, { grade: `${student.grade} / ${student.className}`, guardianName: student.guardianName })}
                                                aria-label="طباعة الإيصال"
                                            >
                                                <Printer className="size-3.5" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {studentPayments.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground"><CreditCard className="size-10 mx-auto mb-3 opacity-30" /><p>لا يوجد مدفوعات مسجلة</p></div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="installments" className="space-y-4">
                    {studentInstallments.length === 0 ? (
                        <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
                            <Clock className="size-10 mx-auto mb-3 opacity-30" />
                            <p>لا يوجد خطط أقساط — يمكنك إنشاء خطة جديدة من الأعلى</p>
                        </div>
                    ) : (
                        studentInstallments.map((plan) => (
                            <div key={plan.id} className="rounded-lg border bg-card p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold font-[Noto_Kufi_Arabic]">خطة أقساط — إجمالي المستحق: {formatCurrency(plan.totalAmount)}</h4>
                                        <p className="text-xs text-muted-foreground">{plan.installments.length} أقساط • السنة الدراسية: {plan.academicYear}</p>
                                    </div>
                                    {!isReadOnly && <Button size="sm" variant="outline" onClick={() => {
                                        setEditingPlanId(plan.id);
                                        setInstDialogOpen(true);
                                    }}>
                                        {user?.role === 'school_director' || user?.role === 'system_admin' ? 'تعديل التواريخ / الخطة' : 'طلب تعديل تواريخ'}
                                    </Button>}
                                </div>
                                <div className="space-y-2">
                                    {plan.installments.map((inst) => {
                                        const isOverdue = inst.status === 'pending' && new Date(inst.dueDate) < new Date();
                                        const currentStatus = isOverdue ? 'overdue' : inst.status;
                                        const config = instStatusConfig[currentStatus as keyof typeof instStatusConfig];
                                        const Icon = config.icon;
                                        const remainingAmount = inst.amount - (inst.paidAmount || 0);
                                        return (
                                            <div key={inst.id} className={`flex items-center justify-between p-3 rounded-lg ${config.color}`}>
                                                <div className="flex items-center gap-3">
                                                    <Icon className="size-5" />
                                                    <div>
                                                        <p className="text-sm font-medium">{config.label}</p>
                                                        <p className="text-xs opacity-70">استحقاق: {formatDateShort(inst.dueDate)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col text-left ml-4">
                                                        <span className="font-bold tabular-nums">الإجمالي: {formatCurrency(inst.amount)}</span>
                                                        {(inst.paidAmount || 0) > 0 && <span className="text-emerald-700 text-xs font-bold mt-1">مسدد: {formatCurrency(inst.paidAmount || 0)}</span>}
                                                        {remainingAmount > 0 && remainingAmount < inst.amount && <span className="text-amber-700 text-xs font-bold mt-0.5">متبقي: {formatCurrency(remainingAmount)}</span>}
                                                    </div>
                                                    {!isReadOnly && (currentStatus === 'pending' || currentStatus === 'overdue') && remainingAmount > 0 && (
                                                        <Button size="sm" variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50 h-8" onClick={() => handlePayInstallment(plan.id, inst.id, remainingAmount)}>تسديد</Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </TabsContent>

                <TabsContent value="history">
                    <div className="rounded-lg border bg-card overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40">
                                    <th className="text-right p-3 font-semibold">السنة الدراسية</th>
                                    <th className="text-right p-3 font-semibold">المرحلة / الصف</th>
                                    <th className="text-right p-3 font-semibold">إجمالي الرسوم</th>
                                    <th className="text-right p-3 font-semibold">المدفوع</th>
                                    <th className="text-right p-3 font-semibold">المتبقي</th>
                                    <th className="text-right p-3 font-semibold">الحالة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {student.yearlyFinance?.map((yf) => {
                                    const yfRemaining = yf.totalFees - yf.paidAmount;
                                    return (
                                        <tr key={yf.id} className="border-b last:border-0 hover:bg-muted/20">
                                            <td className="p-3 font-medium tabular-nums">{yf.academicYear}</td>
                                            <td className="p-3">{stageLabels[yf.stage]} - {yf.grade}</td>
                                            <td className="p-3 tabular-nums font-bold">{formatCurrency(yf.totalFees)}</td>
                                            <td className="p-3 tabular-nums text-emerald-600">{formatCurrency(yf.paidAmount)}</td>
                                            <td className={`p-3 tabular-nums font-bold ${yfRemaining > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                                {formatCurrency(yfRemaining)}
                                            </td>
                                            <td className="p-3">
                                                {yfRemaining <= 0 ? (
                                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">مسدد بالكامل</Badge>
                                                ) : (
                                                    <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-none">متأخرات</Badge>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {(!student.yearlyFinance || student.yearlyFinance.length === 0) && (
                            <div className="text-center py-12 text-muted-foreground">
                                <Clock className="size-10 mx-auto mb-3 opacity-30" />
                                <p>لا يوجد سجل مالي سابق متاح لهذا الطالب</p>
                            </div>
                        )}
                    </div>
                    {student.yearlyFinance && student.yearlyFinance.some(yf => (yf.totalFees - yf.paidAmount) > 0 && yf.academicYear !== student.academicYear) && (
                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                            <AlertCircle className="size-5 text-amber-600 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-amber-800">تنبيه المديونية السابقة</p>
                                <p className="text-xs text-amber-700 mt-1">يوجد مديونية مستحقة من سنوات سابقة. سيتم توجيه أي مدفوعات جديدة تلقائياً لتغطية الديون القديمة أولاً.</p>
                            </div>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="statement" className="space-y-4">
                    <StudentStatement
                        student={student}
                        payments={studentPayments}
                        installmentPlan={studentInstallments[0] ?? null}
                        inventoryTx={studentInventoryTx}
                    />
                </TabsContent>

                <TabsContent value="deliveries">
                    <div className="space-y-3">
                        {studentDeliveries.length === 0 ? (
                            <p className="text-muted-foreground text-sm py-8 text-center">لا توجد طلبات تسليم لهذا الطالب</p>
                        ) : (
                            studentDeliveries.map(order => (
                                <div key={order.id} className="border rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold text-sm">{order.code} — ترم {order.term}</p>
                                        <Badge className={
                                            order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                            order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                                            order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                            'bg-gray-100 text-gray-600'
                                        }>
                                            {order.status === 'delivered' ? 'مُسلَّم' :
                                             order.status === 'confirmed' ? 'مؤكد' :
                                             order.status === 'pending' ? 'معلق' : 'ملغي'}
                                        </Badge>
                                    </div>
                                    <div className="space-y-1">
                                        {order.items.map(item => (
                                            <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                                                <span className={item.returnedAt ? 'line-through' : ''}>
                                                    {item.itemName} × {item.quantity}
                                                    {item.returnedAt && ' (مُرجَع)'}
                                                </span>
                                                {item.deliveredAt && (
                                                    <span>{new Date(item.deliveredAt).toLocaleDateString('ar-EG')}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{order.chargeType === 'external' ? '💰 خارجي' : '📋 ضمن المصاريف'}</p>
                                </div>
                            ))
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Class Change Dialog */}
            {classDialogOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setClassDialogOpen(false)}>
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-lg mb-4 font-[Noto_Kufi_Arabic]">نقل لفصل آخر</h3>
                        <form onSubmit={handleSaveClass} className="space-y-4">
                            <div className="space-y-2">
                                <Label>الصف</Label>
                                <Input
                                    required
                                    value={classForm.grade}
                                    onChange={e => setClassForm(f => ({ ...f, grade: e.target.value }))}
                                    placeholder="مثال: الثاني"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>الفصل</Label>
                                <Input
                                    required
                                    value={classForm.className}
                                    onChange={e => setClassForm(f => ({ ...f, className: e.target.value }))}
                                    placeholder="مثال: 2/ب"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={() => setClassDialogOpen(false)}>إلغاء</Button>
                                <Button type="submit" disabled={savingField}>حفظ النقل</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Badge Assignment Dialog */}
            {badgeDialogOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setBadgeDialogOpen(false)}>
                    <div className="bg-card rounded-xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold font-[Noto_Kufi_Arabic] text-lg">تعيين شارة للطالب</h3>
                            <button onClick={() => setBadgeDialogOpen(false)} className="p-1 rounded hover:bg-muted">
                                <X className="size-4" />
                            </button>
                        </div>

                        <div className="space-y-2 max-h-72 overflow-y-auto">
                            {/* No badge option */}
                            <button
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-sm text-right transition-colors hover:bg-muted/50 ${!student.badgeId ? 'border-primary bg-primary/5' : 'border-border'}`}
                                onClick={() => handleAssignBadge(null)}
                                disabled={assigningBadge}
                            >
                                <span className="inline-flex items-center justify-center size-8 rounded-full bg-muted">
                                    <X className="size-4 text-muted-foreground" />
                                </span>
                                <span className="font-medium">بدون شارة</span>
                                {!student.badgeId && <span className="mr-auto text-xs text-primary">✓ محدد</span>}
                            </button>

                            {badges.map(badge => (
                                <button
                                    key={badge.id}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-sm text-right transition-colors hover:bg-muted/50 ${student.badgeId === badge.id ? 'border-primary bg-primary/5' : 'border-border'}`}
                                    onClick={() => handleAssignBadge(badge.id)}
                                    disabled={assigningBadge}
                                >
                                    <span
                                        className="inline-flex items-center justify-center size-8 rounded-full text-white text-base"
                                        style={{ backgroundColor: badge.color }}
                                    >
                                        {badge.icon || <Tag className="size-4" />}
                                    </span>
                                    <div className="flex-1 text-right">
                                        <p className="font-medium">{badge.name}</p>
                                        {badge.description && <p className="text-xs text-muted-foreground">{badge.description}</p>}
                                    </div>
                                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                        {badge.discountPercentage}% خصم
                                    </span>
                                    {student.badgeId === badge.id && <span className="text-xs text-primary">✓</span>}
                                </button>
                            ))}

                            {badges.length === 0 && (
                                <p className="text-center text-sm text-muted-foreground py-4">
                                    لا توجد شارات. أنشئ شارات من إعدادات الرسوم أولاً.
                                </p>
                            )}
                        </div>

                        {assigningBadge && (
                            <p className="text-center text-sm text-muted-foreground mt-3">جاري الحفظ...</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
