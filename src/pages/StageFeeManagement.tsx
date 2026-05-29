import { useState, useEffect } from 'react';
import { Settings, Plus, Save, Trash2, GraduationCap, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAdmissionStore } from '@/stores/admissionStore';
import { stageLabels, trackLabels, formatCurrency, gradeOptions, academicYears, currentAcademicYear } from '@/lib/utils';
import type { Stage, Track } from '@/types';

export default function StageFeeManagement() {
    const { stageFees, fetchStageFees, saveStageFee, deleteStageFee } = useAdmissionStore();
    const [form, setForm] = useState<Partial<StageFee>>({
        stage: 'kg' as Stage,
        grade: '',
        track: 'local' as Track,
        academicYear: currentAcademicYear,
        tuitionFees: 0,
        tuitionMandatory: true,
        booksFees: 0,
        booksMandatory: true,
        uniformFees: 0,
        uniformMandatory: true,
        applicationFees: 500,
        applicationMandatory: true,
        additionalFees: [],
    });

    useEffect(() => {
        fetchStageFees();
    }, [fetchStageFees]);

    useEffect(() => {
        // Reset grade when stage changes
        setForm(prev => ({ ...prev, grade: gradeOptions[prev.stage][0] }));
    }, [form.stage]);

    const handleSave = async () => {
        if (!form.grade) {
            toast.error('يرجى اختيار الصف');
            return;
        }
        try {
            await saveStageFee(form);
            toast.success('تم حفظ إعدادات الرسوم بنجاح');
            // Reset numerical fields but keep academic year, stage, track
            setForm(prev => ({
                ...prev,
                id: undefined,
                tuitionFees: 0,
                booksFees: 0,
                uniformFees: 0,
            } as any));
        } catch (error: any) {
            toast.error(error.message || 'حدث خطأ أثناء الحفظ');
        }
    };

    const handleNew = () => {
        setForm({
            stage: 'kg' as Stage,
            grade: gradeOptions['kg'][0],
            track: 'local' as Track,
            academicYear: currentAcademicYear,
            tuitionFees: 0,
            tuitionMandatory: true,
            booksFees: 0,
            booksMandatory: true,
            uniformFees: 0,
            uniformMandatory: true,
            applicationFees: 500,
            applicationMandatory: true,
            additionalFees: [],
        });
    };

    const addAdditionalFee = () => {
        setForm(prev => ({
            ...prev,
            additionalFees: [...(prev.additionalFees || []), { name: '', amount: 0, isMandatory: true }]
        }));
    };

    const removeAdditionalFee = (index: number) => {
        setForm(prev => ({
            ...prev,
            additionalFees: (prev.additionalFees || []).filter((_, i) => i !== index)
        }));
    };

    const updateAdditionalFee = (index: number, field: string, value: any) => {
        setForm(prev => {
            const fees = [...(prev.additionalFees || [])];
            fees[index] = { ...fees[index], [field]: value };
            return { ...prev, additionalFees: fees };
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold font-[Noto_Kufi_Arabic]">إعدادات رسوم المراحل</h1>
                <p className="text-muted-foreground">تحديد الرسوم الدراسية لكل مرحلة وصف دراسي لكل سنة أكاديمية</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div>
                            <CardTitle className="text-lg font-bold font-[Noto_Kufi_Arabic]">
                                {'id' in form ? 'تعديل الرسوم' : 'إضافة رسوم جديدة'}
                            </CardTitle>
                            <CardDescription>أدخل تفاصيل الرسوم للمرحلة المختارة</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleNew}>
                            <Plus className="size-4 ml-1" /> جديد
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>السنة الدراسية</Label>
                            <Select value={form.academicYear} onValueChange={v => setForm({...form, academicYear: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {academicYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>المرحلة</Label>
                            <Select value={form.stage} onValueChange={v => setForm({...form, stage: v as Stage})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(stageLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>الصف</Label>
                            <Select value={form.grade} onValueChange={v => setForm({...form, grade: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {gradeOptions[form.stage].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>المسار</Label>
                            <Select value={form.track} onValueChange={v => setForm({...form, track: v as Track})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(trackLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-3 gap-2 items-end">
                            <div className="col-span-2 space-y-2">
                                <Label>رسوم التعليم</Label>
                                <Input type="number" value={form.tuitionFees} onChange={e => setForm({...form, tuitionFees: Number(e.target.value)})} />
                            </div>
                            <Select value={form.tuitionMandatory ? 'm' : 'o'} onValueChange={v => setForm({...form, tuitionMandatory: v === 'm'})}>
                                <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="m">إجباري</SelectItem><SelectItem value="o">اختياري</SelectItem></SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-3 gap-2 items-end">
                            <div className="col-span-2 space-y-2">
                                <Label>رسوم الكتب</Label>
                                <Input type="number" value={form.booksFees} onChange={e => setForm({...form, booksFees: Number(e.target.value)})} />
                            </div>
                            <Select value={form.booksMandatory ? 'm' : 'o'} onValueChange={v => setForm({...form, booksMandatory: v === 'm'})}>
                                <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="m">إجباري</SelectItem><SelectItem value="o">اختياري</SelectItem></SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-3 gap-2 items-end">
                            <div className="col-span-2 space-y-2">
                                <Label>رسوم الزي</Label>
                                <Input type="number" value={form.uniformFees} onChange={e => setForm({...form, uniformFees: Number(e.target.value)})} />
                            </div>
                            <Select value={form.uniformMandatory ? 'm' : 'o'} onValueChange={v => setForm({...form, uniformMandatory: v === 'm'})}>
                                <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="m">إجباري</SelectItem><SelectItem value="o">اختياري</SelectItem></SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-3 gap-2 items-end">
                            <div className="col-span-2 space-y-2">
                                <Label>رسوم فتح الملف (الأبلكيشن)</Label>
                                <Input type="number" value={form.applicationFees} onChange={e => setForm({...form, applicationFees: Number(e.target.value)})} />
                            </div>
                            <Select value={form.applicationMandatory ? 'm' : 'o'} onValueChange={v => setForm({...form, applicationMandatory: v === 'm'})}>
                                <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="m">إجباري</SelectItem><SelectItem value="o">اختياري</SelectItem></SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3 pt-2 border-t">
                            <div className="flex items-center justify-between">
                                <Label className="font-bold">رسوم إضافية</Label>
                                <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addAdditionalFee}>
                                    <Plus className="size-3 ml-1" /> إضافة نوع
                                </Button>
                            </div>
                            
                            {(form.additionalFees || []).map((fee, idx) => (
                                <div key={idx} className="p-3 border rounded-lg bg-muted/30 space-y-2">
                                    <div className="flex gap-2">
                                        <Input 
                                            placeholder="اسم الرسوم (مثال: نشاط صيفي)" 
                                            value={fee.name} 
                                            onChange={e => updateAdditionalFee(idx, 'name', e.target.value)}
                                            className="text-xs h-8"
                                        />
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeAdditionalFee(idx)}>
                                            <Trash2 className="size-3" />
                                        </Button>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <Input 
                                            type="number" 
                                            placeholder="المبلغ" 
                                            value={fee.amount} 
                                            onChange={e => updateAdditionalFee(idx, 'amount', Number(e.target.value))}
                                            className="text-xs h-8 w-24"
                                        />
                                        <Select 
                                            value={fee.isMandatory ? 'mandatory' : 'optional'} 
                                            onValueChange={v => updateAdditionalFee(idx, 'isMandatory', v === 'mandatory')}
                                        >
                                            <SelectTrigger className="h-8 text-[10px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="mandatory">إجباري</SelectItem>
                                                <SelectItem value="optional">اختياري</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {form.academicYear < currentAcademicYear ? (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
                                <Lock className="size-4 shrink-0" /> لا يمكن تعديل رسوم سنوات سابقة
                            </div>
                        ) : (
                            <Button className="w-full font-[Noto_Kufi_Arabic]" onClick={handleSave}>
                                <Save className="size-4 ml-2" /> حفظ الإعدادات
                            </Button>
                        )}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold font-[Noto_Kufi_Arabic]">قائمة الرسوم الحالية</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>السنة</TableHead>
                                        <TableHead>المرحلة / الصف</TableHead>
                                        <TableHead>المسار</TableHead>
                                        <TableHead>التعليم</TableHead>
                                        <TableHead>الكتب</TableHead>
                                        <TableHead>الزي</TableHead>
                                        <TableHead>الإجراءات</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stageFees.map((fee) => {
                                        const isOldYear = fee.academicYear < currentAcademicYear;
                                        return (
                                            <TableRow key={fee.id} className={isOldYear ? 'opacity-60 bg-muted/20' : ''}>
                                                <TableCell className="font-mono text-xs">{fee.academicYear || '-'}</TableCell>
                                                <TableCell className="font-medium text-xs">
                                                    {fee.stage ? stageLabels[fee.stage] : 'غير محدد'} - {fee.grade || 'غير محدد'}
                                                </TableCell>
                                                <TableCell className="text-xs">{fee.track ? trackLabels[fee.track] : 'ناشونال'}</TableCell>
                                                <TableCell className="text-xs">{formatCurrency(fee.tuitionFees)}</TableCell>
                                                <TableCell className="text-xs">{formatCurrency(fee.booksFees)}</TableCell>
                                                <TableCell className="text-xs">{formatCurrency(fee.uniformFees)}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            disabled={isOldYear}
                                                            onClick={() => setForm(fee)}
                                                        >
                                                            {isOldYear ? <Lock className="size-4 text-muted-foreground" /> : <Settings className="size-4" />}
                                                        </Button>
                                                        {!isOldYear && (
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="text-red-500"
                                                                onClick={async () => {
                                                                    if (confirm('هل أنت متأكد من حذف هذه الرسوم؟')) {
                                                                        await deleteStageFee(fee.id);
                                                                        toast.success('تم الحذف بنجاح');
                                                                    }
                                                                }}
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {stageFees.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                                لا توجد إعدادات رسوم حالية
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
