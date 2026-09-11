import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

/**
 * Wraps children in a 3D perspective reveal — elements "fall forward"
 * from rotateX(22deg) to 0 as they scroll into view.
 * Classic, minimal, satisfying.
 */
export default function Reveal3D({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null!);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'start 0.52'],
  });

  const rotateX = useTransform(scrollYProgress, [0, 1], [22, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.4], [0, 1]);
  const y       = useTransform(scrollYProgress, [0, 1], [32, 0]);

  return (
    <div ref={ref} style={{ perspective: '1100px' }} className={className}>
      <motion.div style={{ rotateX, opacity, y, transformOrigin: 'top center' }}>
        {children}
      </motion.div>
    </div>
  );
}
