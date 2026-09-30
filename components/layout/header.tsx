"use client";

import Link from "next/link";
import Image from "next/image";
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
import { ThemeSegmentedControl, ThemeToggle } from "./theme-toggle";
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
} from "lucide-react";

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Browse", href: "/browse", icon: Search },
  { name: "My Recipes", href: "/recipes", auth: true, icon: UtensilsCrossed },
  { name: "Favorites", href: "/favorites", auth: true, icon: Heart },
];

const MOBILE_MENU_ID = "mobile-navigation";

/**
 * A section stays highlighted on its sub-pages too, so /recipes/new still
 * shows "My Recipes" as the current section. Home only matches itself.
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
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border glass print:hidden">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <nav
        aria-label="Main"
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center group">
          <Image
            src="/logo.png"
            alt="Kookboek"
            width={96}
            height={96}
            className="h-12 w-auto transition-transform group-hover:scale-105"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:gap-1">
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
                      "relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.name}
                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-primary" />
                    )}
                  </Link>
                );
              })
            : Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="mx-1 h-9 w-24 rounded-lg" />
              ))}
        </div>

        {/* Desktop Auth */}
        <div className="hidden md:flex md:items-center md:gap-3">
          <ThemeToggle />
          {!sessionResolved ? (
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          ) : isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Button asChild size="sm" className="gap-2">
                <Link href="/recipes/new">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  New Recipe
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Account menu${user?.name ? ` for ${user.name}` : ""}`}
                    className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-accent"
                  >
                    <Avatar className="h-8 w-8">
                      {/* Decorative: the name is spelled out right next to it. */}
                      <AvatarImage src={user?.image || undefined} alt="" />
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-medium">
                        {getInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground max-w-[100px] truncate">
                      {user?.name}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/recipes/new" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      New Recipe
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2">
                      <User className="h-4 w-4" aria-hidden="true" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="text-foreground">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Sign Up</Link>
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
          className="md:hidden flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-accent"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5 text-foreground" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5 text-foreground" aria-hidden="true" />
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div
          id={MOBILE_MENU_ID}
          ref={mobileMenuRef}
          className="md:hidden border-t border-border bg-background"
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
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                      onClick={() => closeMobileMenu()}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                      {item.name}
                    </Link>
                  );
                })
              : Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-11 w-full rounded-lg" />
                ))}
          </nav>

          <Separator />

          <ThemeSegmentedControl className="px-7 py-3" />

          <Separator />

          <div className="px-4 py-3">
            {!sessionResolved ? (
              <div className="space-y-2">
                <Skeleton className="h-11 w-full rounded-lg" />
                <Skeleton className="h-11 w-full rounded-lg" />
              </div>
            ) : isAuthenticated ? (
              <div className="space-y-1">
                <div className="flex items-center gap-3 px-3 py-2">
                  <Avatar className="h-10 w-10">
                    {/* Decorative: the name is spelled out right next to it. */}
                    <AvatarImage src={user?.image || undefined} alt="" />
                    <AvatarFallback className="bg-secondary text-secondary-foreground font-medium">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{user?.name}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>

                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => closeMobileMenu()}
                >
                  <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
                  Dashboard
                </Link>
                <Link
                  href="/recipes/new"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => closeMobileMenu()}
                >
                  <Plus className="h-5 w-5" aria-hidden="true" />
                  New Recipe
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => closeMobileMenu()}
                >
                  <User className="h-5 w-5" aria-hidden="true" />
                  Profile
                </Link>

                <Separator className="my-2" />

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-5 w-5" aria-hidden="true" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button asChild variant="outline" className="h-11 flex-1">
                  <Link href="/login" onClick={() => closeMobileMenu()}>
                    Sign In
                  </Link>
                </Button>
                <Button asChild className="h-11 flex-1">
                  <Link href="/register" onClick={() => closeMobileMenu()}>
                    Sign Up
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
