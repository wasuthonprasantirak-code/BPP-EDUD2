import React, { useRef, useLayoutEffect } from "react";

interface AutoFitSingleLineTextProps {
  children: React.ReactNode;
  maxFontSize?: number;
  tabletMaxFontSize?: number;
  minFontSize?: number;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
  as?: "p" | "span" | "div" | "h2" | "h3";
}

export function AutoFitSingleLineText({
  children,
  maxFontSize = 13,
  tabletMaxFontSize = 12,
  minFontSize = 7,
  className = "",
  title,
  style = {},
  as = "p"
}: AutoFitSingleLineTextProps) {
  const elementRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    let lastParentWidth = 0;
    let rafId: number | null = null;

    const adjustFontSize = () => {
      if (!el) return;
      const parent = el.parentElement;
      const parentWidth = parent ? parent.clientWidth : el.clientWidth;
      
      // Ignore micro-adjustments (< 4px) to prevent layout loops
      if (Math.abs(parentWidth - lastParentWidth) < 4 && lastParentWidth > 0) {
        return;
      }
      lastParentWidth = parentWidth;

      // Automatically use 12px max in tablet mode (640px to 1023px)
      const width = typeof window !== "undefined" ? window.innerWidth : 1024;
      const isTablet = width >= 640 && width < 1024;
      const startingMax = isTablet ? tabletMaxFontSize : maxFontSize;

      let currentSize = startingMax;
      el.style.fontSize = `${currentSize}px`;
      el.style.whiteSpace = "nowrap";

      let maxIterations = 20;
      while (el.scrollWidth > el.clientWidth && currentSize > minFontSize && maxIterations > 0) {
        currentSize -= 0.5;
        el.style.fontSize = `${currentSize}px`;
        maxIterations--;
      }
    };

    const scheduleAdjust = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        adjustFontSize();
      });
    };

    scheduleAdjust();

    // NEVER observe `el` directly as adjusting font size mutates `el` dimensions, causing infinite loop
    let observer: ResizeObserver | null = null;
    if (el.parentElement && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(scheduleAdjust);
      observer.observe(el.parentElement);
    }

    window.addEventListener("resize", scheduleAdjust, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (observer) observer.disconnect();
      window.removeEventListener("resize", scheduleAdjust);
    };
  }, [children, maxFontSize, tabletMaxFontSize, minFontSize]);

  const Tag = as as any;

  return (
    <Tag
      ref={elementRef}
      className={`whitespace-nowrap overflow-hidden text-ellipsis w-full block ${className}`}
      style={{
        ...style,
        fontSize: `${maxFontSize}px`
      }}
      title={title || (typeof children === "string" ? children : undefined)}
    >
      {children}
    </Tag>
  );
}
