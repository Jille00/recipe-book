"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { signOut } from "@/lib/auth-client";
import {
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Separator,
  Skeleton,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { ThemeSegmentedControl, ThemeToggle, useMounted } from "./theme-toggle";
import { BrandMark } from "./brand-mark";
import {
  Home,
  UtensilsCrossed,
  Heart,
  Plus,
  User,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Search,
  Tags,
  FolderOpen,
  ShoppingBasket,
  Settings,
} from "lucide-react";

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Browse", href: "/browse", icon: Search },
  { name: "Categories", href: "/tags", icon: Tags },
  { name: "My recipes", href: "/recipes", auth: true, icon: UtensilsCrossed },
  { name: "Favorites", href: "/favorites", auth: true, icon: Heart },
];

// The signed-in menu (desktop dropdown and the mobile panel).
const accountLinks = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "New recipe", href: "/recipes/new", icon: Plus },
  { name: "Collections", href: "/collections", icon: FolderOpen },
  { name: "Shopping list", href: "/shopping-list", icon: ShoppingBasket },
  { name: "Profile", href: "/profile", icon: User },
  { name: "Account settings", href: "/settings", icon: Settings },
];

const MOBILE_MENU_ID = "mobile-navigation";

/**
 * A section stays highlighted on its sub-pages too, so /recipes/new still
 * shows "My recipes" as the current section. Home only matches itself.
 */
function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The subset of the session user the header actually renders. */
export interface HeaderUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface HeaderProps {
  /**
   * The session as resolved on the server. Every page already fetches it, so
   * passing it down avoids a flash of the signed-out header (and a nav missing
   * "My Recipes" / "Favorites") while the client session request is in flight.
   */
  initialUser?: HeaderUser | null;
}

export function Header({ initialUser }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  // Radix menus get useId-generated ids; see the account menu below.
  const mounted = useMounted();
  const { user: clientUser, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Close the panel whenever the route changes (a link was followed, Back was
  // pressed, a form redirected...). Adjusting state during render on a changed
  // value is React's recommended alternative to an effect for this.
  const [menuPathname, setMenuPathname] = useState(pathname);
  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    setMobileMenuOpen(false);
  }
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Trust the server value until the client session resolves; after that the
  // client is authoritative (so signing out updates the header immediately).
  const hasServerValue = initialUser !== undefined;
  const user: HeaderUser | null =
    isLoading && hasServerValue ? (initialUser ?? null) : clientUser;
  const sessionResolved = !isLoading || hasServerValue;
  const isAuthenticated = !!user;

  // Leave the page and drop the router cache: private server-rendered pages
  // (dashboard, favorites, profile with the email) would otherwise stay on
  // screen, and in Back navigation, after signing out.
  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  const closeMobileMenu = useCallback((returnFocus = false) => {
    setMobileMenuOpen(false);
    if (returnFocus) {
      menuButtonRef.current?.focus();
    }
  }, []);

  // Escape closes the panel and hands focus back to the trigger.
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileMenu(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen, closeMobileMenu]);

  // A tap or click outside the panel (and outside its toggle, which handles
  // itself) closes it.
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (mobileMenuRef.current?.contains(target)) return;
      if (menuButtonRef.current?.contains(target)) return;
      closeMobileMenu();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [mobileMenuOpen, closeMobileMenu]);

  // Move focus into the panel when it opens.
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const firstFocusable = mobileMenuRef.current?.querySelector<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
  }, [mobileMenuOpen]);

  const filteredNav = navigation.filter(
    (item) => !item.auth || isAuthenticated
  );

  const getInitials = (name: string | undefined | null) => {
    if (!name) return "K";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const accountTrigger = (
    <button
      type="button"
      aria-label={`Account menu${user?.name ? ` for ${user.name}` : ""}`}
      className="flex h-11 items-center gap-2 rounded-md px-1.5 transition-colors duration-150 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Avatar className="size-8">
        {/* Decorative: the name is spelled out right next to it. */}
        <AvatarImage src={user?.image || undefined} alt="" />
        <AvatarFallback className="bg-secondary text-xs font-medium text-secondary-foreground">
          {getInitials(user?.name)}
        </AvatarFallback>
      </Avatar>
      <span className="max-w-[100px] truncate text-sm font-medium text-foreground">
        {user?.name}
      </span>
      <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
    </button>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur-md backdrop-saturate-150 print:hidden">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
      >
        <BrandMark />

        {/* Desktop navigation. Active: delft text with a 2px delft underline. */}
        <div className="hidden md:flex md:items-center md:gap-1">
          {sessionResolved
            ? filteredNav.map((item) => {
                const isActive = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex h-11 items-center rounded-md px-3 text-sm font-medium decoration-2 underline-offset-[6px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      isActive
                        ? "text-primary underline decoration-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })
            : Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="mx-1 h-6 w-20 rounded-md" />
              ))}
        </div>

        {/* Desktop account */}
        <div className="hidden md:flex md:items-center md:gap-2">
          <ThemeToggle />
          {!sessionResolved ? (
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24 rounded-md" />
              <Skeleton className="size-9 rounded-full" />
            </div>
          ) : isAuthenticated ? (
            <div className="flex items-center gap-2">
              {/* Outline: a page's own main action keeps the orange. */}
              <Button asChild variant="outline" size="sm">
                <Link href="/recipes/new">
                  <Plus aria-hidden="true" />
                  New recipe
                </Link>
              </Button>

              {/* Before mount, the same button without the Radix menu, so
                  the generated trigger id never has to match the server. */}
              {!mounted ? (
                accountTrigger
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>{accountTrigger}</DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    {accountLinks.map((item) => (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link href={item.href} className="flex min-h-11 items-center gap-2">
                          <item.icon className="size-4 text-primary" aria-hidden="true" />
                          {item.name}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="min-h-11 text-destructive focus:text-destructive"
                    >
                      <LogOut className="size-4" aria-hidden="true" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="text-foreground">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/register">Sign up</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          ref={menuButtonRef}
          type="button"
          aria-label={mobileMenuOpen ? "Close main menu" : "Open main menu"}
          aria-expanded={mobileMenuOpen}
          aria-controls={MOBILE_MENU_ID}
          className="flex size-11 items-center justify-center rounded-md transition-colors duration-150 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? (
            <X className="size-5 text-foreground" aria-hidden="true" />
          ) : (
            <Menu className="size-5 text-foreground" aria-hidden="true" />
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div
          id={MOBILE_MENU_ID}
          ref={mobileMenuRef}
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-background md:hidden"
        >
          <nav aria-label="Mobile" className="space-y-1 px-4 py-3">
            {sessionResolved
              ? filteredNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActivePath(pathname, item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-md px-3 text-base font-medium transition-colors duration-150",
                        isActive
                          ? "bg-secondary text-secondary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                      onClick={() => closeMobileMenu()}
                    >
                      <Icon
                        className={cn("size-5", isActive ? "text-current" : "text-primary")}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  );
                })
              : Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-11 w-full rounded-md" />
                ))}
          </nav>

          <Separator />

          <ThemeSegmentedControl className="px-7 py-3" />

          <Separator />

          <div className="px-4 py-3">
            {!sessionResolved ? (
              <div className="space-y-2">
                <Skeleton className="h-11 w-full rounded-md" />
                <Skeleton className="h-11 w-full rounded-md" />
              </div>
            ) : isAuthenticated ? (
              <div className="space-y-1">
                <div className="flex items-center gap-3 px-3 py-2">
                  <Avatar className="size-10">
                    {/* Decorative: the name is spelled out right next to it. */}
                    <AvatarImage src={user?.image || undefined} alt="" />
                    <AvatarFallback className="bg-secondary font-medium text-secondary-foreground">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{user?.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>

                {accountLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
                    className="flex min-h-11 items-center gap-3 rounded-md px-3 text-base font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground aria-[current=page]:bg-secondary aria-[current=page]:text-secondary-foreground"
                    onClick={() => closeMobileMenu()}
                  >
                    <item.icon className="size-5 text-primary" aria-hidden="true" />
                    {item.name}
                  </Link>
                ))}

                <Separator className="my-2" />

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-base font-medium text-destructive transition-colors duration-150 hover:bg-destructive/10"
                >
                  <LogOut className="size-5" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/login" onClick={() => closeMobileMenu()}>
                    Sign in
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/register" onClick={() => closeMobileMenu()}>
                    Sign up
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
