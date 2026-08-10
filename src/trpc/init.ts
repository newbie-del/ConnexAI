import { db } from '@/db';
import { agents, meetings } from '@/db/schema';
import { auth } from '@/lib/auth';
import { polarClient } from '@/lib/polar';
import { MAX_FREE_AGENTS, MAX_FREE_MEETINGS } from '@/modules/premium/constants';
import { initTRPC, TRPCError } from '@trpc/server';
import { count, eq } from 'drizzle-orm';
import { headers } from 'next/headers';

// ------------------------
// Context
// ------------------------
export const createTRPCContext = async () => {
  // Example static context for testing
  return { userId: "user_123" };
};

// Initialize tRPC
const t = initTRPC.create({
  // transformer: superjson, // optional
});

// Base helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

// ------------------------
// Protected procedure
// ------------------------
export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  const session = await auth.api.getSession({
    headers: await headers(), 
  });

  if (!session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }

  return next({
    ctx: {
      ...ctx,
      auth: session,
    },
  });
});

export const premiumProcedure = (entity: "meetings" | "agents") =>
  protectedProcedure.use(async ({ ctx, next }) => {
    const usageQuery =
      entity === "meetings"
        ? db
            .select({ count: count(meetings.id) })
            .from(meetings)
            .where(eq(meetings.userId, ctx.auth.user.id))
        : db
            .select({ count: count(agents.id) })
            .from(agents)
            .where(eq(agents.userId, ctx.auth.user.id));

    const [usage] = await usageQuery;
    const isFreeAgentLimitReached =
      entity === "agents" && usage.count >= MAX_FREE_AGENTS;
    const isFreeMeetingLimitReached =
      entity === "meetings" && usage.count >= MAX_FREE_MEETINGS;

    if (!isFreeAgentLimitReached && !isFreeMeetingLimitReached) {
      return next({ ctx });
    }

    let isPremium = false;

    try {
      const customer = await polarClient.customers.getStateExternal({
        externalId: ctx.auth.user.id,
      });

      isPremium = customer.activeSubscriptions.length > 0;
    } catch (error) {
      // A missing Polar customer (accounts that predate `createCustomerOnSignUp`)
      // simply means no subscription. Anything else is an outage. Either way the
      // free limits still apply, and the caller gets the actionable "upgrade"
      // error rather than an opaque 500 that skips the /upgrade redirect.
      console.error("[premium] could not resolve subscription state", error);
    }

    if (isPremium) {
      return next({ ctx });
    }

    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        entity === "agents"
          ? "You have reached the maximum number of free agents"
          : "You have reached the maximum number of free meetings",
    });
  });
