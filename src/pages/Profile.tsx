import { useState } from 'react';
import { toast } from 'sonner';
import { User, Lock, Camera, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';
import { roleLabels } from '@/lib/utils';

export default function Profile() {
    const { user, updateProfile } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        avatar: user?.avatar || '',
        password: '',
        confirmPassword: '',
    });

    const handleUpdateInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const success = await updateProfile({ name: formData.name, email: formData.email, avatar: formData.avatar });
        setIsLoading(false);
        if (success) toast.success('تم تحديث البيانات الشخصية بنجاح');
        else toast.error('فشل في تحديث البيانات');
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            return toast.error('كلمات المرور غير متطابقة');
        }
        setIsLoading(true);
        const success = await updateProfile({ password: formData.password });
        setIsLoading(false);
        if (success) {
            toast.success('تم تغيير كلمة المرور بنجاح');
            setFormData({ ...formData, password: '', confirmPassword: '' });
        } else {
            toast.error('فشل في تغيير كلمة المرور');
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                return toast.error('حجم الصورة كبير جداً (الحد الأقصى 2 ميجابايت)');
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, avatar: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <div className="relative group">
                    <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold overflow-hidden border-4 border-background shadow-xl">
                        {formData.avatar ? (
                            <img src={formData.avatar} alt={user?.name} className="size-full object-cover" />
                        ) : (
                            user?.name.charAt(0)
                        )}
                    </div>
                    <label className="absolute bottom-0 right-0 size-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer">
                        <Camera className="size-4" />
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                </div>
                <div>
                    <h2 className="text-2xl font-bold font-[Noto_Kufi_Arabic]">{user?.name}</h2>
                    <p className="text-muted-foreground">{roleLabels[user?.role || 'accountant']}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Personal Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 font-[Noto_Kufi_Arabic]">
                            <User className="size-5 text-primary" />
                            البيانات الشخصية
                        </CardTitle>
                        <CardDescription>تحديث معلومات حسابك الأساسية</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdateInfo} className="space-y-4">
                            <div className="space-y-2">
                                <Label>الاسم الكامل</Label>
                                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>البريد الإلكتروني</Label>
                                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div className="p-4 rounded-lg bg-muted/50 border border-dashed text-center">
                                <p className="text-xs text-muted-foreground mb-2">اضغط على أيقونة الكاميرا بالأعلى لتغيير الصورة</p>
                                <Button type="button" variant="outline" size="sm" onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}>
                                    <Camera className="size-3.5 ml-2" />
                                    اختر صورة
                                </Button>
                            </div>
                            <Button type="submit" disabled={isLoading} className="w-full">
                                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4 ml-2" />}
                                حفظ التغييرات
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Password Change */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 font-[Noto_Kufi_Arabic]">
                            <Lock className="size-5 text-primary" />
                            تغيير كلمة المرور
                        </CardTitle>
                        <CardDescription>تأكد من اختيار كلمة مرور قوية</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div className="space-y-2">
                                <Label>كلمة المرور الجديدة</Label>
                                <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>تأكيد كلمة المرور</Label>
                                <Input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} />
                            </div>
                            <Button type="submit" variant="outline" disabled={isLoading} className="w-full">
                                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4 ml-2" />}
                                تحديث كلمة المرور
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
