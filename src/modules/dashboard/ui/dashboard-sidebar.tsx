"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BotIcon, StarIcon, VideoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { DashboardTrial } from "./components/dashboard-trial";
import { DashboardUserButton } from "./components/dashboard-user-button";

const firstSection = [
  {
    icon: VideoIcon,
    label: "Meetings",
    href: "/meetings",
  },
  {
    icon: BotIcon,
    label: "Agents",
    href: "/agents",
  },
];

const secondSection = [
  {
    icon: StarIcon,
    label: "Upgrade",
    href: "/upgrade",
  },
];

export const DashboardSidebar = () => {
    const pathname = usePathname();     
        
  return (
    <Sidebar>
      <SidebarHeader className="text-sidebar-accent-foreground">
        <Link href="/" className="flex items-center gap-0 px-2 pt-2">
          <Image src="/logo.svg" height={70} width={70} alt="Connex.AI" />
          <span className="text-2xl font-semibold">Connex.AI</span>
        </Link>
      </SidebarHeader>

      <div className="px-4 py-2">
        <Separator className="opacity-10 text-[#5D6B68]" />
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {firstSection.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href} passHref>
                  <SidebarMenuButton
                asChild
                className={cn(
                  "h-10 w-full rounded-md px-3 flex items-center gap-2 text-sm font-medium transition-colors duration-200",
                  "border border-transparent",
                  "bg-sidebar text-white",
                  "hover:bg-gradient-to-r hover:from-[#4fd1c5]/30 hover:via-[#112d35]/70 hover:to-sidebar/80",
                  "hover:border-[#5D6B68]/10 hover:shadow-lg",
                 pathname === item.href &&
                "hover:bg-[linear-gradient(to_right,_#60a5fa22,_#38bdf822)] hover:shadow-[0_0_12px_#60a5fa66] transition duration-200"
                     )}
                   isActive={pathname === item.href}
                   >

                      <div className="flex items-center gap-2">
                        <item.icon className="size-5" />
                        <span className="text-sm font-medium tracking-tight">
                          {item.label}
                        </span>
                      </div>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="px-4 py-2">
        <Separator className="opacity-10 text-[#5D6B68]" />
    </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondSection.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href} passHref>
                  <SidebarMenuButton
                asChild
                className={cn(
                  "h-10 w-full rounded-md px-3 flex items-center gap-2 text-sm font-medium transition-colors duration-200",
                  "border border-transparent",
                  "bg-sidebar text-white",
                  "hover:bg-gradient-to-r hover:from-[#4fd1c5]/30 hover:via-[#112d35]/70 hover:to-sidebar/80",
                  "hover:border-[#5D6B68]/10 hover:shadow-lg",
                 pathname === item.href &&
                "hover:bg-[linear-gradient(to_right,_#60a5fa22,_#38bdf822)] hover:shadow-[0_0_12px_#60a5fa66] transition duration-200"
                     )}
                   isActive={pathname === item.href}
                   >

                      <div className="flex items-center gap-2">
                        <item.icon className="size-5" />
                        <span className="text-sm font-medium tracking-tight">
                          {item.label}
                        </span>
                      </div>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className= "text-white">
        <DashboardTrial />
       <DashboardUserButton />
         </SidebarFooter>
      
    </Sidebar>
  );
};
