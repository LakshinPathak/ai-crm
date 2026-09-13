'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Fragment, useEffect, useState } from 'react';
import {
  Home,
  LayoutGrid,
  Building2,
  FolderKanban,
  Phone,
  ClipboardList,
  Bot,
  BarChart3,
  Plug,
  Settings,
  HelpCircle,
  ChevronDown,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { getToken, logout } from '@/lib/auth';
import { apiGet } from '@/lib/api-client';
import type { MeResponse } from '@/lib/types';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { initials } from '@/lib/format';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const SEGMENT_LABELS: Record<string, string> = {
  home: 'Home',
  deals: 'Deals',
  accounts: 'Accounts',
  projects: 'Projects',
  calls: 'Calls',
  requests: 'Requests',
  agents: 'Agents',
  approvals: 'Approvals',
  insights: 'Insights',
  settings: 'Settings',
  integrations: 'Integrations',
  members: 'Members',
  mcp: 'MCP',
  sql: 'SQL',
  new: 'New',
  'sales-process': 'Sales process',
};

function formatPathSegment(segment: string) {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  if (/^[a-f0-9]{24}$/i.test(segment) || /^[0-9a-f-]{36}$/i.test(segment)) {
    return 'Details';
  }
  return decodeURIComponent(segment)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function PathBreadcrumbs({ pathname }: { pathname: string }) {
  const raw = pathname.split('/').filter(Boolean);
  const crumbs =
    raw.length === 0
      ? [{ href: '/home', label: 'Home', current: true }]
      : raw.map((segment, index) => {
          const href = `/${raw.slice(0, index + 1).join('/')}`;
          return {
            href,
            label: formatPathSegment(segment),
            current: index === raw.length - 1,
          };
        });

  const withHome =
    crumbs[0]?.href === '/home'
      ? crumbs
      : [{ href: '/home', label: 'Home', current: false }, ...crumbs];

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {withHome.map((crumb, index) => (
          <Fragment key={`${crumb.href}-${index}`}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.current ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

const MAIN_NAV = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/deals', label: 'Deals', icon: LayoutGrid },
  { href: '/accounts', label: 'Accounts', icon: Building2 },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/calls', label: 'Calls', icon: Phone },
  { href: '/requests', label: 'Requests', icon: ClipboardList },
] as const;

const AGENT_NAV = [
  { href: '/agents', label: 'Dashboard' },
  { href: '/approvals', label: 'Approvals' },
] as const;

const navButtonClass =
  'text-foreground hover:text-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-foreground data-[active=true]:[&>svg]:text-foreground';

function SidebarBrand() {
  const { state } = useSidebar();

  return (
    <div className="flex items-center gap-2 px-1 py-0.5">
      <BrandLogo href="/home" size="sm" showText={state === 'expanded'} />
    </div>
  );
}

function WorkspaceSwitcher({ workspaceName }: { workspaceName: string }) {
  const label = workspaceName || 'My Workspace';

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          tooltip={label}
          className="pointer-events-none border border-sidebar-border/80 bg-sidebar-accent/30"
        >
          <Avatar size="sm" className="rounded-md after:rounded-md">
            <AvatarFallback className="rounded-md bg-sidebar-primary text-primary-foreground text-[10px] font-semibold">
              {initials(label)}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium text-foreground">{label}</span>
            <span className="truncate text-xs text-muted-foreground">Workspace</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function ThemeMenu() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Sun className="dark:hidden" />
        <Moon className="hidden dark:block" />
        Theme
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup value={theme ?? 'light'} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon />
            Dark
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

function UserMenu({
  me,
  onSignOut,
}: {
  me: MeResponse;
  onSignOut: () => void;
}) {
  const displayName = me.user.displayName;
  const role = me.user.role;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip={displayName}
              className="border border-transparent hover:border-sidebar-border/80 data-[state=open]:border-sidebar-border/80 data-[state=open]:bg-sidebar-accent/50"
            >
              <Avatar size="sm">
                <AvatarFallback className="bg-sidebar-primary text-primary-foreground text-xs font-semibold">
                  {initials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium text-foreground">{displayName}</span>
                <span className="truncate text-xs capitalize text-muted-foreground">
                  {role}
                </span>
              </div>
              <ChevronDown className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="end"
            side="top"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar size="sm">
                  <AvatarFallback className="bg-sidebar-primary text-primary-foreground text-xs font-semibold">
                    {initials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-medium text-foreground">{displayName}</span>
                  <span className="truncate text-xs capitalize text-muted-foreground">
                    {role}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings />
                Settings
              </Link>
            </DropdownMenuItem>
            <ThemeMenu />
            <DropdownMenuItem asChild>
              <Link href="/why">
                <HelpCircle />
                Help
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onSignOut}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [approvalCount, setApprovalCount] = useState(0);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiGet<MeResponse>('/me', token).then(setMe).catch(() => {});
    apiGet<{ approvalCount: number }>('/home', token)
      .then((h) => setApprovalCount(h.approvalCount))
      .catch(() => {});
  }, []);

  async function signOut() {
    await logout();
    router.push('/sign-in');
  }

  const agentsOpen =
    pathname.startsWith('/agents') || pathname.startsWith('/approvals');
  const workspaceName = me?.workspace?.name ?? 'My Workspace';

  return (
    <SidebarProvider defaultOpen>
      <TooltipProvider delayDuration={0}>
        <Sidebar collapsible="icon" className="border-border bg-sidebar text-foreground">
          <SidebarHeader className="gap-3 border-b border-sidebar-border/60 pb-3">
            <SidebarBrand />
            <WorkspaceSwitcher workspaceName={workspaceName} />
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {MAIN_NAV.map((item) => {
                    const active = pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.label}
                          className={navButtonClass}
                        >
                          <Link href={item.href}>
                            <Icon />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator className="my-1" />

            <SidebarGroup>
              <SidebarGroupLabel>Agents</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith('/agents')}
                      tooltip="Agents"
                      className={navButtonClass}
                    >
                      <Link href="/agents">
                        <Bot />
                        <span>Agents</span>
                      </Link>
                    </SidebarMenuButton>
                    {approvalCount > 0 && (
                      <SidebarMenuBadge className="bg-sidebar-primary text-primary-foreground peer-hover/menu-button:text-primary-foreground peer-data-active/menu-button:text-primary-foreground group-data-[collapsible=icon]:flex">
                        {approvalCount}
                      </SidebarMenuBadge>
                    )}
                    {agentsOpen && (
                      <SidebarMenuSub>
                        {AGENT_NAV.map((item) => {
                          const active = pathname === item.href;
                          return (
                            <SidebarMenuSubItem key={item.href}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={active}
                                className={cn(
                                  navButtonClass,
                                  'data-[active=true]:font-medium',
                                )}
                              >
                                <Link href={item.href}>
                                  <span>{item.label}</span>
                                  {item.href === '/approvals' &&
                                    approvalCount > 0 && (
                                      <Badge
                                        variant="default"
                                        className="ml-auto h-5 min-w-5 justify-center rounded-full bg-sidebar-primary px-1.5 text-[10px] text-primary-foreground hover:text-primary-foreground"
                                      >
                                        {approvalCount}
                                      </Badge>
                                    )}
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator className="my-1" />

            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith('/insights')}
                      tooltip="Insights"
                      className={navButtonClass}
                    >
                      <Link href="/insights">
                        <BarChart3 />
                        <span>Insights</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border/60 pt-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith('/settings')}
                  tooltip="Integrations"
                  className={navButtonClass}
                >
                  <Link href="/settings/integrations">
                    <Plug />
                    <span>Integrations</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/settings'}
                  tooltip="Settings"
                  className={navButtonClass}
                >
                  <Link href="/settings">
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Help" className={navButtonClass}>
                  <Link href="/why">
                    <HelpCircle />
                    <span>Help</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            {me && (
              <>
                <Separator className="my-2 bg-sidebar-border/80" />
                <UserMenu me={me} onSignOut={signOut} />
              </>
            )}
          </SidebarFooter>

          <SidebarRail />
        </Sidebar>

        <SidebarInset className="min-w-0 overflow-x-hidden bg-background text-foreground">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background/70 px-4 backdrop-blur-sm md:hidden">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 h-4" />
            <PathBreadcrumbs pathname={pathname} />
          </header>
          <header className="hidden h-12 shrink-0 items-center gap-2 border-b border-border bg-background/50 px-4 backdrop-blur-sm md:flex">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
            <Separator orientation="vertical" className="mr-1 h-4" />
            <PathBreadcrumbs pathname={pathname} />
          </header>
          <div className="page-content min-w-0">{children}</div>
        </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  );
}
