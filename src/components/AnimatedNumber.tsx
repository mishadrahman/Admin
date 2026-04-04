import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform, animate } from 'motion/react';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ 
  value, 
  prefix = '', 
  suffix = '', 
  decimals = 0 
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(displayValue, value, {
      duration: 1.5,
      ease: "easeOut",
      onUpdate: (latest) => setDisplayValue(latest)
    });

    return () => controls.stop();
  }, [value]);

  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {prefix}
      {displayValue.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </motion.span>
  );
};
