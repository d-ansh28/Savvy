import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-secondary animate-pulse border-2 border-dashed border-line/30", className)}
      {...props}
    />
  )
}

export { Skeleton }
