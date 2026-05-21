import { useState } from 'react';
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
  LogOut,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  UserCheck,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Plus,
  BookOpen,
  Receipt,
  Wallet,
  Coins,
  History,
  Vault,
  Calendar,
  FileText,
  Database,
  Tag,
  ArrowRightLeft,
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
  path?: string;
  icon: React.ElementType;
  roles: UserRole[];
  subItems?: {
    label: string;
    path: string;
    icon: React.ElementType;
    roles: UserRole[];
  }[];
}

const navItems: NavItem[] = [
  { label: 'لوحة التحكم', path: '/dashboard', icon: LayoutDashboard, roles: ['system_admin', 'school_director', 'head_accountant', 'accountant', 'warehouse_keeper', 'bus_supervisor'] },
  {
    label: 'إدارة الطلاب',
    icon: GraduationCap,
    roles: ['system_admin', 'school_director', 'head_accountant', 'accountant'],
    subItems: [
      { label: 'قائمة الطلاب', path: '/students', icon: GraduationCap, roles: ['system_admin', 'school_director', 'head_accountant', 'accountant'] },
      { label: 'القبول والتسجيل', path: '/admission', icon: UserCheck, roles: ['system_admin', 'school_director', 'head_accountant', 'accountant'] },
      { label: 'طلب التحاق جديد', path: '/admission/new', icon: UserCheck, roles: ['system_admin', 'school_director', 'head_accountant', 'accountant'] },
    ]
  },
  { label: 'نقل الطلاب', path: '/student-promotion', icon: ArrowRightLeft, roles: ['school_director', 'head_accountant'] },
  { label: 'المدفوعات والخزينة', path: '/payments', icon: Banknote, roles: ['system_admin', 'school_director', 'head_accountant', 'accountant'] },
  { label: 'الخزينة', path: '/treasury', icon: Vault, roles: ['system_admin', 'school_director', 'head_accountant', 'accountant'] },
  { label: 'المخزن', path: '/inventory', icon: Package, roles: ['system_admin', 'school_director', 'warehouse_keeper'] },
  { label: 'الباصات', path: '/bus', icon: Bus, roles: ['system_admin', 'school_director', 'bus_supervisor'] },
  { label: 'التقارير', path: '/reports', icon: BarChart3, roles: ['system_admin', 'school_director', 'head_accountant'] },
  { 
    label: 'إعدادات الرسوم', 
    icon: Settings, 
    roles: ['system_admin', 'school_director'],
    subItems: [
      { label: 'سجل الهياكل المالية', path: '/stage-fees', icon: Settings, roles: ['system_admin', 'school_director'] },
      { label: 'بناء هيكل جديد', path: '/stage-fees/new', icon: Plus, roles: ['system_admin', 'school_director'] },
      { label: 'صلاحيات الخصم', path: '/discount-settings', icon: UserCog, roles: ['system_admin', 'school_director'] },
      { label: 'إعدادات الشارات', path: '/badge-settings', icon: Tag, roles: ['system_admin', 'school_director'] },
    ]
  },
  { label: 'اعتمادات الخصومات', path: '/discount-approvals', icon: ShieldAlert, roles: ['system_admin', 'school_director', 'head_accountant', 'accountant'] },
  { label: 'اعتمادات التحويلات', path: '/payment-approvals', icon: ShieldAlert, roles: ['system_admin', 'school_director'] },
  { 
    label: 'المحاسبة والمصروفات', 
    icon: Wallet, 
    roles: ['system_admin', 'school_director', 'head_accountant', 'accountant'],
    subItems: [
      { label: 'شجرة الحسابات', path: '/accounts', icon: BookOpen, roles: ['system_admin', 'school_director', 'head_accountant'] },
      { label: 'القيود المحاسبية', path: '/journal-entries', icon: FileText, roles: ['system_admin', 'school_director', 'head_accountant'] },
      { label: 'التقارير المحاسبية', path: '/accounting-reports', icon: BarChart3, roles: ['system_admin', 'school_director', 'head_accountant'] },
      { label: 'الفترات المحاسبية', path: '/accounting-periods', icon: Calendar, roles: ['system_admin', 'school_director', 'head_accountant'] },
      { label: 'إدارة حدود الصرف', path: '/expense-permissions', icon: ShieldCheck, roles: ['system_admin', 'school_director'] },
      { label: 'طلب صرف مصروف', path: '/expenses', icon: Receipt, roles: ['system_admin', 'school_director', 'head_accountant', 'accountant', 'warehouse_keeper', 'bus_supervisor'] },
      { label: 'اعتماد المصروفات', path: '/expense-approvals', icon: UserCheck, roles: ['system_admin', 'school_director', 'head_accountant'] },
    ]
  },
  { label: 'المستخدمين', path: '/users', icon: UserCog, roles: ['system_admin'] },
  { label: 'إدارة قاعدة البيانات', path: '/database', icon: Database, roles: ['system_admin'] },
  { label: 'الملف الشخصي', path: '/profile', icon: User, roles: ['system_admin', 'school_director', 'head_accountant', 'accountant', 'warehouse_keeper', 'bus_supervisor'] },
];

function NavItemRenderer({ item, onClose, location }: { item: NavItem; onClose: () => void; location: any }) {
  const hasSubItems = item.subItems && item.subItems.length > 0;
  
  const isChildActive = hasSubItems && item.subItems!.some(sub => location.pathname === sub.path || location.pathname.startsWith(sub.path + '/'));
  const isSelfActive = item.path ? (location.pathname === item.path || location.pathname.startsWith(item.path + '/')) : false;
  const isActive = isSelfActive || isChildActive;

  const [isOpen, setIsOpen] = useState(isActive);

  if (hasSubItems) {
    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors w-full',
            isActive && !isOpen
              ? 'bg-sidebar-primary/10 text-sidebar-primary'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}
        >
          <item.icon className="size-5 shrink-0" />
          <span>{item.label}</span>
          {isOpen ? <ChevronDown className="size-4 mr-auto" /> : <ChevronLeft className="size-4 mr-auto" />}
        </button>
        
        {isOpen && (
          <div className="pl-4 pr-6 space-y-1 mt-1 border-r-2 border-sidebar-border mr-2">
            {item.subItems!.map(sub => {
              const isSubActive = location.pathname === sub.path || location.pathname.startsWith(sub.path + '/');
              return (
                <Link
                  key={sub.path}
                  to={sub.path}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isSubActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <sub.icon className="size-4 shrink-0 opacity-70" />
                  <span>{sub.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={item.path!}
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
}

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
          {filteredItems.map((item) => (
            <NavItemRenderer key={item.label} item={item} onClose={onClose} location={location} />
          ))}
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
