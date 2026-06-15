'use client';

import { Button } from '@/components/ui/button';
import { VideoIcon, SparklesIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section
      className={`relative h-screen flex items-center justify-center overflow-hidden 
                  bg-gradient-to-br from-sidebar-background via-sidebar-accent to-sidebar-background 
                  transition-opacity duration-1000 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Animated Background Orbs/Nodes (SVG images) */}
      <div className="absolute inset-0 z-0 opacity-20 animate-pulse-slow">
        <Image
          src="/ai-orb.svg"
          alt="AI Orb 1"
          width={100}
          height={100}
          className="absolute top-1/4 left-1/4 animate-float-1"
        />
        <Image
          src="/ai-orb.svg"
          alt="AI Orb 2"
          width={120}
          height={120}
          className="absolute bottom-1/3 right-1/3 animate-float-2"
        />
        <Image
          src="/ai-orb.svg"
          alt="AI Orb 3"
          width={80}
          height={80}
          className="absolute top-1/2 right-1/4 animate-float-3"
        />
      </div>

      <div className="relative z-10 text-center text-white p-8 max-w-4xl bg-white/10 rounded-lg shadow-2xl backdrop-blur-sm animate-fade-in-up">
        {/* Central AI Agent Hologram */}
        <div className="mb-8 animate-pulse-gentle">
          <Image
            src="/ai-hologram.png"
            alt="AI Agent Hologram"
            width={200}
            height={200}
            className="mx-auto"
          />
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 leading-tight animate-text-shimmer">
          Your AI-Powered Meetings, Smarter.
        </h1>
        <p className="text-lg md:text-xl mb-8 text-gray-200 animate-fade-in-up delay-200">
          Your AI agent actively helps during calls, summarizes, and provides insights.
        </p>

        <div className="flex flex-col md:flex-row justify-center gap-4 animate-fade-in-up delay-400">
          <Button asChild className="px-8 py-6 text-lg bg-primary hover:bg-primary/90 transition-all duration-300 transform hover:scale-105">
            <Link href="/meetings">
              <VideoIcon className="mr-2 h-5 w-5" /> Start New Meeting
            </Link>
          </Button>
          <Button asChild variant="outline" className="px-8 py-6 text-lg border-white text-white hover:bg-white hover:text-sidebar-background transition-all duration-300 transform hover:scale-105">
            <Link href="/agents">
              <SparklesIcon className="mr-2 h-5 w-5" /> Explore Agents
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

// Add these custom animations to your global.css or a dedicated CSS file
// @keyframes pulse-slow {
//   0%, 100% { opacity: 0.2; transform: scale(1); }
//   50% { opacity: 0.3; transform: scale(1.05); }
// }
// @keyframes float-1 {
//   0%, 100% { transform: translateY(0) translateX(0); }
//   33% { transform: translateY(-10px) translateX(10px); }
//   66% { transform: translateY(10px) translateX(-10px); }
// }
// @keyframes float-2 {
//   0%, 100% { transform: translateY(0) translateX(0); }
//   33% { transform: translateY(10px) translateX(-10px); }
//   66% { transform: translateY(-10px) translateX(10px); }
// }
// @keyframes float-3 {
//   0%, 100% { transform: translateY(0) translateX(0); }
//   33% { transform: translateY(-15px) translateX(-5px); }
//   66% { transform: translateY(5px) translateX(15px); }
// }
// @keyframes fade-in-up {
//   0% { opacity: 0; transform: translateY(20px); }
//   100% { opacity: 1; transform: translateY(0); }
// }
// @keyframes text-shimmer {
//   0% { background-position: -200% 0; }
//   100% { background-position: 200% 0; }
// }
// .animate-text-shimmer {
//   background: linear-gradient(90deg, #fff 0%, #aaa 50%, #fff 100%);
//   background-size: 200% 100%;
//   -webkit-background-clip: text;
//   -webkit-text-fill-color: transparent;
//   animation: text-shimmer 3s infinite linear;
// }
// @keyframes pulse-gentle {
//   0%, 100% { transform: scale(1); }
//   50% { transform: scale(1.02); }
// }