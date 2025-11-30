'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { FileText, BarChart3, Settings, Upload, PanelLeft } from 'lucide-react';
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
  const [enableTransitions, setEnableTransitions] = useState(false);

  // Enable transitions after mount to prevent flash during hot reload
  // useLayoutEffect in the hook already sets the correct state before paint,
  // but we delay enabling transitions slightly to ensure smooth rendering
  useEffect(() => {
    // Small delay to ensure state is set before enabling transitions
    const timer = setTimeout(() => {
      setEnableTransitions(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <aside
      className={cn(
        'border-r bg-card/50 backdrop-blur-sm flex flex-col h-screen sticky top-0',
        // Only enable transitions after mount to prevent flash during hot reload
        enableTransitions && 'transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Header with Logo and Toggle */}
      <div
        className={cn(
          'border-b shrink-0 flex items-center transition-all duration-300',
          isCollapsed ? 'p-4 justify-center' : 'p-4 justify-between gap-2'
        )}
      >
        {isCollapsed ? (
          // Collapsed: PanelLeft icon replaces logo (same size as logo)
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className="p-2 h-auto w-auto cursor-pointer hover:bg-accent transition-colors"
            title="Expand sidebar"
          >
            <PanelLeft className="h-8 w-8 text-foreground" />
          </Button>
        ) : (
          // Expanded: Logo + text + PanelLeft toggle button
          <>
            <Link
              href="/documents"
              className="flex items-center space-x-2 group flex-1 min-w-0"
            >
              <Logo className="h-8 w-8 shrink-0" />
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent group-hover:from-primary/80 transition-all whitespace-nowrap">
                DocAI
              </span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="p-2 h-auto w-auto shrink-0 cursor-pointer hover:bg-accent transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeft className="h-5 w-5 text-muted-foreground" />
            </Button>
          </>
        )}
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
