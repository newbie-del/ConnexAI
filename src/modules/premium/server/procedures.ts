import { polarClient } from "@/lib/polar";
import { ResourceNotFound } from "@polar-sh/sdk/models/errors/resourcenotfound.js";
import {agents, meetings } from "@/db/schema";
import {eq, count} from "drizzle-orm";
import {db} from "@/db";
import {
    createTRPCRouter,
    protectedProcedure,
} from "@/trpc/init";

/**
 * Look up a user's Polar customer record, treating "no such customer" as a
 * normal result rather than a failure.
 *
 * Polar customers are per-environment, and the record is created at sign-up.
 * So a user can legitimately have none: accounts that predate the current
 * POLAR_SERVER, or any sign-up where customer creation didn't complete.
 * Letting that 404 propagate takes down the whole upgrade page and the
 * sidebar usage widget, when the honest answer is just "not subscribed".
 */
const findCustomerState = async (userId: string) => {
  try {
    return await polarClient.customers.getStateExternal({ externalId: userId });
  } catch (error) {
    if (error instanceof ResourceNotFound) {
      return null;
    }
    throw error;
  }
};

export const premiumRouter = createTRPCRouter({
  getCurrentSubscription: protectedProcedure.query(async ({ ctx }) => {
    const customer = await findCustomerState(ctx.auth.user.id);

    const subscription = customer?.activeSubscriptions[0];

    if (!subscription) {
      return null;
    }

    const product = await polarClient.products.get({
      id: subscription.productId,
    });

    return product;
  }),
  getProducts: protectedProcedure.query(async () => {
    const products = await polarClient.products.list({
      isArchived: false,
      isRecurring: true,
      sorting: ["price_amount"],
    });

    return products.result.items;
  }),
  getFreeUsage: protectedProcedure.query(async ({ ctx }) => {
        const customer = await findCustomerState(ctx.auth.user.id);

        const subscription = customer?.activeSubscriptions[0];

        // Premium customers are not on the free trial, so there is no usage to
        // report. Returning null lets the sidebar widget hide itself.
        if (subscription) {
          return null;
        }

        const meetingsQuery = db
          .select({
            count: count(meetings.id),
          })
          .from (meetings)
          .where(eq(meetings.userId, ctx.auth.user.id));

        const agentsQuery = db
          .select({
            count: count(agents.id),
          })
          .from (agents)
          .where(eq(agents.userId, ctx.auth.user.id));

        const [[userMeetings], [userAgents]] = await Promise.all([
          meetingsQuery,
          agentsQuery,
        ]);

        return {
            meetingCount: userMeetings.count,
            agentCount: userAgents.count,
        };
    })
});
