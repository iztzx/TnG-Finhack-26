import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

export default function TriggerButton({ onClick, disabled = false }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-64 h-64 rounded-full flex flex-col items-center justify-center gap-4
        text-white font-bold text-lg tracking-wide uppercase
        transition-colors
        ${disabled
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-tng-blue hover:bg-tng-blue-dark cursor-pointer shadow-2xl'
        }
      `}
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
    >
      {!disabled && (
        <motion.div
          className="absolute inset-0 rounded-full bg-tng-blue/30"
          animate={{
            scale: [1, 1.3, 1.3],
            opacity: [0.6, 0, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      )}

      <motion.div
        className="absolute inset-0 rounded-full bg-tng-blue/20"
        animate={disabled ? {} : {
          scale: [1, 1.5, 1.5],
          opacity: [0.4, 0, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeOut',
          delay: 0.5,
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-3">
        <Zap className="w-10 h-10" />
        <span className="text-center leading-tight px-4">
          Activate<br />Credit Assessment
        </span>
      </div>
    </motion.button>
  );
}
