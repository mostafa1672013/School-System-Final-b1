import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  Banknote,
  Package,
  Bus,
  BarChart3,
  UserCog,
  User,
  Clock,
  LogOut,
  ChevronRight,
  ChevronLeft,
  X,
  UserCheck,
  Settings,
  ShieldAlert,
  Fingerprint,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types';
import logoImg from '@/assets/logo.png';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { label: 'لوحة التحكم', path: '/dashboard', icon: LayoutDashboard, roles: ['system_admin', 'school_director', 'head_accountant', 'accountant', 'warehouse_keeper', 'bus_supervisor'] },
  { label: 'إدارة الطلاب', path: '/students', icon: GraduationCap, roles: ['system_admin', 'school_director', 'head_accountant', 'accountant'] },
  { label: 'المدفوعات والخزينة', path: '/payments', icon: Banknote, roles: ['system_admin', 'school_director', 'head_accountant', 'accountant'] },
  { label: 'المخزن', path: '/inventory', icon: Package, roles: ['system_admin', 'school_director', 'warehouse_keeper'] },
  { label: 'الباصات', path: '/bus', icon: Bus, roles: ['system_admin', 'school_director', 'bus_supervisor'] },
  { label: 'التقارير', path: '/reports', icon: BarChart3, roles: ['system_admin', 'school_director', 'head_accountant'] },
  { label: 'القبول والتسجيل', path: '/admission', icon: UserCheck, roles: ['system_admin', 'school_director', 'head_accountant', 'accountant'] },
  { label: 'إعدادات الرسوم', path: '/stage-fees', icon: Settings, roles: ['system_admin', 'school_director'] },
  { label: 'تعديل الأرصدة (Admin)', path: '/admin-balances', icon: Settings, roles: ['system_admin'] },
  { label: 'إدارة الموظفين (HR)', path: '/employees', icon: UserCog, roles: ['system_admin', 'school_director'] },
  { label: 'اعتمادات الخصومات', path: '/discount-approvals', icon: ShieldAlert, roles: ['system_admin', 'school_director', 'head_accountant', 'accountant'] },
  { label: 'المستخدمين', path: '/users', icon: UserCog, roles: ['system_admin'] },
  { label: 'إدارة المناوبات', path: '/shifts', icon: Clock, roles: ['system_admin', 'school_director'] },
  { label: 'حضور الموظفين (البصمة)', path: '/attendance', icon: Fingerprint, roles: ['system_admin', 'school_director'] },
  { label: 'الإجازات والأعياد الرسمية', path: '/hr-dashboard', icon: CalendarDays, roles: ['system_admin', 'school_director'] },
  { label: 'الملف الشخصي', path: '/profile', icon: User, roles: ['system_admin', 'school_director', 'head_accountant', 'accountant', 'warehouse_keeper', 'bus_supervisor'] },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const filteredItems = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside className={cn(
        'fixed lg:static inset-y-0 right-0 z-50 w-72 flex flex-col transition-transform duration-300 bg-sidebar text-sidebar-foreground',
        isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0 lg:w-72'
      )}>
        <div className="flex items-center gap-3 p-5 border-b border-sidebar-border">
          <img src={logoImg} alt="مدرسة الشروق" className="size-10 rounded-lg object-cover" />
          <div className="flex-1">
            <h1 className="text-lg font-bold font-[Noto_Kufi_Arabic]">مدرسة الشروق</h1>
            <p className="text-xs text-sidebar-foreground/60">نظام الإدارة المدرسية</p>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-sidebar-accent rounded" aria-label="إغلاق القائمة">
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="size-5 shrink-0" />
                <span>{item.label}</span>
                {isActive && <ChevronLeft className="size-4 mr-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <Link 
            to="/profile" 
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 mb-2 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors group"
          >
            <div className="size-9 rounded-full bg-sidebar-primary flex items-center justify-center text-white font-bold text-sm overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="size-full object-cover" />
              ) : (
                user?.name?.charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{user?.name}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
            </div>
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="size-5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
