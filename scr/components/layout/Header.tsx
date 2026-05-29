import { useLocation } from 'react-router-dom';
import { Menu, Bell, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { roleLabels } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface HeaderProps {
  onMenuToggle: () => void;
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'لوحة التحكم',
  '/students': 'إدارة الطلاب',
  '/payments': 'المدفوعات والخزينة',
  '/inventory': 'إدارة المخزن',
  '/bus': 'إدارة الباصات',
  '/reports': 'التقارير',
  '/users': 'إدارة المستخدمين',
};

export default function Header({ onMenuToggle }: HeaderProps) {
  const location = useLocation();
  const { user } = useAuthStore();
  const basePath = '/' + location.pathname.split('/')[1];
  const title = pageTitles[basePath] || 'لوحة التحكم';

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 h-16 px-6 bg-card border-b shrink-0">
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
        aria-label="فتح القائمة"
      >
        <Menu className="size-5" />
      </button>

      <div className="flex-1">
        <h2 className="text-lg font-bold font-[Noto_Kufi_Arabic]">{title}</h2>
      </div>

      <div className="hidden md:flex items-center relative max-w-xs w-full">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="بحث سريع..."
          className="pr-10 bg-muted/50 border-0 focus-visible:ring-1"
        />
      </div>

      <button className="relative p-2 hover:bg-muted rounded-lg transition-colors" aria-label="الإشعارات">
        <Bell className="size-5 text-muted-foreground" />
        <span className="absolute top-1.5 left-1.5 size-2 bg-[hsl(0,72%,51%)] rounded-full" />
      </button>

      <div className="hidden sm:flex items-center gap-2 pr-4 border-r">
        <div className="text-left">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs text-muted-foreground">{user ? roleLabels[user.role] : ''}</p>
        </div>
      </div>
    </header>
  );
}
