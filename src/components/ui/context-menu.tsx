"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "~/lib/utils";

export interface ContextMenuOption {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

interface ContextMenuProps {
  options: ContextMenuOption[];
  x: number;
  y: number;
  onClose: () => void;
}

export function ContextMenu({ options, x, y, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("scroll", handleScroll);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("scroll", handleScroll);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="bg-popover text-popover-foreground fixed z-50 overflow-hidden rounded-md border p-1 shadow-md"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      {options.map((option, index) => (
        <button
          key={index}
          className={cn(
            "hover:bg-accent focus:bg-accent relative flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm transition-colors outline-none select-none disabled:pointer-events-none disabled:opacity-50",
            option.className,
          )}
          onClick={() => {
            if (!option.disabled) {
              option.onClick();
              onClose();
            }
          }}
          disabled={option.disabled}
        >
          <span className="mr-2 h-4 w-4">{option.icon}</span>
          {option.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
