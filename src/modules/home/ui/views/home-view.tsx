"use client";

import { Button } from "@/components/ui/button";
import { SparklesIcon, VideoIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AnimatedBackground } from "@/components/animated-background";
import { TypewriterEffectSmooth } from "@/components/ui/typewriter-effect-smooth";
import Image from "next/image";
import Head from "next/head"; // ✅ added for dynamic tab title

export const HomeView = () => {
  const router = useRouter();

  const words = [
    { text: "Your" },
    { text: "AI-Powered" },
    { text: "Meetings," },
    { text: "Smarter." },
  ];

  const handleStartNewMeeting = () => {
    router.push("/meetings");
  };

  return (
    <>
      <Head>
        <title>Connex AI Home</title> {/* ✅ dynamic tab title */}
      </Head>

      <div className="relative flex flex-col items-center justify-center h-full w-full overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-black">
        <AnimatedBackground />

        <Image
          src="/logo1.png"
          alt="Connex.AI Logo"
          className="absolute inset-0 m-auto opacity-10 pointer-events-none select-none"
          width={600}
          height={600}
        />

        <motion.div
          className="absolute -top-40 -left-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"
        />
        <motion.div
          className="absolute -bottom-32 -right-40 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center space-y-6 p-10 md:p-16 bg-white/10 rounded-2xl shadow-2xl backdrop-blur-lg border border-white/20"
        >
          <TypewriterEffectSmooth
            words={words}
            className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-lg"
          />

          <p className="text-lg md:text-xl text-gray-200 animate-fade-in-up delay-200 max-w-xl mx-auto">
            Your AI agent actively helps during calls, summarizes, and provides insights.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-400">
            <Button
              size="lg"
              className="group relative overflow-hidden bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg hover:shadow-2xl transform hover:scale-110 transition-all duration-300 rounded-xl"
              onClick={handleStartNewMeeting}
            >
              <VideoIcon className="size-5 mr-2 group-hover:animate-pulse" />
              Start New Meeting
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="group relative overflow-hidden border-white/40 text-black hover:bg-white/20 hover:text-white transition-all duration-300 ease-out transform hover:scale-110 rounded-xl backdrop-blur-md"
              onClick={() => router.push("/agents")}
            >
              <SparklesIcon className="size-5 mr-2 group-hover:animate-spin-slow" />
              Explore Agents
            </Button>
          </div>
        </motion.div>
      </div>
    </>
  );
};
