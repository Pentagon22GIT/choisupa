"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

type PackageMenuProps = {
  onOpenChange?: (isOpen: boolean) => void;
};

const MENU_ITEMS = [
  { label: "コンセプト", number: "01" },
  { label: "ちょいスパについて", number: "02" },
  { label: "私たちについて", number: "03" },
  { label: "コンタクト", number: "04" },
] as const;

export function PackageMenu({ onOpenChange }: PackageMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const linkRefs = useRef<HTMLButtonElement[]>([]);

  const topBarRef = useRef<SVGLineElement | null>(null);
  const midBarRef = useRef<SVGLineElement | null>(null);
  const botBarRef = useRef<SVGLineElement | null>(null);

  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    const backdrop = backdropRef.current;
    const panel = panelRef.current;
    const topBar = topBarRef.current;
    const midBar = midBarRef.current;
    const botBar = botBarRef.current;
    const links = linkRefs.current;

    if (!overlay || !backdrop || !panel || !topBar || !midBar || !botBar) {
      return;
    }

    gsap.set(overlay, {
      pointerEvents: "none",
      visibility: "hidden",
    });
    gsap.set(backdrop, { opacity: 0 });
    gsap.set(panel, {
      autoAlpha: 0,
      y: -8,
      scale: 0.96,
      transformOrigin: "top right",
    });
    gsap.set(links, { opacity: 0, y: 6 });

    timelineRef.current = gsap
      .timeline({
        paused: true,
        defaults: {
          overwrite: "auto",
        },
        onStart: () => {
          gsap.set(overlay, {
            pointerEvents: "auto",
            visibility: "visible",
          });
        },
        onReverseComplete: () => {
          gsap.set(overlay, {
            pointerEvents: "none",
            visibility: "hidden",
          });
        },
      })
      .to(
        backdrop,
        {
          opacity: 1,
          duration: 0.28,
          ease: "power2.out",
        },
        0,
      )
      .to(
        panel,
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.54,
          ease: "back.out(1.55)",
        },
        0.08,
      )
      .to(
        midBar,
        {
          opacity: 0,
          duration: 0.14,
          ease: "power2.in",
        },
        0,
      )
      .to(
        topBar,
        {
          attr: {
            x1: 3,
            y1: 3,
            x2: 13,
            y2: 13,
          },
          duration: 0.28,
          ease: "power3.inOut",
        },
        0,
      )
      .to(
        botBar,
        {
          attr: {
            x1: 13,
            y1: 3,
            x2: 3,
            y2: 13,
          },
          duration: 0.28,
          ease: "power3.inOut",
        },
        0,
      )
      .to(
        links,
        {
          opacity: 1,
          y: 0,
          duration: 0.32,
          ease: "power2.out",
          stagger: 0.045,
        },
        0.18,
      );

    return () => {
      timelineRef.current?.kill();
      timelineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const timeline = timelineRef.current;

    if (!timeline) return;

    if (isOpen) {
      timeline.timeScale(1).play();
    } else {
      timeline.timeScale(1.25).reverse();
    }
  }, [isOpen]);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }

      if (event.key !== "Tab" || !isOpen) return;

      const focusable = linkRefs.current.filter(Boolean);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const toggleMenu = () => {
    setIsOpen((current) => !current);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <>
      <div
        ref={rootRef}
        className={["package-menu", isOpen ? "package-menu--open" : ""].join(
          " ",
        )}
      >
        <button
          ref={buttonRef}
          type="button"
          className="package-menu__button"
          aria-expanded={isOpen}
          aria-controls="package-menu-overlay"
          aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"}
          onClick={toggleMenu}
        >
          <span className="package-menu__icon-station" aria-hidden="true">
            <span className="package-menu__icon-wrap">
              <svg
                className="package-menu__icon"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <line
                  ref={topBarRef}
                  x1="2"
                  y1="5"
                  x2="14"
                  y2="5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  ref={midBarRef}
                  x1="2"
                  y1="8"
                  x2="14"
                  y2="8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  ref={botBarRef}
                  x1="2"
                  y1="11"
                  x2="14"
                  y2="11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </span>
        </button>
      </div>

      <div
        ref={overlayRef}
        id="package-menu-overlay"
        className="package-menu-overlay"
        aria-hidden={!isOpen}
      >
        <button
          type="button"
          ref={backdropRef}
          className="package-menu-overlay__backdrop"
          aria-label="メニューを閉じる"
          onClick={closeMenu}
          tabIndex={isOpen ? 0 : -1}
        />

        <div
          ref={panelRef}
          className="package-menu-panel"
          role="dialog"
          aria-modal="true"
          aria-label="ナビゲーションメニュー"
        >
          <nav className="package-menu-panel__nav">
            {MENU_ITEMS.map((item, index) => (
              <button
                key={item.label}
                ref={(element) => {
                  if (element) {
                    linkRefs.current[index] = element;
                  }
                }}
                type="button"
                className="package-menu-panel__link"
                tabIndex={isOpen ? 0 : -1}
              >
                <span>{item.label}</span>
                <span className="package-menu-panel__num">{item.number}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
