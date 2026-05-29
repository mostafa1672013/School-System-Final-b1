import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/authStore';
import heroImg from '@/assets/hero-login.jpg';
import logoImg from '@/assets/logo.png';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const success = login(email, password);
      if (success) {
        toast.success('تم تسجيل الدخول بنجاح');
        navigate('/dashboard', { replace: true });
      } else {
        toast.error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex">
      {/* Form Side */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="مدرستي" className="size-14 rounded-xl object-cover" />
            <div>
              <h1 className="text-2xl font-bold font-[Noto_Kufi_Arabic]">مدرستي</h1>
              <p className="text-sm text-muted-foreground">نظام الإدارة المدرسية المتكامل</p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold font-[Noto_Kufi_Arabic]">تسجيل الدخول</h2>
            <p className="text-sm text-muted-foreground mt-1">أدخل بياناتك للوصول إلى النظام</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@school.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pr-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="أدخل كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 pl-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري الدخول...
                </span>
              ) : (
                'دخول'
              )}
            </Button>
          </form>

          <div className="rounded-lg bg-muted/60 p-4 space-y-2">
            <p className="text-xs font-bold text-muted-foreground">حسابات تجريبية:</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <p>مدير النظام: admin@school.com</p>
              <p>مدير المدرسة: director@school.com</p>
              <p>رئيس الحسابات: head@school.com</p>
              <p>محاسب: cashier@school.com</p>
              <p>أمين المخزن: warehouse@school.com</p>
              <p>مشرف الباصات: bus@school.com</p>
            </div>
            <p className="text-xs text-muted-foreground">كلمة المرور: <span className="font-mono font-bold">123456</span></p>
          </div>
        </div>
      </div>

      {/* Image Side */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src={heroImg}
          alt="نظام إدارة المدرسة"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(222,47%,11%,0.85)] via-[hsl(222,47%,11%,0.4)] to-transparent" />
        <div className="absolute bottom-0 right-0 left-0 p-12">
          <h3 className="text-3xl font-bold text-white font-[Noto_Kufi_Arabic] text-balance">
            أدر مدرستك بكفاءة واحترافية
          </h3>
          <p className="text-lg text-white/80 mt-4 text-pretty max-w-lg">
            نظام متكامل لإدارة جميع العمليات الإدارية والمالية من تسجيل الطلاب حتى التقارير الشاملة
          </p>
        </div>
      </div>
    </div>
  );
}
