import { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useMotionValue, useTransform, animate } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function CreditAnimation({ targetAmount = 50000, onComplete, onFallback }) {
  const [showCheck, setShowCheck] = useState(false);
  const [latency, setLatency] = useState(null);
  const [done, setDone] = useState(false);
  const startTimeRef = useRef(null);
  const fallbackTriggeredRef = useRef(false);

  const count = useMotionValue(0);
  const springValue = useSpring(count, { stiffness: 50, damping: 20 });
  const displayValue = useTransform(springValue, (v) => `RM ${Math.round(v).toLocaleString()}`);

  useEffect(() => {
    startTimeRef.current = performance.now();

    const controls = animate(count, targetAmount, {
      duration: 2,
      ease: 'easeOut',
      onComplete: () => {
        const elapsed = Math.round(performance.now() - startTimeRef.current);
        setLatency(elapsed);
        setShowCheck(true);
        setDone(true);
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#005ABB', '#F5A623', '#22c55e', '#ffffff'],
        });
        if (onComplete) onComplete(elapsed);
      },
    });

    const fallbackTimer = setTimeout(() => {
      if (!done && !fallbackTriggeredRef.current) {
        fallbackTriggeredRef.current = true;
        if (onFallback) onFallback();
      }
    }, 2500);

    return () => {
      controls.stop();
      clearTimeout(fallbackTimer);
    };
  }, [targetAmount, count, onComplete, onFallback, done]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <motion.div
          className="text-6xl md:text-7xl font-extrabold text-tng-blue tabular-nums"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {displayValue}
        </motion.div>
      </div>

      {showCheck && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="flex items-center gap-2 text-risk-low"
        >
          <CheckCircle className="w-8 h-8" />
          <span className="text-xl font-semibold">Credit Approved</span>
        </motion.div>
      )}

      {latency !== null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-2 bg-tng-gold/10 border border-tng-gold/30 rounded-full"
        >
          <span className="text-sm font-medium text-tng-gold">
            Processed in {latency}ms
          </span>
        </motion.div>
      )}
    </div>
  );
}
