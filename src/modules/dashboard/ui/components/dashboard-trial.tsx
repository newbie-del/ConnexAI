"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, Variants } from "motion/react";

import {
  MAX_FREE_AGENTS,
  MAX_FREE_MEETINGS,
} from "@/modules/premium/constants";

// Rocket animation variants
const rocketVariants: Variants = {
  animate: {
    x: [0, 0, -3, 2, -2, 1, -1, 0],
    y: [0, -3, 0, -2, -3, -1, -2, 0],
    transition: {
      duration: 6,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "reverse",
      times: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1],
    },
  },
};

const fireVariants: Variants = {
  animate: {
    d: [
      "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z",
      "M4.5 16.5c-1.5 1.26-3 5.5-3 5.5s4.74-1 6-2.5c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z",
      "M4.5 16.5c-1.5 1.26-2.2 4.8-2.2 4.8s3.94-0.3 5.2-1.8c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z",
      "M4.5 16.5c-1.5 1.26-2.8 5.2-2.8 5.2s4.54-0.7 5.8-2.2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z",
      "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z",
    ],
    transition: { duration: 2, ease: [0.4, 0, 0.2, 1], repeat: Infinity, times: [0, 0.2, 0.5, 0.8, 1] },
  },
};

// Rocket Component (always animating)
const Rocket = ({ width = 28, height = 28, strokeWidth = 2, stroke = "#ffffff" }) => {
  return (
    <motion.div
      style={{ cursor: "pointer", userSelect: "none", padding: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}
      animate="animate"
      variants={rocketVariants}
    >
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.path
          d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"
          variants={fireVariants}
          animate="animate"
        />
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      </motion.svg>
    </motion.div>
  );
};

export const DashboardTrial = () => {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.premium.getFreeUsage.queryOptions());

  if (!data) return null;

  return (
    <div className="border border-border/10 rounded-lg w-full bg-white/5 flex flex-col gap-y-2">
      <div className="p-3 flex flex-col gap-y-4">
        <div className="flex items-center gap-2">
          <Rocket /> {/* Always animating rocket */}
          <p className="text-sm font-medium"> Free Trial</p>
        </div>
        <div className="flex flex-col gap-y-2">
          <p className="text-xs">{data.agentCount}/{MAX_FREE_AGENTS} Agents</p>
          <Progress value={(data.agentCount / MAX_FREE_AGENTS) * 100} />
        </div>
        <div className="flex flex-col gap-y-2">
          <p className="text-xs">{data.meetingCount}/{MAX_FREE_MEETINGS} Meetings</p>
          <Progress value={(data.meetingCount / MAX_FREE_MEETINGS) * 100} />
        </div>
      </div>
      <Button className="bg-transparent border-t border-border/10 hover:bg-white/10 rounded-t-none" asChild>
        <Link href="/upgrade">Upgrade</Link>
      </Button>
    </div>
  );
};
import Link from "next/link";
import { RocketIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress"; 

import {
    MAX_FREE_AGENTS,
    MAX_FREE_MEETINGS,
} from "@/modules/premium/constants";

export const DashboardTrial = () => {
    const trpc = useTRPC();
    const {data} = useQuery(trpc.premium.getFreeUsage.queryOptions());

    if (!data) return null;

    return (
        <div className="border border-border/10 rounded-lg w-full bg-white/5 flex flex-col gap-y-2">
            <div className="p-3 flex flex-col gap-y-4">
                <div className="flex items-center gap-2">
                    <RocketIcon className="size-4" />
                    <p className="text-sm font-medium"> Free Trial</p>
                </div>
                <div className="flex flex-col gap-y-2">
                    <p className="text-xs">
                        {data.agentCount}/{MAX_FREE_AGENTS} Agents
                    </p>
                    <Progress value={(data.agentCount / MAX_FREE_AGENTS) * 100} />
                </div>
                <div className="flex flex-col gap-y-2">
                    <p className="text-xs">
                        {data.meetingCount}/{MAX_FREE_MEETINGS} Meetings
                    </p>
                    <Progress value={(data.meetingCount / MAX_FREE_MEETINGS) * 100} />
                </div>
            </div>
            <Button
                className="bg-transparent border-t border-border/10 hover:bg-white/10 rounded-t-none"
                asChild
            >
                <Link href="/upgrade">
                Upgrade
                </Link>
            </Button>
        </div>
    )
}
