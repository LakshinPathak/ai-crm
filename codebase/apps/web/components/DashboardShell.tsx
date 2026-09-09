'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  ChevronsUpDown,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from 'cn';

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
  'data-[active=true]:bg-sidebar-primary/10 data-[active=true]:text-sidebar-primary data-[active=true]:[&>svg]:text-sidebar-primary';

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip={label}
              className="border border-sidebar-border/80 bg-sidebar-accent/30 hover:bg-sidebar-accent/50 data-[state=open]:bg-sidebar-accent/50"
            >
              <Avatar size="sm" className="rounded-md after:rounded-md">
                <AvatarFallback className="rounded-md bg-sidebar-primary text-sidebar-primary-foreground text-[10px] font-semibold">
                  {initials(label)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{label}</span>
                <span className="truncate text-xs text-muted-foreground">Workspace</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Workspace
            </DropdownMenuLabel>
            <DropdownMenuItem className="gap-2 p-2" disabled>
              <Avatar size="sm" className="rounded-md after:rounded-md">
                <AvatarFallback className="rounded-md bg-sidebar-primary text-sidebar-primary-foreground text-[10px] font-semibold">
                  {initials(label)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate font-medium">{label}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
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
                <AvatarFallback className="bg-sidebar-primary/15 text-sidebar-primary text-xs font-semibold">
                  {initials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
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
                  <AvatarFallback className="bg-sidebar-primary/15 text-sidebar-primary text-xs font-semibold">
                    {initials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs capitalize text-muted-foreground">
                    {role}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
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
        <Sidebar collapsible="icon" className="border-sidebar-border/80">
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
                                        className="ml-auto h-5 min-w-5 justify-center rounded-full bg-sidebar-primary px-1.5 text-[10px] text-sidebar-primary-foreground"
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
                <SidebarMenuButton tooltip="Help">
                  <HelpCircle />
                  <span>Help</span>
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

        <SidebarInset className="bg-[var(--bg)] bg-[image:var(--bg-mesh)]">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/60 bg-background/70 px-4 backdrop-blur-sm md:hidden">
            <SidebarTrigger className="-ml-1" />
            <BrandLogo href="/home" size="sm" />
          </header>
          <header className="hidden h-12 shrink-0 items-center gap-2 border-b border-border/40 bg-background/50 px-4 backdrop-blur-sm md:flex">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
            <Separator orientation="vertical" className="mr-1 h-4" />
            <span className="text-sm font-medium text-muted-foreground">
              {workspaceName}
            </span>
          </header>
          <div className="page-content">{children}</div>
        </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  );
}
