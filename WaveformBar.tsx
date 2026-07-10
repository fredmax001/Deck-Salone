import { memo, useRef } from 'react';
import { motion } from 'framer-motion';

interface WaveformBarProps {
    delay: number;
    className?: string;
}

export const WaveformBar = memo(function WaveformBar({
    delay,
    className = 'w-[2px] bg-gold/10 rounded-full',
}: WaveformBarProps) {
    // Generate once per mount, never change
    const config = useRef({
        midHeight: 40 + Math.random() * 40,
        duration: 2 + Math.random() * 1,
    }).current;

    return (
        <motion.div
            className={className}
            initial={{ height: 20 }}
            animate={{ height: [20, config.midHeight, 20] }}
            transition={{
                duration: config.duration,
                delay,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
        />
    );
});