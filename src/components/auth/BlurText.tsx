"use client";

import { motion } from "framer-motion";

interface BlurTextProps {
  text: string;
  delay?: number;
  className?: string;
}

export default function BlurText({ text, delay = 0, className = "" }: BlurTextProps) {
  const words = text.split(" ");

  return (
    <span className={`block ${className}`}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block will-change-[filter,transform,opacity]"
          initial={{ filter: "blur(4px)", opacity: 0.5, y: 6 }}
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: delay + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
        >
          {word}
          {i < words.length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </span>
  );
}
