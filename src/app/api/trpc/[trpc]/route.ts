// app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { createTRPCContext } from '@/trpc/init';
import { appRouter } from '@/trpc/routers/_app';

const handler = async (req: Request) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    // 🛠️ Await the context
    createContext: async () => await createTRPCContext(),
  });
};

export { handler as GET, handler as POST };
