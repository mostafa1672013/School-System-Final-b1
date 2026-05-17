import { useState, useEffect } from 'react';
import { Shield, Save, User as UserIcon, Lock, Percent, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { roleLabels } from '@/lib/utils';
import type { User } from '@/types';

export default function DiscountSettings() {
    const { user: currentUser } = useAuthStore();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users');
            if (!response.ok) throw new Error();
            const data = await response.json();
            setUsers(data);
            setLoading(false);
        } catch (error) {
            toast.error('فشل في تحميل قائمة المستخدمين');
            setLoading(false);
        }
    };

    const handleUpdateUserLimit = async (userId: string, limit: number) => {
        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ discountLimitPercent: limit }),
            });
            if (response.ok) {
                const updatedUser = await response.json();
                toast.success('تم تحديث صلاحية المستخدم بنجاح');
                
                // If we updated the current user, update the auth store too
                if (currentUser && userId === currentUser.id) {
                    useAuthStore.getState().updateProfile(updatedUser);
                }
                
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

    const filteredUsers = users.filter(u => 
        u.name.includes(searchTerm) || u.email.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold font-[Noto_Kufi_Arabic]">إعدادات صلاحيات الخصم</h1>
                    <p className="text-muted-foreground">تحديد النسبة المئوية المسموح بها لكل مستخدم لاعتماد الخصومات</p>
                </div>
            </div>

            <Card className="shadow-sm border-primary/10">
                <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Lock className="size-5 text-primary" /> صلاحيات المستخدمين
                            </CardTitle>
                            <CardDescription>تحديد حد الخصم الأقصى لكل موظف بشكل فردي</CardDescription>
                        </div>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input 
                                placeholder="ابحث عن موظف..." 
                                className="pr-9"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="pr-6 w-1/3">الموظف</TableHead>
                                <TableHead className="w-1/4">الدور الوظيفي</TableHead>
                                <TableHead className="text-center w-1/4">حد الخصم (%)</TableHead>
                                <TableHead className="text-left pl-6">الإجراء</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
                            ) : filteredUsers.map((u) => (
                                <TableRow key={u.id} className="hover:bg-muted/20 transition-colors">
                                    <TableCell className="pr-6">
                                        <div className="flex items-center gap-3">
                                            <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                {u.name.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold">{u.name}</span>
                                                <span className="text-[10px] text-muted-foreground">{u.email}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-normal border-primary/20 text-primary">
                                            {roleLabels[u.role] || u.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center gap-2">
                                            <Input 
                                                type="number" 
                                                defaultValue={u.discountLimitPercent} 
                                                id={`user-limit-${u.id}`}
                                                className="h-8 w-20 text-center font-bold border-primary/20 focus:border-primary"
                                            />
                                            <Percent className="size-4 text-muted-foreground" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="pl-6">
                                        <Button 
                                            variant="secondary"
                                            size="sm" 
                                            className="h-9"
                                            onClick={() => {
                                                const input = document.getElementById(`user-limit-${u.id}`) as HTMLInputElement;
                                                handleUpdateUserLimit(u.id, Number(input.value));
                                            }}
                                        >
                                            <Save className="size-4 ml-2" /> حفظ التعديل
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!loading && filteredUsers.length === 0 && (
                                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground italic">لا يوجد مستخدمين بهذا الاسم</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-800">
                            <Shield className="size-4" /> كيف يتم تطبيق هذه الصلاحية؟
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-2 text-blue-900 leading-relaxed">
                        <p>1. عند قيام الموظف بطلب خصم، يقوم النظام بمقارنة النسبة المطلوبة مع الحد المسجل له هنا.</p>
                        <p>2. إذا تجاوزت النسبة الحد المسموح، لن يتمكن الموظف من اعتماد الخصم وسيتطلب تدخل المدير.</p>
                        <p>3. يتم تخزين اسم الموظف الذي قام بالخصم تلقائياً في خانة "بموافقة".</p>
                    </CardContent>
                </Card>

                <Card className="bg-amber-50 border-amber-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-800">
                            <Lock className="size-4" /> تنبيه أمني
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-2 text-amber-900 leading-relaxed">
                        <p>تغيير هذه الإعدادات يؤثر مباشرة على قدرة الموظفين على منح خصومات مالية. يرجى التأكد من دقة النسب الممنوحة لكل مستخدم.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
