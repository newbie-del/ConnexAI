import {
  DefaultVideoPlaceholder,
  StreamVideoParticipant,
  ToggleAudioPreviewButton,
  ToggleVideoPreviewButton,
  useCallStateHooks,
  VideoPreview,
} from "@stream-io/video-react-sdk";

import { authClient } from "@/lib/auth-client";
import { generateAvatarUri } from "@/lib/avatar";
import { Button } from "@/components/ui/button";
import { LogInIcon } from "lucide-react";
import Link from "next/link";

import "@stream-io/video-react-sdk/dist/css/styles.css"

interface Props {
  onJoin: () => void;
}

const DisabledVideoPreview = () => {
  const { data } = authClient.useSession();

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <DefaultVideoPlaceholder
        participant={
          {
            name: data?.user.name ?? "",
            image:
              data?.user.image ??
              generateAvatarUri({
                seed: data?.user.name ?? "",
                variant: "initials",
              }),
          } as StreamVideoParticipant
        }
        // 👇 profile image ko thoda bada karne ke liye
        className="w-32 h-32"
      />
      <p className="text-xs text-muted-foreground text-center max-w-[220px]">
        Please grant your browser permission to access your camera and microphone.
      </p>
    </div>
  );
};

export const CallLobby = ({ onJoin }: Props) => {
  const { useCameraState, useMicrophoneState } = useCallStateHooks();

  const { hasBrowserPermission: hasMicPermission } = useMicrophoneState();
  const { hasBrowserPermission: hasCameraPermission } = useCameraState();

  const hasBrowserPermission = hasCameraPermission && hasMicPermission;

  return (
    <div className="flex flex-col items-center justify-center h-full bg-radial from-sidebar-accent to-sidebar">
      <div className="py-4 px-8 flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-y-6 bg-background rounded-lg p-10 shadow-sm">
          <div className="flex flex-col gap-y-2 text-center">
            <h6 className="text-lg font-medium">Ready to join?</h6>
            <p className="text-sm">Set up your call before joining</p>
          </div>

          {/* 👇 Profile image shown when video is disabled */}
          <VideoPreview DisabledVideoPreview={DisabledVideoPreview} />

          <div className="flex gap-x-2">
            <ToggleAudioPreviewButton />
            <ToggleVideoPreviewButton />
          </div>
          <div className="flex gap-x-2 justify-between w-full">
            <Button asChild variant="ghost">
                <Link href="/meetings">
                   Cancel
                </Link>
            </Button>
            <Button 
              onClick={onJoin}
            >
                <LogInIcon />
                Join Call
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
