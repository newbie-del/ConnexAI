import { headers } from "next/headers";

import { auth } from "@/lib/auth";

import { HomeView } from "@/modules/home/ui/views/home-view";

// Public: signed-out visitors see the same page, with sign in / sign up in the
// navbar and auth-bound calls to action.
const Page = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return <HomeView isAuthenticated={!!session} />;
};

export default Page;
