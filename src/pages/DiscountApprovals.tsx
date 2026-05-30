import { useState, useEffect } from 'react';
import { Check, X, User, FileText, Phone, GraduationCap, Banknote, Percent, ShieldAlert, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore, getAuthHeaders } from '@/stores/authStore';
import { formatCurrency, roleLabels, stageLabels } from '@/lib/utils';
import type { Student } from '@/types';

export default function DiscountApprovals() {
    const { user } = useAuthStore();
    const [requests, setRequests] = useState<Student[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userLimit, setUserLimit] = useState(0);

    const fetchRequests = async () => {
        if (!user?.id) return;
        try {
            const [discountRes, usersRes, userRes] = await Promise.all([
                fetch(`/api/admission/pending-discounts?approverId=${user.id}`, { headers: getAuthHeaders() }),
                fetch('/api/users', { headers: getAuthHeaders() }),
                fetch(`/api/users/${user.id}`, { headers: getAuthHeaders() })
            ]);
            const discountData = discountRes.ok ? await discountRes.json() : [];
            const usersData = usersRes.ok ? await usersRes.json() : [];
            const userData = userRes.ok ? await userRes.json() : {};
            setRequests(Array.isArray(discountData) ? discountData : []);
            setAllUsers(Array.isArray(usersData) ? usersData : []);
            setUserLimit(userData?.discountLimitPercent || 0);
        } catch (error) {
            console.error('Failed to fetch requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [user?.id]);

    const getUserName = (userId?: string | null) => {
        if (!userId) return null;
        const found = allUsers.find(u => u.id === userId);
        if (found) return `${found.name} (${roleLabels[found.role] || found.role})`;
        return null;
    };

    const getDiscountPct = (request: Student) => {
        const totalBeforeDiscount = (request.totalFees || 0) + (request.discountAmount || 0);
        return request.discountPercentage ||
            (totalBeforeDiscount > 0 ? (request.discountAmount / totalBeforeDiscount * 100) : 0);
    };

    const handleAction = async (studentId: string, status: 'approved' | 'rejected') => {
        try {
            const response = await fetch(`/api/admission/action-discount/${studentId}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    status,
                    approvedBy: `${user?.name} (${roleLabels[user?.role || ''] || user?.role})`,
                    approverId: user?.id
                }),
            });

            if (response.ok) {
                toast.success(status === 'approved' ? 'تم اعتماد الخصم بنجاح' : 'تم رفض طلب الخصم');
                fetchRequests();
            } else {
                const err = await response.json();
                toast.error(err.error || 'حدث خطأ أثناء تنفيذ الإجراء');
            }
        } catch (error) {
            toast.error('حدث خطأ أثناء تنفيذ الإجراء');
        }
    };

    if (loading) return <div className="flex items-center justify-center h-64"><Clock className="animate-spin mr-2" /> جاري تحميل الطلبات...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-[Noto_Kufi_Arabic]">اعتمادات الخصومات</h1>
                    <p className="text-muted-foreground">طلبات الخصم التي تتجاوز صلاحيات الموظفين وبانتظار قرارك</p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-sm px-3 py-1">
                        صلاحيتك: {userLimit}%
                    </Badge>
                    {requests.length > 0 && (
                        <Badge className="bg-red-500 text-white text-sm px-3 py-1">{requests.length} طلب معلق</Badge>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {requests.length === 0 ? (
                    <div className="lg:col-span-2 text-center py-20 bg-card rounded-lg border border-dashed">
                        <Check className="size-12 mx-auto mb-4 opacity-20" />
                        <p className="text-muted-foreground font-medium">لا توجد طلبات بانتظار الاعتماد حالياً</p>
                    </div>
                ) : (
                    requests.map(request => {
                        const totalBeforeDiscount = (request.totalFees || 0) + (request.discountAmount || 0);
                        const discountPct = getDiscountPct(request);
                        const requesterName = getUserName(request.discountRequesterId);
                        const canApprove = userLimit >= discountPct;

                        return (
                            <Card key={request.id} className={`overflow-hidden shadow-sm ${canApprove ? 'border-blue-100' : 'border-red-200'}`}>
                                <CardHeader className="pb-3 border-b bg-gradient-to-l from-blue-50 to-white">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="size-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                                                <User className="size-6" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base font-bold">{request.name}</CardTitle>
                                                <CardDescription className="text-xs mt-0.5">{request.nationalId}</CardDescription>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold">طلب معلق</Badge>
                                    </div>
                                </CardHeader>

                                <CardContent className="pt-4 space-y-4">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="flex items-center gap-1.5 p-2 bg-gray-50 rounded">
                                            <GraduationCap className="size-3.5 text-muted-foreground" />
                                            <span className="text-muted-foreground">المرحلة:</span>
                                            <span className="font-bold">{stageLabels[request.stage] || request.stage}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 p-2 bg-gray-50 rounded">
                                            <FileText className="size-3.5 text-muted-foreground" />
                                            <span className="text-muted-foreground">الصف:</span>
                                            <span className="font-bold">{request.grade}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 p-2 bg-gray-50 rounded">
                                            <User className="size-3.5 text-muted-foreground" />
                                            <span className="text-muted-foreground">ولي الأمر:</span>
                                            <span className="font-bold">{request.guardianName}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 p-2 bg-gray-50 rounded">
                                            <Phone className="size-3.5 text-muted-foreground" />
                                            <span className="text-muted-foreground">الهاتف:</span>
                                            <span className="font-bold" dir="ltr">{request.guardianPhone}</span>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-white rounded-lg border space-y-1.5">
                                        <p className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1"><Banknote className="size-3.5" /> تفصيل الرسوم</p>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                            {request.tuitionFees > 0 && (
                                                <div className="flex justify-between"><span>رسوم التعليم:</span><span className="font-bold">{formatCurrency(request.tuitionFees)}</span></div>
                                            )}
                                            {request.booksFees > 0 && (
                                                <div className="flex justify-between"><span>رسوم الكتب:</span><span className="font-bold">{formatCurrency(request.booksFees)}</span></div>
                                            )}
                                            {request.uniformFees > 0 && (
                                                <div className="flex justify-between"><span>رسوم الزي:</span><span className="font-bold">{formatCurrency(request.uniformFees)}</span></div>
                                            )}
                                            {request.busFees > 0 && (
                                                <div className="flex justify-between"><span>رسوم الباص:</span><span className="font-bold">{formatCurrency(request.busFees)}</span></div>
                                            )}
                                        </div>
                                        <div className="border-t pt-1.5 mt-1.5 flex justify-between text-xs font-bold">
                                            <span>الإجمالي قبل الخصم:</span>
                                            <span>{formatCurrency(totalBeforeDiscount)}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-center">
                                            <div className="flex items-center justify-center gap-1 mb-1">
                                                <Percent className="size-3.5 text-red-600" />
                                                <p className="text-[10px] text-red-600 font-medium">نسبة الخصم المطلوبة</p>
                                            </div>
                                            <p className="font-bold text-xl text-red-700">{discountPct.toFixed(1)}%</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-center">
                                            <div className="flex items-center justify-center gap-1 mb-1">
                                                <Banknote className="size-3.5 text-red-600" />
                                                <p className="text-[10px] text-red-600 font-medium">قيمة الخصم</p>
                                            </div>
                                            <p className="font-bold text-xl text-red-700">{formatCurrency(request.discountAmount)}</p>
                                        </div>
                                    </div>

                                    <div className="p-2 bg-emerald-50 border border-emerald-100 rounded text-center">
                                        <p className="text-[10px] text-emerald-600">صافي المبلغ بعد الخصم</p>
                                        <p className="font-bold text-lg text-emerald-700">{formatCurrency(request.totalFees)}</p>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-100 p-3 rounded">
                                        <User className="size-4 text-blue-600" />
                                        <span className="text-blue-700">الموظف طالب الخصم:</span>
                                        <span className="font-bold text-blue-900">{requesterName || 'غير محدد'}</span>
                                    </div>

                                    {!canApprove && (
                                        <div className="flex items-center gap-2 text-xs bg-red-50 border-2 border-red-200 p-3 rounded">
                                            <ShieldAlert className="size-5 text-red-600 shrink-0" />
                                            <div>
                                                <p className="font-bold text-red-700">غير مصرح لك باعتماد هذا الخصم</p>
                                                <p className="text-red-600 mt-0.5">صلاحيتك ({userLimit}%) أقل من الخصم المطلوب ({discountPct.toFixed(1)}%). يمكنك الرفض فقط.</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-2 pt-1">
                                        <Button
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-[Noto_Kufi_Arabic] h-11 disabled:opacity-40 disabled:cursor-not-allowed"
                                            disabled={!canApprove}
                                            onClick={() => handleAction(request.id, 'approved')}
                                        >
                                            <Check className="size-4 ml-2" /> اعتماد الخصم
                                        </Button>
                                        <Button variant="destructive" className="flex-1 font-[Noto_Kufi_Arabic] h-11" onClick={() => handleAction(request.id, 'rejected')}>
                                            <X className="size-4 ml-2" /> رفض الطلب
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
