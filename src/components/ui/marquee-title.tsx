'use client';

import { useEffect, useRef, useState } from 'react';

type MarqueeTitleProps = {
  text: string;
  className?: string;
};

export function MarqueeTitle({ text, className }: MarqueeTitleProps) {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const measureOverflow = () => {
      const container = containerRef.current;
      const title = textRef.current;

      if (!container || !title) {
        return;
      }

      setIsOverflowing(title.scrollWidth > container.clientWidth + 1);
    };

    measureOverflow();

    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      measureOverflow();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [text]);

  return (
    <span
      ref={containerRef}
      className={`title-marquee block w-full overflow-hidden whitespace-nowrap ${isOverflowing ? 'title-marquee--overflowing' : ''} ${className ?? ''}`.trim()}
      title={text}
    >
      <span className="title-marquee__track">
        <span ref={textRef} className="title-marquee__copy">
          {text}
        </span>
        {isOverflowing ? (
          <span aria-hidden="true" className="title-marquee__copy">
            <span className="title-marquee__gap">•</span>
            {text}
          </span>
        ) : null}
      </span>
    </span>
  );
}
