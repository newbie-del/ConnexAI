import {useRouter} from "next/navigation";
import { ChevronDownIcon, CreditCard, LogOutIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GeneratedAvatar } from "@/components/generated-avatar";

export const DashboardUserButton = () => {
    const router = useRouter();
  const { data, isPending } = authClient.useSession();

  const onLogout =  () => {
     authClient.signOut({
        fetchOptions: {
             onSuccess: () => {
                router.push("/sign-in");
            }
        }
    })
  }

  if (isPending || !data?.user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-lg border border-border/10 p-3 w-full flex items-center justify-between bg-white/5 hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 transition-all duration-300 overflow-hidden group">
        {data.user.image ? (
          <Avatar>
            <AvatarImage src={data.user.image} />
          </Avatar>
        ) : (
          <GeneratedAvatar
            seed={data.user.name}
            variant="initials"
            className="size-9 mr-3"
          />
        )}
        <div className="flex flex-col gap-0.5 text-left overflow-hidden flex-1 min-w-0">
          <p className="text-sm truncate w-full">
            {data.user.name}
          </p>
          <p className="text-xs text-muted-foreground truncate w-full">
            {data.user.email}
          </p>
        </div>
        <ChevronDownIcon className="size-4 shrink-0"/>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" side="right" className="w-72">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-1">
            <span className="font-medium truncate">
              {data.user.name}
            </span>
            <span className="text-sm font-normal text-muted-foreground truncate">
              {data.user.email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Fixed: Properly closed the Billing item */}
        <DropdownMenuItem className="cursor-pointer flex items-center justify-between">
          Billing
          <CreditCard className="size-4"/>
        </DropdownMenuItem> 

        <DropdownMenuItem 
        onClick={onLogout}
        className="cursor-pointer flex items-center justify-between">
          LogOut
          <LogOutIcon className="size-4"/>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
