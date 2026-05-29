import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, Mail, School, ShieldCheck } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(email, password);
    if (success) {
      toast.success('تم تسجيل الدخول بنجاح');
      navigate('/dashboard', { replace: true });
    } else {
      toast.error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden">
      {/* Full Screen Background with Parallax Effect */}
      <div 
        className="absolute inset-0 z-0 scale-110"
        style={{
          backgroundImage: `url(${heroImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.4) saturate(1.2)'
        }}
      />
      
      {/* Animated Overlay Gradients */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/30 via-transparent to-slate-950/80" />
      <div className="absolute inset-0 z-0 backdrop-blur-[2px]" />

      {/* Login Card - Glassmorphism Masterpiece */}
      <div className="relative z-10 w-full max-w-[440px] animate-in fade-in zoom-in-95 duration-1000">
        <div className="flex justify-center mb-8">
           <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary to-blue-600 blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative size-20 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-2 shadow-2xl">
                <img src={logoImg} alt="مدرسة الشروق" className="size-full rounded-xl object-cover shadow-inner" />
              </div>
           </div>
        </div>

        <div className="bg-white/10 dark:bg-slate-950/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-[2.5rem] p-8 lg:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black font-[Noto_Kufi_Arabic] text-white tracking-tight">مدرسة الشروق</h1>
            <div className="mt-2 flex items-center justify-center gap-2 text-primary-foreground/70">
              <ShieldCheck className="size-4" />
              <span className="text-sm font-medium">نظام الإدارة الآمن</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/90 text-sm font-bold mr-1">البريد الإلكتروني</Label>
              <div className="relative group">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-white/40 group-focus-within:text-primary transition-colors" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@school.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 pr-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-primary/50 rounded-2xl transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" title="password" className="text-white/90 text-sm font-bold mr-1">كلمة المرور</Label>
                <button type="button" className="text-xs text-primary hover:text-primary/80 font-bold transition-colors">هل نسيت السر؟</button>
              </div>
              <div className="relative group">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-white/40 group-focus-within:text-primary transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 pr-12 pl-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-primary/50 rounded-2xl transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  aria-label={showPassword ? 'إخفاء' : 'إظهار'}
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-black rounded-2xl shadow-2xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-70"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="size-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جاري الدخول...</span>
                </div>
              ) : (
                'تسجيل الدخول'
              )}
            </Button>
          </form>

          <div className="mt-10 flex flex-col items-center gap-4">
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em]">بيانات الدخول التجريبي</p>
            <div className="flex gap-2">
               <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/60">
                 admin@school.com
               </div>
               <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/60">
                 123456
               </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center animate-in fade-in slide-in-from-top-4 duration-1000 delay-500">
           <p className="text-white/40 text-xs font-medium">
             جميع الحقوق محفوظة &copy; مدرسة الشروق 2024
           </p>
        </div>
      </div>

      {/* Floating Decorative Orbs */}
      <div className="absolute top-20 left-20 size-64 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-20 right-20 size-64 bg-blue-600/20 rounded-full blur-[100px] animate-pulse delay-700" />
    </div>
  );
}
