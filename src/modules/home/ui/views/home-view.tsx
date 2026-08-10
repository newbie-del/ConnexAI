"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRightIcon,
  BotIcon,
  FileTextIcon,
  LockIcon,
  MaximizeIcon,
  MessageSquareIcon,
  MicIcon,
  MonitorUpIcon,
  MoreHorizontalIcon,
  PhoneIcon,
  SendIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserPlusIcon,
  VideoIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const highlights = [
  { icon: VideoIcon, label: "HD Video Calls" },
  { icon: BotIcon, label: "AI Agents" },
  { icon: FileTextIcon, label: "Smart Summary" },
  { icon: LockIcon, label: "Secure & Private" },
];

const suggestions = [
  "Define your target audience",
  "Focus on your unique value",
  "Validate your idea early",
];

interface HomeViewProps {
  /** Signed-out visitors are sent to the auth pages instead of the app. */
  isAuthenticated: boolean;
}

export const HomeView = ({ isAuthenticated }: HomeViewProps) => {
  const router = useRouter();

  const primaryHref = isAuthenticated ? "/meetings" : "/sign-up";
  const secondaryHref = isAuthenticated ? "/agents" : "/sign-in";

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="mx-auto grid min-h-full w-full max-w-7xl grid-cols-1 items-center gap-10 px-6 py-12 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] 2xl:gap-12">
        {/* Left: copy + actions */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-y-8"
        >
          <span className="inline-flex w-fit items-center gap-x-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">
            <SparklesIcon className="size-4" />
            AI-Powered Meetings
          </span>

          <div className="space-y-6">
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl xl:text-6xl">
              Meet. Collaborate.
              <br />
              Get <span className="text-indigo-600">AI</span> on your call.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              ConnexAI brings real-time AI agents into your meetings to assist,
              guide, and collaborate &mdash; so every conversation is more
              productive.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Button
              size="lg"
              className="group h-14 rounded-xl bg-indigo-600 px-8 text-base font-semibold text-white hover:bg-indigo-700"
              onClick={() => router.push(primaryHref)}
            >
              Start Meeting Free
              <ArrowRightIcon className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 rounded-xl border-border px-8 text-base font-semibold"
              onClick={() => router.push(secondaryHref)}
            >
              View AI Agents
            </Button>
          </div>

          <div className="grid max-w-lg grid-cols-4 gap-4 pt-2">
            {highlights.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-y-2">
                <div className="flex size-12 items-center justify-center rounded-xl bg-indigo-50">
                  <Icon className="size-5 text-indigo-600" />
                </div>
                <span className="text-center text-xs text-muted-foreground sm:text-sm">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right: in-call preview */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="overflow-hidden rounded-2xl border bg-card shadow-2xl"
        >
          {/* Call header */}
          <div className="flex items-center gap-x-3 border-b px-5 py-4">
            <ShieldCheckIcon className="size-4 text-indigo-600" />
            <span className="font-semibold">Startup Coaching Call</span>
            <span className="text-sm text-muted-foreground">25:31</span>
            <div className="ml-auto flex items-center gap-x-4 text-muted-foreground">
              <UserPlusIcon className="size-4" />
              <SettingsIcon className="size-4" />
              <MaximizeIcon className="size-4" />
            </div>
          </div>

          <div className="grid sm:grid-cols-[minmax(0,1fr)_260px]">
            {/* Tiles + call controls */}
            <div className="flex flex-col gap-4 p-5">
              <div className="grid min-h-[260px] flex-1 grid-cols-2 grid-rows-2 gap-3">
                <div className="relative row-span-2 overflow-hidden rounded-xl bg-slate-200">
                  <Image
                    src="/people/participant-1.png"
                    alt="Meeting participant"
                    fill
                    sizes="(max-width: 1536px) 40vw, 300px"
                    className="object-cover"
                    priority
                  />
                  <span className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
                    Alex Mercer
                  </span>
                </div>
                <div className="relative overflow-hidden rounded-xl bg-slate-200">
                  <Image
                    src="/people/participant-2.png"
                    alt="Meeting participant"
                    fill
                    sizes="(max-width: 1536px) 30vw, 250px"
                    className="object-cover"
                  />
                  <span className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
                    Priya Nair
                  </span>
                </div>
                <div className="relative flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200">
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-indigo-600/90">
                    <BotIcon className="size-9 text-white" />
                  </div>
                  <span className="absolute bottom-2 left-2 rounded-md bg-indigo-600/90 px-2 py-0.5 text-xs font-medium text-white">
                    Hustle Coach
                  </span>
                </div>
              </div>

              <div className="mt-auto flex items-center justify-center gap-x-3">
                {[MicIcon, VideoIcon, MonitorUpIcon, MoreHorizontalIcon].map(
                  (Icon, index) => (
                    <div
                      key={index}
                      className="flex size-11 items-center justify-center rounded-full border"
                    >
                      <Icon className="size-4" />
                    </div>
                  )
                )}
                <div className="flex size-11 items-center justify-center rounded-full bg-red-500">
                  <PhoneIcon className="size-4 rotate-[135deg] text-white" />
                </div>
              </div>
            </div>

            {/* Agent panel */}
            <div className="flex flex-col gap-y-4 border-t p-5 sm:border-l sm:border-t-0">
              <div className="flex items-center gap-x-6 border-b text-sm">
                <span className="-mb-px border-b-2 border-indigo-600 pb-2 font-medium text-indigo-600">
                  AI Agent
                </span>
                <span className="pb-2 text-muted-foreground">Chat</span>
              </div>

              <div className="rounded-xl border p-3">
                <div className="flex items-center gap-x-2">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-600/90">
                    <BotIcon className="size-4 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Hustle Coach</span>
                    <span className="flex items-center gap-x-1 text-xs text-muted-foreground">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      Online
                    </span>
                  </div>
                </div>
                <p className="mt-3 rounded-lg bg-indigo-50 p-3 text-sm text-foreground">
                  Great point! Have you thought about your target audience and
                  value proposition?
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Suggestions</p>
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion}
                    className="flex items-center gap-x-2 rounded-lg border px-3 py-2 text-[13px] text-muted-foreground"
                  >
                    <SparklesIcon className="size-3.5 shrink-0 text-indigo-600" />
                    {suggestion}
                  </div>
                ))}
              </div>

              <div className="mt-auto flex items-center gap-x-2 rounded-xl border px-3 py-2">
                <MessageSquareIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-sm text-muted-foreground">
                  Ask something...
                </span>
                <SendIcon className="size-4 shrink-0 text-indigo-600" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
