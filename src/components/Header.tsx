"use client";

import { usePathname } from "next/navigation";
import { SiteNavigationLink } from "@/components/SiteNavigationLink";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useUI } from "@/contexts/UIContext";
import { SiteHeader } from "../../shared/site/Header";

export function Header() {
  const { isAuthenticated, user, isAdmin, logout } = useAuth();
  const { totalItems, setIsCartOpen } = useCart();
  const { openLoginModal } = useUI();
  return <SiteHeader linkComponent={SiteNavigationLink} pathname={usePathname() || "/"} isAuthenticated={isAuthenticated}
    user={user} isAdmin={isAdmin} logout={logout} totalItems={totalItems}
    onCart={() => setIsCartOpen(true)} onLogin={openLoginModal} />;
}
