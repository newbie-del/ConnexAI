// modules/premium/ui/views/upgrade-view.tsx
"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { authClient } from "@/lib/auth-client";
import { PricingCard } from "../components/pricing-card";
import { SparklesIcon } from "lucide-react";

export const UpgradeView = () => {
  const trpc = useTRPC();

  const { data: products } = useSuspenseQuery(
    trpc.premium.getProducts.queryOptions()
  );

  const { data: currentSubscription } = useSuspenseQuery(
    trpc.premium.getCurrentSubscription.queryOptions()
  );

  return (
    <div className="flex-1 py-10 px-4 md:px-12 flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 relative overflow-hidden">
      {/* Decorative glowing blobs */}
      <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-primary/30 rounded-full blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-indigo-500/30 rounded-full blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute top-1/2 right-1/2 w-56 h-56 bg-emerald-400/20 rounded-full blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

      <div className="relative z-10 w-full max-w-6xl flex flex-col gap-y-12 items-center text-center">
        {/* Header */}
        <div className="space-y-4 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight flex items-center justify-center gap-x-3">
            <SparklesIcon className="size-8 text-primary animate-pulse-slow" />
            Unlock Your Full Potential
            <SparklesIcon className="size-8 text-primary animate-pulse-slow animation-delay-1000" />
          </h2>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto">
            Choose the perfect plan to supercharge your AI-powered meetings and agents.
          </p>
        </div>

        {/* Current plan */}
        <h5 className="font-medium text-2xl md:text-3xl text-white animate-fade-in-up delay-200">
          You are on the{" "}
          <span className="font-semibold text-primary">
            {currentSubscription?.name ?? "Free"}
          </span>{" "}
          plan
        </h5>

        {/* Pricing grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full animate-fade-in-up delay-400">
          {products.map((product) => {
            const isCurrentProduct = currentSubscription?.id === product.id;
            const isPremium = !!currentSubscription;

            let buttonText = "Upgrade Now";
            let onClick = () => authClient.checkout({ products: [product.id] });

            if (isCurrentProduct) {
              buttonText = "Manage";
              onClick = () => authClient.customer.portal();
            } else if (isPremium) {
              buttonText = "Change Plan";
              onClick = () => authClient.customer.portal();
            }

            return (
              <PricingCard
                key={product.id}
                buttonText={buttonText}
                onClick={onClick}
                variant={
                  product.metadata.variant === "highlighted"
                    ? "highlighted"
                    : "default"
                }
                title={product.name}
                price={
                  product.prices[0].amountType === "fixed"
                    ? product.prices[0].priceAmount / 100
                    : 0
                }
                description={product.description}
                priceSuffix={`/${product.prices[0].recurringInterval}`}
                features={product.benefits.map((b) => b.description)}
                badge={product.metadata.badge as string | null}
                isCurrentProduct={isCurrentProduct}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const UpgradeViewLoading = () => (
  <LoadingState
    title="Loading Plans"
    description="Fetching the latest subscription details..."
  />
);

export const UpgradeViewError = () => (
  <ErrorState
    title="Failed to Load Plans"
    description="Could not retrieve pricing information. Please try again later."
  />
);
