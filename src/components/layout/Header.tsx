import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, Moon, Sun, Calendar, Clock } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { roleLabels } from '@/lib/utils';

interface HeaderProps {
  onMenuToggle: () => void;
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'لوحة التحكم',
  '/students': 'إدارة الطلاب',
  '/admission': 'القبول والتسجيل',
  '/student-promotion': 'نقل الطلاب',
  '/year-management': 'إدارة السنة الدراسية',
  '/payments': 'المدفوعات',
  '/treasury': 'إدارة الخزينة',
  '/inventory': 'إدارة المخزن',
  '/suppliers': 'سجل الموردين',
  '/purchasing': 'دورة المشتريات',
  '/bus': 'إدارة الباصات',
  '/reports': 'التقارير',
  '/stage-fees': 'الهياكل المالية',
  '/discount-settings': 'صلاحيات الخصم',
  '/badge-settings': 'إعدادات الشارات',
  '/discount-approvals': 'اعتمادات الخصومات',
  '/payment-approvals': 'اعتمادات التحويلات',
  '/accounts': 'شجرة الحسابات',
  '/journal-entries': 'القيود المحاسبية',
  '/accounting-reports': 'التقارير المحاسبية',
  '/accounting-periods': 'الفترات المحاسبية',
  '/expense-permissions': 'حدود الصرف',
  '/expenses': 'المصروفات',
  '/expense-approvals': 'اعتماد المصروفات',
  '/users': 'إدارة المستخدمين',
  '/system-logs': 'سجلات النظام',
  '/data-migration': 'هجرة البيانات',
  '/database': 'إدارة قاعدة البيانات',
  '/profile': 'الملف الشخصي',
};

export default function Header({ onMenuToggle }: HeaderProps) {
  const location = useLocation();
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const basePath = '/' + location.pathname.split('/')[1];
  const title = pageTitles[basePath] || 'لوحة التحكم';

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 h-20 px-6 bg-background/80 backdrop-blur-md border-b border-border/40 shrink-0 transition-colors duration-300">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2.5 bg-muted/50 hover:bg-muted rounded-xl transition-colors"
          aria-label="فتح القائمة"
        >
          <Menu className="size-5" />
        </button>

        <div>
          <h2 className="text-2xl font-bold font-[Noto_Kufi_Arabic] bg-gradient-to-l from-slate-800 to-slate-500 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
            {title}
          </h2>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-4 bg-muted/30 px-4 py-2 rounded-full border border-border/50 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-primary/80" />
          <span className="text-[13px] font-bold font-[Tajawal] text-foreground">{dateStr}</span>
        </div>
        <div className="w-[1px] h-4 bg-border/80"></div>
        <div className="flex items-center gap-1.5">
          <Clock className="size-4 text-primary/80" />
          <span className="text-sm font-bold font-mono text-foreground tabular-nums tracking-wide mt-0.5">{timeStr}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <button
          onClick={toggleTheme}
          className="relative p-2.5 rounded-full bg-gradient-to-tr from-muted/50 to-muted/20 hover:from-primary/10 hover:to-primary/5 border border-border/50 transition-all text-muted-foreground hover:text-primary shadow-sm group overflow-hidden"
          aria-label="تبديل وضع الألوان"
        >
          {theme === 'light' ? (
            <Moon className="size-5 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110" strokeWidth={1.5} />
          ) : (
            <Sun className="size-5 text-amber-400 transition-transform duration-500 group-hover:rotate-90 group-hover:scale-110" strokeWidth={1.5} />
          )}
        </button>
        
        <div className="h-8 w-[1px] bg-border/50 hidden sm:block mx-1"></div>

        <div className="flex items-center gap-3 p-1.5 pr-4 rounded-full hover:bg-muted/30 transition-all cursor-pointer border border-transparent hover:border-border/50">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold leading-tight text-foreground">{user?.name}</p>
            <p className="text-[11px] font-medium text-primary mt-0.5">{user ? roleLabels[user.role] : ''}</p>
          </div>
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="size-10 rounded-full object-cover shadow-sm ring-2 ring-background"
            />
          ) : (
            <div className="size-10 rounded-full bg-gradient-to-tr from-primary to-indigo-500 text-white flex items-center justify-center text-base font-bold shadow-sm ring-2 ring-background">
              {user?.name?.trim()[0]?.toUpperCase() ?? '؟'}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
