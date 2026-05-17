import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Lock, Building, DollarSign, Calendar, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAdmissionStore } from '@/stores/admissionStore';
import { stageLabels, trackLabels, formatCurrency, currentAcademicYear } from '@/lib/utils';
import StatCard from '@/components/features/StatCard';

export default function StageFeeManagement() {
    const navigate = useNavigate();
    const { stageFees, fetchStageFees, deleteStageFee } = useAdmissionStore();

    useEffect(() => {
        fetchStageFees();
    }, [fetchStageFees]);

    const handleNew = () => {
        navigate('/stage-fees/new');
    };

    // Statistics calculations
    const stats = useMemo(() => {
        const currentYearConfigs = stageFees.filter(f => f.academicYear === currentAcademicYear);
        return {
            totalConfigs: stageFees.length,
            currentYearConfigs: currentYearConfigs.length,
            avgTuition: currentYearConfigs.length > 0 
                ? currentYearConfigs.reduce((sum, f) => sum + f.tuitionFees, 0) / currentYearConfigs.length 
                : 0
        };
    }, [stageFees]);

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold font-[Noto_Kufi_Arabic] text-slate-800 tracking-tight">سجل الهياكل المالية</h1>
                    <p className="text-slate-500 mt-1">إدارة واعتماد الهياكل المالية لكل صف دراسي باحترافية</p>
                </div>
                <Button onClick={handleNew} className="relative z-10 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                    <Plus className="size-5 ml-2" /> إعداد هيكل رسوم جديد
                </Button>
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard 
                    title="إجمالي الهياكل المعتمدة" 
                    value={stats.totalConfigs.toString()} 
                    icon={Building} 
                    colorClass="indigo" 
                    trend="تاريخياً" 
                />
                <StatCard 
                    title="هياكل العام الحالي" 
                    value={stats.currentYearConfigs.toString()} 
                    icon={Calendar} 
                    colorClass="teal" 
                    trend={currentAcademicYear} 
                />
                <StatCard 
                    title="متوسط رسوم التعليم للعام الحالي" 
                    value={formatCurrency(stats.avgTuition)} 
                    icon={DollarSign} 
                    colorClass="sky" 
                />
            </div>

            {/* Table Section */}
            <Card className="border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <CardHeader className="bg-slate-50/80 border-b p-5 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-bold">جدول الهياكل المالية</CardTitle>
                        <CardDescription className="mt-1">استعراض وتعديل كافة رسوم المراحل المعتمدة</CardDescription>
                    </div>
                    <Badge variant="secondary" className="bg-white text-slate-700 border-slate-200 pointer-events-none px-3 py-1 text-sm font-medium shadow-sm">
                        إجمالي: {stageFees.length}
                    </Badge>
                </CardHeader>
                <CardContent className="p-0 overflow-auto">
                    <div className="min-w-max">
                        <Table>
                            <TableHeader className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-24 text-center font-bold text-slate-700">السنة</TableHead>
                                    <TableHead className="font-bold text-slate-700">المرحلة / الصف / المسار</TableHead>
                                    <TableHead className="text-center font-bold text-slate-700">التعليم</TableHead>
                                    <TableHead className="text-center font-bold text-slate-700">الكتب</TableHead>
                                    <TableHead className="text-center font-bold text-slate-700">الزي</TableHead>
                                    <TableHead className="text-center font-bold text-slate-700">إضافية / أخرى</TableHead>
                                    <TableHead className="w-28 text-center font-bold text-slate-700">الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stageFees.map((fee) => {
                                    const isOldYear = fee.academicYear < currentAcademicYear;
                                    const additionalSum = (fee.additionalFees || []).reduce((acc, curr) => acc + curr.amount, 0);
                                    
                                    return (
                                        <TableRow key={fee.id} className={`transition-colors group ${isOldYear ? 'bg-slate-50/50' : 'hover:bg-slate-50/80'}`}>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className={`font-mono text-xs px-2 py-0.5 border ${isOldYear ? 'text-slate-400 bg-slate-100 border-slate-200' : 'text-indigo-700 bg-indigo-50 border-indigo-200'}`}>
                                                    {fee.academicYear || '-'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm text-slate-800">
                                                            {fee.grade || 'غير محدد'}
                                                        </span>
                                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-600 font-medium">
                                                            {fee.stage ? stageLabels[fee.stage] : 'غير محدد'}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${fee.track === 'international' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                            {fee.track ? trackLabels[fee.track] : 'ناشونال'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="font-semibold text-slate-700">{formatCurrency(fee.tuitionFees)}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="font-medium text-slate-600">{formatCurrency(fee.booksFees)}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="font-medium text-slate-600">{formatCurrency(fee.uniformFees)}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex flex-col items-center justify-center gap-0.5">
                                                    <span className="font-medium text-slate-600">{formatCurrency(additionalSum)}</span>
                                                    {fee.additionalFees && fee.additionalFees.length > 0 && (
                                                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 rounded flex items-center gap-1">
                                                            <Plus className="size-3" /> {fee.additionalFees.length} بنود إضافية
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex justify-center items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className={`size-8 rounded-lg ${isOldYear ? 'hover:bg-slate-200' : 'hover:bg-blue-50 text-blue-600'}`}
                                                        onClick={() => navigate('/stage-fees/new', { state: { fee } })}
                                                        title={isOldYear ? "عرض التفاصيل" : "تعديل"}
                                                    >
                                                        {isOldYear ? <Lock className="size-4 text-slate-400" /> : <Edit className="size-4" />}
                                                    </Button>
                                                    {!isOldYear && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="size-8 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                                            onClick={async () => {
                                                                if (confirm('هل أنت متأكد من حذف هذه الرسوم نهائياً؟')) {
                                                                    await deleteStageFee(fee.id);
                                                                    toast.success('تم الحذف بنجاح');
                                                                }
                                                            }}
                                                            title="حذف"
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="group-hover:hidden text-[10px] text-slate-400 font-medium">إجراءات</div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {stageFees.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7}>
                                            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                                <Building className="size-12 mb-4 opacity-20" />
                                                <p className="text-sm font-medium">لم يتم اعتماد أي هياكل مالية بعد</p>
                                                <Button variant="link" onClick={handleNew} className="text-primary mt-2 h-auto p-0">إضافة الهيكل الأول الآن</Button>
                                            </div>
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
