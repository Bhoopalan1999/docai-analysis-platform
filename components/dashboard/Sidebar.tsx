'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, BarChart3, Settings, Upload, PanelLeft, PanelRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCollapseState } from '@/lib/hooks/useCollapseState';

const navigation = [
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, toggleCollapse] = useCollapseState('dashboard-sidebar-collapsed', false);

  return (
    <aside
      className={cn(
        'border-r bg-card/50 backdrop-blur-sm flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Header with Logo and Toggle */}
      <div className="p-4 border-b shrink-0 flex items-center justify-between gap-2">
        {!isCollapsed && (
          <Link
            href="/documents"
            className="flex items-center space-x-2 group flex-1"
          >
            <Logo />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent group-hover:from-primary/80 transition-all">
              DocAI
            </span>
          </Link>
        )}
        {isCollapsed && (
          <Link
            href="/documents"
            className="flex items-center justify-center group"
            title="DocAI"
          >
            <Logo />
          </Link>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapse}
          className="p-1.5 shrink-0 cursor-pointer"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto min-h-0">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          if (isCollapsed) {
            return (
              <TooltipProvider key={item.name}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center justify-center p-3 rounded-lg text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <Icon className={cn('h-5 w-5 transition-transform', isActive && 'scale-110')} />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.name}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5 transition-transform', isActive && 'scale-110')} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Upload Button */}
      <div className="p-4 border-t shrink-0">
        {isCollapsed ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="w-full shadow-sm hover:shadow-md transition-all duration-200 p-3"
                  asChild
                >
                  <Link href="/documents">
                    <Upload className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Upload Document</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button
            className="w-full shadow-sm hover:shadow-md transition-all duration-200"
            asChild
          >
            <Link href="/documents">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Link>
          </Button>
        )}
      </div>
    </aside>
  );
}
