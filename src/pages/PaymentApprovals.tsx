import { useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStudentsStore } from '@/stores/studentsStore';
import { usePaymentsStore } from '@/stores/paymentsStore';
import { formatCurrency, stageLabels, paymentMethodLabels, formatDateShort } from '@/lib/utils';
import { generateId } from '@/lib/utils';

export default function PaymentApprovals() {
    const { students, fetchStudents, addPaymentToStudent } = useStudentsStore();
    const { addPayment, pendingPlanEdits, approvePlanEdit, rejectPlanEdit } = usePaymentsStore();

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    const pendingDirectorApprovals = useMemo(() => {
        return students.filter(s => s.paymentRequestStatus === 'pending_director' && s.pendingPaymentAmount && s.pendingPaymentAmount > 0);
    }, [students]);

    const handleDirectorApprove = async (student: any) => {
        try {
            const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;
            const date = new Date().toISOString().split('T')[0];
            const newPayment = {
                studentId: student.id,
                studentName: student.name,
                amount: student.pendingPaymentAmount,
                type: student.pendingPaymentType,
                method: student.pendingPaymentMethod || 'bank_transfer',
                date,
                receiptNumber,
                collectedBy: 'مدير المدرسة',
                notes: 'تم الاعتماد من قبل الإدارة',
                walletPhoneNumber: student.pendingWalletPhoneNumber || undefined,
            };
            
            await addPayment(newPayment);
            await addPaymentToStudent(student.id, student.pendingPaymentAmount);

            if (student.pendingInstallmentPlanId && student.pendingInstallmentId) {
                const { payInstallment } = usePaymentsStore.getState();
                payInstallment(student.pendingInstallmentPlanId, student.pendingInstallmentId, student.pendingPaymentAmount);
            }

            // Backend clears the pending request fields automatically in POST /api/payments

            await fetchStudents();
            toast.success('تم اعتماد التحويل وتسميعه في حساب الطالب بنجاح');
        } catch (error) {
            toast.error('حدث خطأ أثناء الاعتماد');
        }
    };

    const handleDirectorReject = async (studentId: string) => {
        try {
            await fetch(`/api/students/${studentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentRequestStatus: 'rejected' }),
            });
            await fetchStudents();
            toast.info('تم رفض التحويل وإعادته للمحاسب للتعديل');
        } catch (error) {
            toast.error('حدث خطأ أثناء الرفض');
        }
    };

    const handleApprovePlanEdit = (editId: string) => {
        approvePlanEdit(editId);
        toast.success('تم اعتماد تعديل خطة الأقساط بنجاح');
    };

    const handleRejectPlanEdit = (editId: string) => {
        rejectPlanEdit(editId);
        toast.info('تم رفض طلب التعديل وإلغاءه');
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold font-[Noto_Kufi_Arabic]">اعتمادات التحويلات المالية</h1>
            <p className="text-muted-foreground">مراجعة واعتماد التحويلات البنكية والدفع عبر المحافظ الإلكترونية.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingDirectorApprovals.map(s => (
                    <Card key={s.id} className="border-amber-200 bg-amber-50/10 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-1 h-full bg-amber-400"></div>
                        <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-lg">{s.name}</h3>
                                    <p className="text-sm text-muted-foreground">{stageLabels[s.stage]} - {s.grade}</p>
                                </div>
                                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                                    {paymentMethodLabels[s.pendingPaymentMethod || 'bank_transfer']}
                                </Badge>
                            </div>
                            
                            <div className="space-y-2 mb-5 bg-white p-3 rounded-md border border-slate-100">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">المبلغ:</span>
                                    <span className="font-bold text-amber-600 text-lg tabular-nums">{formatCurrency(s.pendingPaymentAmount || 0)}</span>
                                </div>
                                {s.pendingPaymentMethod === 'wallet' && s.pendingWalletPhoneNumber && (
                                    <div className="flex justify-between items-center text-sm border-t pt-2 mt-2">
                                        <span className="text-muted-foreground">رقم المحفظة:</span>
                                        <span className="font-mono text-primary font-bold" dir="ltr">{s.pendingWalletPhoneNumber}</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex gap-3">
                                <Button size="sm" variant="outline" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => handleDirectorReject(s.id)}>
                                    <X className="size-4 ml-1" /> رفض
                                </Button>
                                <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleDirectorApprove(s)}>
                                    <Check className="size-4 ml-1" /> اعتماد الرصيد
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {pendingDirectorApprovals.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 bg-slate-50 border border-dashed rounded-lg text-muted-foreground">
                        <ShieldCheck className="size-12 mb-3 opacity-20" />
                        <p>لا يوجد تحويلات بانتظار الاعتماد في الوقت الحالي</p>
                    </div>
                )}
            </div>

            {pendingPlanEdits.length > 0 && (
                <>
                    <h2 className="text-2xl font-bold font-[Noto_Kufi_Arabic] mt-10 pt-6 border-t border-slate-200">طلبات تعديل خطط الأقساط</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingPlanEdits.map(edit => (
                            <Card key={edit.id} className="border-blue-200 bg-blue-50/10 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-1 h-full bg-blue-400"></div>
                                <CardContent className="p-5">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-bold text-lg">{edit.studentName}</h3>
                                            <p className="text-sm text-muted-foreground">تعديل تواريخ/مبالغ الأقساط</p>
                                        </div>
                                        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                                            بواسطة: {edit.requestedBy}
                                        </Badge>
                                    </div>
                                    
                                    <div className="space-y-2 mb-5 bg-white p-3 rounded-md border border-slate-100">
                                        <div className="text-sm font-bold border-b pb-2 mb-2">الأقساط المقترحة:</div>
                                        {edit.newInstallments.map((inst, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm border-b last:border-0 pb-1 last:pb-0">
                                                <span className="text-muted-foreground">{formatDateShort(inst.dueDate)}</span>
                                                <span className="font-bold tabular-nums">{formatCurrency(inst.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="flex gap-3">
                                        <Button size="sm" variant="outline" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => {
                                            rejectPlanEdit(edit.id);
                                            toast.info('تم رفض طلب التعديل');
                                        }}>
                                            <X className="size-4 ml-1" /> رفض التعديل
                                        </Button>
                                        <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => {
                                            approvePlanEdit(edit.id);
                                            toast.success('تم اعتماد تعديل الخطة بنجاح');
                                        }}>
                                            <Check className="size-4 ml-1" /> اعتماد
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
