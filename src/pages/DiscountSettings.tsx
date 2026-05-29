import { useState, useEffect } from 'react';
import { Shield, Save, User as UserIcon, Lock, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types';

export default function DiscountSettings() {
    const { user: currentUser } = useAuthStore();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch('http://127.0.0.1:4000/api/users');
            const data = await response.json();
            setUsers(data);
            setLoading(false);
        } catch (error) {
            toast.error('فشل في تحميل قائمة المستخدمين');
        }
    };

    const handleUpdateLimit = async (userId: string, limit: number) => {
        try {
            const response = await fetch(`http://127.0.0.1:4000/api/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ discountLimitPercent: limit }),
            });
            if (response.ok) {
                toast.success('تم تحديث صلاحية الخصم بنجاح');
                fetchUsers();
            }
        } catch (error) {
            toast.error('حدث خطأ أثناء التحديث');
        }
    };

    if (currentUser?.role !== 'system_admin' && currentUser?.role !== 'school_director') {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <Shield className="size-16 text-red-500 opacity-20" />
                <h2 className="text-xl font-bold">عذراً، لا تملك صلاحية الوصول لهذه الصفحة</h2>
                <p className="text-muted-foreground">هذه الإعدادات متاحة لمدير النظام ومدير المدرسة فقط.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold font-[Noto_Kufi_Arabic]">إعدادات صلاحيات الخصم</h1>
                <p className="text-muted-foreground">تحديد الحد الأقصى لنسبة الخصم التي يمكن لكل مستخدم اعتمادها</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Lock className="size-5 text-primary" /> صلاحيات المستخدمين
                        </CardTitle>
                        <CardDescription>المستخدم س (2%)، المستخدم ص (5%)، أو أي نسبة أخرى</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>المستخدم</TableHead>
                                    <TableHead>الدور</TableHead>
                                    <TableHead>حد الخصم (%)</TableHead>
                                    <TableHead className="text-left">تحديث</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((u) => (
                                    <TableRow key={u.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <UserIcon className="size-4 text-muted-foreground" />
                                                <span className="font-medium">{u.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{u.role}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 max-w-[120px]">
                                                <Input 
                                                    type="number" 
                                                    defaultValue={u.discountLimitPercent} 
                                                    id={`limit-${u.id}`}
                                                    className="h-8 text-center font-bold"
                                                />
                                                <Percent className="size-4 text-muted-foreground" />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Button 
                                                size="sm" 
                                                className="h-8"
                                                onClick={() => {
                                                    const input = document.getElementById(`limit-${u.id}`) as HTMLInputElement;
                                                    handleUpdateLimit(u.id, Number(input.value));
                                                }}
                                            >
                                                <Save className="size-4 ml-1" /> حفظ
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50/50 border-blue-100">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Shield className="size-4 text-blue-600" /> كيف تعمل هذه الصلاحية؟
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-3 text-blue-800 leading-relaxed">
                        <p>1. يتم حساب نسبة الخصم بناءً على إجمالي المصاريف قبل الخصم.</p>
                        <p>2. إذا كانت نسبة الخصم المطلوبة <strong>أقل من أو تساوي</strong> حد المستخدم، يمكنه الضغط على "اعتماد" مباشرة.</p>
                        <p>3. إذا كانت النسبة <strong>أكبر</strong> من حده، سيظهر له تنبيه بأن الطلب يحتاج لاعتماد من مستوى أعلى (مثل مدير المدرسة).</p>
                        <p>4. مدير المدرسة لديه صلاحية مفتوحة دائماً (يمكن ضبط حده على 100%).</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
