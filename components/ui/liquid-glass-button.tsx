"use client";

import { Download, ExternalLink } from "lucide-react";
import Link from "next/link";

interface LiquidGlassButtonProps {
  href?: string;
  download?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  icon?: "download" | "external";
  className?: string;
}

export function LiquidGlassButton({
  href,
  download = false,
  disabled = false,
  children,
  icon,
  className = "",
}: LiquidGlassButtonProps) {
  const Icon = icon === "download" ? Download : ExternalLink;
  const classes = `liquid-glass-button ${disabled ? "liquid-glass-button--disabled" : ""} ${className}`;

  if (disabled || !href) {
    return (
      <button type="button" className={classes} disabled aria-disabled="true">
        {children}
        {icon ? <Icon aria-hidden="true" size={16} strokeWidth={1.8} /> : null}
      </button>
    );
  }

  const content = (
    <>
      {children}
      {icon ? <Icon aria-hidden="true" size={16} strokeWidth={1.8} /> : null}
    </>
  );

  return href.startsWith("/") ? (
    <Link className={classes} href={href}>
      {content}
    </Link>
  ) : (
    <a className={classes} href={href} download={download || undefined}>
      {content}
    </a>
  );
}
