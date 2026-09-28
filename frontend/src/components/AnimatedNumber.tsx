import React, { useEffect, useRef, useState } from 'react';

// Animates a number from 0 to target on mount
interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, duration = 800, decimals = 0 }) => {
  const [display, setDisplay] = useState(0);
  const start = useRef(performance.now());
  const raf = useRef<number>();

  useEffect(() => {
    start.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * value);
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, duration]);

  return <>{decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString('en-IN')}</>;
};
