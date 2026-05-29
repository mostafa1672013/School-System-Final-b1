import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, XCircle, Edit3, UserCheck, ShieldAlert, FileText, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useStudentsStore } from '@/stores/studentsStore';
import { useAuthStore } from '@/stores/authStore';
import { useAdmissionStore } from '@/stores/admissionStore';
import { formatCurrency, stageLabels, trackLabels } from '@/lib/utils';
import type { Student } from '@/types';

export default function DiscountApprovals() {
    const { students, fetchStudents, updateStudent } = useStudentsStore();
    const { user } = useAuthStore();
    const { approveAdmission } = useAdmissionStore();
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isModifyOpen, setIsModifyOpen] = useState(false);
    const [modifyForm, setModifyForm] = useState({ discountAmount: 0, notes: '' });

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    const pendingStudents = useMemo(() => {
        return students.filter(s => s.status === 'pending_approval');
    }, [students]);

    const pastApprovals = useMemo(() => {
        // Students who are admitted and have a discount amount recorded
        return students.filter(s => s.status === 'admitted' && s.discountAmount > 0)
            .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    }, [students]);

    const handleApprove = async (id: string) => {
        try {
            await approveAdmission(id);
            toast.success('تم اعتماد طلب القبول والخصم بنجاح');
            fetchStudents();
        } catch (error) {
            toast.error('حدث خطأ أثناء الاعتماد');
        }
    };

    const handleReject = async (id: string) => {
        try {
            await updateStudent(id, { status: 'fee_setup' });
            toast.info('تم رفض الطلب وإعادته للمحاسب للمراجعة');
            fetchStudents();
        } catch (error) {
            toast.error('حدث خطأ أثناء الرفض');
        }
    };

    const handleModify = async () => {
        if (!selectedStudent) return;
        try {
            // Recalculate total fees based on new discount
            const baseFees = selectedStudent.tuitionFees + selectedStudent.booksFees + selectedStudent.uniformFees + (selectedStudent.busFees || 0) + (selectedStudent.otherFees || 0);
            const additionalTotal = (selectedStudent.additionalFees || []).reduce((sum: number, f: any) => sum + (f.selected ? f.amount : 0), 0);
            const newTotal = baseFees + additionalTotal - modifyForm.discountAmount;

            await updateStudent(selectedStudent.id, { 
                discountAmount: modifyForm.discountAmount,
                totalFees: newTotal,
                discountApprovedBy: `تعديل بواسطة: ${user?.name}`
            });
            
            toast.success('تم تعديل قيمة الخصم بنجاح');
            setIsModifyOpen(false);
            setSelectedStudent(null);
            fetchStudents();
        } catch (error) {
            toast.error('حدث خطأ أثناء التعديل');
        }
    };

    // Permission check
    const canApprove = user?.role === 'school_director' || user?.role === 'head_accountant' || user?.role === 'system_admin';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-[Noto_Kufi_Arabic]">اعتمادات الخصومات والقبول</h1>
                    <p className="text-muted-foreground">مراجعة طلبات الخصم والاعتماد النهائي للطلاب الجدد</p>
                </div>
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 py-1 px-3">
                    {pendingStudents.length} طلبات قيد الانتظار
                </Badge>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-bold font-[Noto_Kufi_Arabic] flex items-center gap-2">
                        <UserCheck className="size-5 text-primary" /> قائمة الطلبات المعلقة
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>اسم الطالب</TableHead>
                                    <TableHead>المرحلة / الصف</TableHead>
                                    <TableHead>إجمالي الرسوم</TableHead>
                                    <TableHead>الخصم المطلوب</TableHead>
                                    <TableHead>المبلغ النهائي</TableHead>
                                    <TableHead>بواسطة</TableHead>
                                    <TableHead className="text-left">الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                    {pendingStudents.map((student) => {
                                        const originalTotal = student.totalFees + student.discountAmount;
                                        const discountPct = originalTotal > 0 ? (student.discountAmount / originalTotal) * 100 : 0;
                                        const isOverLimit = discountPct > (user?.discountLimitPercent || 0);

                                        return (
                                            <TableRow key={student.id}>
                                                <TableCell className="font-bold">{student.name}</TableCell>
                                                <TableCell>
                                                    <div className="text-xs">
                                                        {stageLabels[student.stage]} - {student.grade}
                                                        <Badge variant="secondary" className="mr-2 text-[10px]">{trackLabels[student.track]}</Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs font-mono">{formatCurrency(originalTotal)}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-red-600 font-bold text-xs">{formatCurrency(student.discountAmount)}</span>
                                                        <span className="text-[10px] text-muted-foreground">({discountPct.toFixed(1)}%)</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-primary font-bold">{formatCurrency(student.totalFees)}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{student.discountApprovedBy || 'غير محدد'}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2 justify-end">
                                                        {canApprove ? (
                                                            <>
                                                                <Button 
                                                                    size="sm" 
                                                                    className="bg-emerald-600 hover:bg-emerald-700 h-8"
                                                                    disabled={isOverLimit}
                                                                    onClick={() => handleApprove(student.id)}
                                                                >
                                                                    <CheckCircle2 className="size-4 ml-1" /> {isOverLimit ? 'يتعدى صلاحيتك' : 'اعتماد'}
                                                                </Button>
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="outline" 
                                                                    className="h-8 border-amber-200 text-amber-700 hover:bg-amber-50"
                                                                    disabled={isOverLimit}
                                                                    onClick={() => {
                                                                        setSelectedStudent(student);
                                                                        setModifyForm({ discountAmount: student.discountAmount, notes: '' });
                                                                        setIsModifyOpen(true);
                                                                    }}
                                                                >
                                                                    <Edit3 className="size-4 ml-1" /> تعديل
                                                                </Button>
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="destructive" 
                                                                    className="h-8"
                                                                    onClick={() => handleReject(student.id)}
                                                                >
                                                                    <XCircle className="size-4 ml-1" /> رفض
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <Badge variant="outline" className="text-xs">قيد المراجعة</Badge>
                                                        )}
                                                    </div>
                                                    {isOverLimit && (
                                                        <p className="text-[10px] text-red-500 mt-1 text-left">خصم {discountPct.toFixed(1)}% يتخطى حدك ({user?.discountLimitPercent}%)</p>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                {pendingStudents.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-20">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <Info className="size-10 opacity-20" />
                                                <p>لا توجد طلبات اعتماد حالية</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isModifyOpen} onOpenChange={setIsModifyOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="font-[Noto_Kufi_Arabic]">تعديل قيمة الخصم</DialogTitle>
                        <DialogDescription>
                            يمكنك تعديل قيمة الخصم المعتمدة للطالب {selectedStudent?.name} قبل الاعتماد النهائي.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>قيمة الخصم الجديدة</Label>
                            <Input 
                                type="number" 
                                value={modifyForm.discountAmount} 
                                onChange={e => setModifyForm({ ...modifyForm, discountAmount: Number(e.target.value) })}
                            />
                        </div>
                        <div className="p-3 bg-primary/5 border rounded-lg text-xs space-y-1">
                            <div className="flex justify-between">
                                <span>إجمالي الرسوم (قبل الخصم):</span>
                                <span className="font-mono">{selectedStudent && formatCurrency(selectedStudent.totalFees + selectedStudent.discountAmount)}</span>
                            </div>
                            <div className="flex justify-between text-red-600 font-bold">
                                <span>الخصم الجديد:</span>
                                <span className="font-mono">{formatCurrency(modifyForm.discountAmount)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-1 font-bold text-sm text-primary">
                                <span>الصافي النهائي:</span>
                                <span className="font-mono">
                                    {selectedStudent && formatCurrency((selectedStudent.totalFees + selectedStudent.discountAmount) - modifyForm.discountAmount)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModifyOpen(false)}>إلغاء</Button>
                        <Button onClick={handleModify}>حفظ التعديل والاعتماد</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Past Approvals History */}
            <Card className="border-t-4 border-t-emerald-500">
                <CardHeader>
                    <CardTitle className="text-lg font-bold font-[Noto_Kufi_Arabic] flex items-center gap-2">
                        <FileText className="size-5 text-emerald-600" /> سجل الاعتمادات السابقة
                    </CardTitle>
                    <CardDescription>عرض الطلبات التي تم اعتمادها وقبولها في النظام مسبقاً</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead>اسم الطالب</TableHead>
                                    <TableHead>المرحلة / الصف</TableHead>
                                    <TableHead>قيمة الخصم</TableHead>
                                    <TableHead>المبلغ النهائي</TableHead>
                                    <TableHead>بواسطة</TableHead>
                                    <TableHead>تاريخ الاعتماد</TableHead>
                                    <TableHead>الحالة</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pastApprovals.map((student) => (
                                    <TableRow key={student.id} className="opacity-80">
                                        <TableCell className="font-medium">{student.name}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {stageLabels[student.stage]} - {student.grade}
                                        </TableCell>
                                        <TableCell className="text-red-600 font-bold text-xs">{formatCurrency(student.discountAmount)}</TableCell>
                                        <TableCell className="font-bold">{formatCurrency(student.totalFees)}</TableCell>
                                        <TableCell className="text-xs">{student.discountApprovedBy || 'تلقائي'}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {student.updatedAt ? new Date(student.updatedAt).toLocaleDateString('ar-EG') : 'غير متوفر'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-100">
                                                <CheckCircle2 className="size-3 ml-1" /> معتمد
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {pastApprovals.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground italic">
                                            لا يوجد سجل اعتمادات سابقة
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
