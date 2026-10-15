import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success: "border-transparent bg-[#E8F8EE] text-[#16A34A]",
        danger: "border-transparent bg-[#FDE8E8] text-[#DC2626]",
        warning: "border-transparent bg-[#FEF3C7] text-[#D97706]",
        alert: "border-transparent bg-[#FFEDD5] text-[#EA580C]",
        info: "border-transparent bg-[#E0F2FE] text-[#0369A1]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "mr-1.5 h-1.5 w-1.5 rounded-full",
            variant === "success" ? "bg-[#16A34A]" : "",
            variant === "danger" ? "bg-[#DC2626]" : "",
            variant === "warning" ? "bg-[#D97706]" : "",
            variant === "alert" ? "bg-[#EA580C]" : "",
            variant === "info" ? "bg-[#0369A1]" : "",
            (variant === "default" || variant === "secondary" || variant === "outline" || variant === "destructive") ? "bg-current" : ""
          )}
        />
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
