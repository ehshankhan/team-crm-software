'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard,
  Users,
  Clock,
  FileText,
  FolderKanban,
  Package,
  LogOut,
  ClipboardList,
  ShoppingCart
} from 'lucide-react';

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Users', href: '/dashboard/users', icon: Users },
  { name: 'Attendance', href: '/dashboard/attendance', icon: Clock },
  { name: 'Timesheets', href: '/dashboard/timesheets', icon: FileText },
  { name: 'Daily Tracker', href: '/dashboard/daily-log', icon: ClipboardList },
  { name: 'Projects', href: '/dashboard/projects', icon: FolderKanban },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Package },
  { name: 'Procurement', href: '/dashboard/procurement', icon: ShoppingCart },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const canAccessRoute = (route: typeof navigationItems[0]) => {
    if (!route.roles) return true;
    return route.roles.includes(user?.role?.name || '');
  };

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex-1 flex flex-col min-h-0 bg-gray-800">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-xl font-bold text-white">IndoSense LMS</h1>
          </div>
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {navigationItems.map((item) => {
              if (!canAccessRoute(item)) return null;

              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center px-2 py-2 text-sm font-medium rounded-md
                    ${isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }
                  `}
                >
                  <Icon className="mr-3 h-6 w-6" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex-shrink-0 flex bg-gray-700 p-4">
          <div className="flex items-center w-full">
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{user?.full_name}</p>
              <p className="text-xs text-gray-300">{user?.role?.name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="ml-3 text-gray-300 hover:text-white"
              title="Logout"
            >
              <LogOut className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
