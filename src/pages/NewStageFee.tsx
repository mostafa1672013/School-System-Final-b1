import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Settings, Save, Trash2, Lock, BookOpen, DollarSign, Plus, ArrowRight, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdmissionStore } from '@/stores/admissionStore';
import { stageLabels, trackLabels, gradeOptions, academicYears, currentAcademicYear } from '@/lib/utils';
import type { Stage, Track, StageFee } from '@/types';

export default function NewStageFee() {
    const navigate = useNavigate();
    const location = useLocation();
    const { saveStageFee } = useAdmissionStore();
    
    // Check if we passed a fee object to edit via route state
    const editingFee = location.state?.fee as StageFee | undefined;

    const [form, setForm] = useState<Partial<StageFee>>(editingFee || {
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

    useEffect(() => {
        if (!editingFee) {
            setForm(prev => ({ ...prev, grade: gradeOptions[prev.stage || 'kg'][0] }));
        }
    }, [form.stage, editingFee]);

    const handleSave = async () => {
        if (!form.grade) {
            toast.error('يرجى اختيار الصف');
            return;
        }
        try {
            await saveStageFee(form);
            toast.success('تم حفظ إعدادات الرسوم بنجاح');
            navigate('/stage-fees');
        } catch (error: any) {
            toast.error(error.message || 'حدث خطأ أثناء الحفظ');
        }
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

    const isCurrentOrFutureYear = form.academicYear ? form.academicYear >= currentAcademicYear : true;

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-10">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 text-slate-500 mb-2 cursor-pointer hover:text-primary transition-colors w-fit" onClick={() => navigate('/stage-fees')}>
                        <ArrowRight className="size-4" />
                        <span className="text-sm font-medium">العودة لسجل الهياكل المالية</span>
                    </div>
                    <h1 className="text-3xl font-bold font-[Noto_Kufi_Arabic] text-slate-800 tracking-tight">
                        {editingFee ? 'تعديل الهيكل المالي' : 'بناء هيكل مالي جديد'}
                    </h1>
                </div>
            </div>

            {/* Form Section */}
            <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                <div className="bg-slate-50/80 border-b p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 text-primary rounded-lg shrink-0">
                            {editingFee ? <Edit className="size-5" /> : <Settings className="size-5" />}
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold">
                                {editingFee ? 'تعديل بيانات الهيكل المالي' : 'إعداد بيانات الهيكل المالي'}
                            </CardTitle>
                            <CardDescription className="mt-1 text-xs">
                                حدد البيانات الأساسية وقيمة الرسوم المطلوبة
                            </CardDescription>
                        </div>
                    </div>
                </div>

                <CardContent className="p-6 overflow-y-auto space-y-8">
                    {/* Core Settings */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                            <BookOpen className="size-5 text-slate-400" />
                            <h3 className="font-semibold text-base text-slate-700">المحددات الأساسية</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-600">السنة الدراسية</Label>
                                <Select value={form.academicYear} onValueChange={v => setForm({...form, academicYear: v})} disabled={!!editingFee && form.academicYear < currentAcademicYear}>
                                    <SelectTrigger className="bg-slate-50 h-11"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {academicYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-600">المسار (Track)</Label>
                                <Select value={form.track} onValueChange={v => setForm({...form, track: v as Track})}>
                                    <SelectTrigger className="bg-slate-50 h-11"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(trackLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-600">المرحلة الأكاديمية</Label>
                                <Select value={form.stage} onValueChange={v => setForm({...form, stage: v as Stage})}>
                                    <SelectTrigger className="bg-slate-50 h-11"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(stageLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-600">الصف الدراسي</Label>
                                <Select value={form.grade} onValueChange={v => setForm({...form, grade: v})}>
                                    <SelectTrigger className="bg-slate-50 h-11"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {(form.stage ? gradeOptions[form.stage] : gradeOptions['kg']).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Financial Settings */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                            <DollarSign className="size-5 text-slate-400" />
                            <h3 className="font-semibold text-base text-slate-700">القيم المالية</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {[
                                { id: 'tuitionFees', label: 'رسوم التعليم', val: form.tuitionFees, mandatory: form.tuitionMandatory, toggleStr: 'tuitionMandatory' },
                                { id: 'booksFees', label: 'رسوم الكتب', val: form.booksFees, mandatory: form.booksMandatory, toggleStr: 'booksMandatory' },
                                { id: 'uniformFees', label: 'رسوم الزي المدرسي', val: form.uniformFees, mandatory: form.uniformMandatory, toggleStr: 'uniformMandatory' },
                                { id: 'applicationFees', label: 'رسوم الأبلكيشن', val: form.applicationFees, mandatory: form.applicationMandatory, toggleStr: 'applicationMandatory' },
                            ].map((item, idx) => (
                                <div key={idx} className="flex gap-3 items-end p-4 rounded-xl border bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                    <div className="flex-1 space-y-2">
                                        <Label className="text-sm text-slate-600">{item.label}</Label>
                                        <div className="relative">
                                            <Input 
                                                type="number" 
                                                className="pl-12 font-medium h-11" 
                                                value={item.val || ''} 
                                                onChange={e => setForm({...form, [item.id]: Number(e.target.value)})} 
                                            />
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium select-none">ج.م</span>
                                        </div>
                                    </div>
                                    <div className="w-32 space-y-2">
                                        <Select value={item.mandatory ? 'm' : 'o'} onValueChange={v => setForm({...form, [item.toggleStr]: v === 'm'})}>
                                            <SelectTrigger className={`h-11 text-sm font-medium border-0 ring-1 ring-inset ${item.mandatory ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="m" className="text-rose-700 font-medium">إجباري</SelectItem>
                                                <SelectItem value="o" className="text-slate-600">اختياري</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Additional Fees */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b">
                            <div className="flex items-center gap-2">
                                <Plus className="size-5 text-slate-400" />
                                <h3 className="font-semibold text-base text-slate-700">رسوم إضافية</h3>
                            </div>
                            <Button type="button" variant="outline" size="sm" className="h-9 text-sm text-primary hover:bg-primary/10 border-primary/20" onClick={addAdditionalFee}>
                                إضافة بند جديد
                            </Button>
                        </div>
                        
                        {(form.additionalFees || []).length === 0 ? (
                            <div className="text-center py-6 text-sm text-slate-400 border rounded-xl border-dashed bg-slate-50">لا توجد رسوم إضافية مخصصة لهذا الهيكل</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(form.additionalFees || []).map((fee, idx) => (
                                    <div key={idx} className="flex flex-col gap-3 p-4 border rounded-xl bg-white shadow-sm relative group">
                                        <div className="flex justify-between items-start">
                                            <Input 
                                                placeholder="اسم البند (مثال: نشاط صيفي)" 
                                                value={fee.name} 
                                                onChange={e => updateAdditionalFee(idx, 'name', e.target.value)}
                                                className="text-sm h-10 border-none bg-slate-50 focus-visible:ring-1"
                                            />
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all absolute top-2 left-2" onClick={() => removeAdditionalFee(idx)}>
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                        <div className="flex gap-3 items-center w-full">
                                            <div className="relative flex-1">
                                                <Input 
                                                    type="number" 
                                                    placeholder="المبلغ" 
                                                    value={fee.amount || ''} 
                                                    onChange={e => updateAdditionalFee(idx, 'amount', Number(e.target.value))}
                                                    className="text-sm h-10 pl-12"
                                                />
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">ج.م</span>
                                            </div>
                                            <Select 
                                                value={fee.isMandatory ? 'mandatory' : 'optional'} 
                                                onValueChange={v => updateAdditionalFee(idx, 'isMandatory', v === 'mandatory')}
                                            >
                                                <SelectTrigger className={`h-10 text-sm w-[120px] border-0 ring-1 ring-inset ${fee.isMandatory ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="mandatory" className="text-sm text-rose-700">إجباري</SelectItem>
                                                    <SelectItem value="optional" className="text-sm text-slate-600">اختياري</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Save Actions */}
                    <div className="pt-6 mt-8 border-t">
                        {!isCurrentOrFutureYear ? (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 shadow-sm">
                                <Lock className="size-5 text-amber-500 shrink-0 mt-0.5" /> 
                                <div>
                                    <p className="font-bold text-amber-800 text-sm">محمي للقراءة فقط</p>
                                    <p className="text-sm text-amber-700/80 mt-1">لا يمكن تعديل هياكل الرسوم للسنوات الأكاديمية المنقضية حفاظاً على سلامة البيانات التاريخية.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-4 justify-end">
                                <Button type="button" variant="outline" className="h-12 px-8 text-base font-medium" onClick={() => navigate('/stage-fees')}>
                                    إلغاء
                                </Button>
                                <Button className="h-12 px-8 text-base font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all" onClick={handleSave}>
                                    <Save className="size-5 ml-2" /> حفظ الهيكل المالي
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
