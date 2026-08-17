import type { ReactNode } from "react";

export function BrandMark({ dark = false }: { dark?: boolean }) {
  return (
    <span className={`brand-mark ${dark ? "brand-mark-dark" : ""}`}>
      <img src="/favicon.png" alt="" />
      <span>Deaf Shark Coffee</span>
    </span>
  );
}

export function CustomerHeader({ active, action }: { active?: string; action?: ReactNode }) {
  const links = [
    ["/menu", "Menu"],
    ["/orders", "My Orders"],
    ["/about", "About"],
    ["/contact", "Contact"],
  ];

  return (
    <>
      <header className="site-header">
        <a href="/" aria-label="Deaf Shark Coffee home"><BrandMark /></a>
        <nav aria-label="Primary navigation">
          {links.map(([href, label]) => <a key={href} href={href} className={active === href ? "active" : ""}>{label}</a>)}
        </nav>
        <div className="header-action">{action ?? <a className="header-order-link" href="/menu">Order pickup</a>}</div>
      </header>
      <nav className="mobile-site-nav" aria-label="Mobile navigation">
        {links.map(([href, label]) => <a key={href} href={href} className={active === href ? "active" : ""}>{label}</a>)}
      </nav>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <BrandMark dark />
      <p>Premium Coffee Beans · Roasted in Union, NJ</p>
      <div className="footer-links">
        <a href="/menu">Menu</a>
        <a href="/orders">My Orders</a>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
      </div>
      <a href="/dashboard">Open demo dashboard</a>
    </footer>
  );
}
