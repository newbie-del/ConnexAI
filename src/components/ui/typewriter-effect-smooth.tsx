// components/ui/typewriter-effect-smooth.tsx (Conceptual)
"use client";

import React, { useEffect, useState } from "react";

interface TypewriterEffectSmoothProps {
  words: { text: string; className?: string }[];
  className?: string;
  cursorClassName?: string;
}

export const TypewriterEffectSmooth = ({
  words,
  className,
  cursorClassName,
}: TypewriterEffectSmoothProps) => {
  const [displayedText, setDisplayedText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const typingSpeed = 150;
    const deletingSpeed = 100;
    const delayBetweenWords = 1000;

    let timeout: NodeJS.Timeout;

    const handleTyping = () => {
      const currentWord = words[wordIndex].text;

      if (isDeleting) {
        setDisplayedText(currentWord.substring(0, charIndex - 1));
        setCharIndex((prev) => prev - 1);
        if (charIndex === 0) {
          setIsDeleting(false);
          setWordIndex((prev) => (prev + 1) % words.length);
        }
      } else {
        setDisplayedText(currentWord.substring(0, charIndex + 1));
        setCharIndex((prev) => prev + 1);
        if (charIndex === currentWord.length) {
          setIsDeleting(true);
          timeout = setTimeout(() => {}, delayBetweenWords); // Pause at end of word
        }
      }
    };

    timeout = setTimeout(handleTyping, isDeleting ? deletingSpeed : typingSpeed);

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, wordIndex, words]);

  return (
    <div className={className}>
      {words.map((word, idx) => (
        <span key={idx} className={word.className}>
          {word.text}{" "}
        </span>
      ))}
      <span className={`inline-block bg-primary w-1 h-full animate-blink ${cursorClassName}`}></span>
    </div>
  );
};