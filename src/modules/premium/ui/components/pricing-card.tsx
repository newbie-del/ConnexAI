// modules/premium/ui/components/pricing-card.tsx
"use client";

import { CircleCheckIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const pricingCardVariants = cva(
  "rounded-2xl p-8 w-full transition-all duration-300 ease-in-out transform hover:-translate-y-2 hover:shadow-2xl",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900 border border-gray-200 hover:border-primary/50",
        highlighted:
          "bg-gradient-to-br from-[#093C23] to-[#051B16] text-white border border-primary shadow-xl",
        monthly:
          "bg-gradient-to-br from-blue-600 to-blue-800 text-white border border-blue-500 shadow-md hover:shadow-xl",
        enterprise:
          "bg-gradient-to-br from-purple-600 to-purple-800 text-white border border-purple-500 shadow-md hover:shadow-xl",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const pricingCardIconVariants = cva("size-5", {
  variants: {
    variant: {
      default: "fill-primary text-white",
      highlighted: "fill-white text-[#051B16]",
      monthly: "fill-white text-blue-200",
      enterprise: "fill-white text-purple-200",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const pricingCardSecondaryTextVariants = cva("text-neutral-700", {
  variants: {
    variant: {
      default: "text-neutral-600",
      highlighted: "text-neutral-300",
      monthly: "text-blue-200",
      enterprise: "text-purple-200",
    },
  },
});

const pricingCardBadgeVariants = cva(
  "text-xs font-semibold p-1.5 rounded-full",
  {
    variants: {
      variant: {
        default: "bg-primary/20 text-primary",
        highlighted: "bg-[#F5B797] text-black",
        monthly: "bg-blue-300/30 text-blue-100",
        enterprise: "bg-purple-300/30 text-purple-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface Props extends VariantProps<typeof pricingCardVariants> {
  badge?: string | null;
  price: number;
  features: string[];
  title: string;
  description?: string | null;
  priceSuffix: string;
  className?: string;
  buttonText: string;
  onClick: () => void;
  isCurrentProduct?: boolean;
}

export const PricingCard = ({
  variant,
  badge,
  price,
  features,
  title,
  description,
  priceSuffix,
  className,
  buttonText,
  onClick,
  isCurrentProduct = false,
}: Props) => {
  return (
    <div
      className={cn(
        pricingCardVariants({ variant }),
        className,
        isCurrentProduct ? "ring-2 ring-primary ring-offset-2" : ""
      )}
    >
      {/* Header */}
      <div className="flex flex-col gap-y-4">
        <div className="flex items-center gap-x-2">
          <h6 className="font-semibold text-2xl">{title}</h6>
          {badge ? (
            <Badge className={cn(pricingCardBadgeVariants({ variant }))}>
              {badge}
            </Badge>
          ) : null}
        </div>
        <p
          className={cn(
            "text-sm",
            pricingCardSecondaryTextVariants({ variant })
          )}
        >
          {description}
        </p>
      </div>

      {/* Price */}
      <div className="flex items-end shrink-0 gap-x-1 mt-6">
        <h4 className="text-4xl font-extrabold">
          {Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
          }).format(price)}
        </h4>
        <span
          className={cn(
            "text-base",
            pricingCardSecondaryTextVariants({ variant })
          )}
        >
          {priceSuffix}
        </span>
      </div>

      {/* Separator */}
      <div className="py-6">
        <Separator
          className={cn(
            "opacity-20",
            variant === "highlighted" ? "bg-white" : "bg-gray-300"
          )}
        />
      </div>

      {/* Button */}
      <Button
        className={cn(
          "w-full rounded-xl font-semibold animate-button-pop",
          variant === "highlighted"
            ? "bg-white text-primary hover:bg-slate-100"
            : "bg-primary text-white hover:bg-primary/90"
        )}
        size="lg"
        onClick={onClick}
        disabled={isCurrentProduct}
      >
        {isCurrentProduct ? "Current Plan" : buttonText}
      </Button>

      {/* Features */}
      <div className="flex flex-col gap-y-3 mt-8">
        <p
          className={cn(
            "font-semibold uppercase text-sm",
            variant === "highlighted" ? "text-white" : "text-foreground"
          )}
        >
          Features
        </p>
        <ul
          className={cn(
            "flex flex-col gap-y-2.5",
            pricingCardSecondaryTextVariants({ variant })
          )}
        >
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-x-2.5">
              <CircleCheckIcon
                className={cn(pricingCardIconVariants({ variant }))}
              />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
