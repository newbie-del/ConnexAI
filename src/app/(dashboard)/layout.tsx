import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { SidebarProvider } from "@/components/ui/sidebar";

import { DashboardNavbar } from "@/modules/dashboard/ui/components/dashboard-navbar";
import { DashboardSidebar } from "@/modules/dashboard/ui/dashboard-sidebar";
import { PublicNavbar } from "@/modules/home/ui/components/public-navbar";

interface Props {
    children: React.ReactNode;
}

const Layout = async ({ children }: Props) => {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    // The home page in this group is public, so signed-out visitors get a plain
    // shell with sign in / sign up instead of the dashboard chrome. Every other
    // page in the group still guards itself and redirects to /sign-in.
    if (!session) {
        return (
            <main className="flex h-screen w-screen flex-col bg-muted">
                <PublicNavbar />
                {children}
            </main>
        );
    }

    return (
        <SidebarProvider>
            <DashboardSidebar />
            <main className="flex flex-col h-screen w-screen bg-muted">
                <DashboardNavbar />
                {children}
            </main>
        </SidebarProvider>
    );
};

export default Layout;
