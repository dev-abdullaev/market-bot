import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "../lib/cn";

/** Image with graceful fallback to a branded placeholder. */
export function ProductImage({ src, alt, className }) {
  const [failed, setFailed] = useState(!src);

  if (failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-muted to-primary/10",
          className
        )}
        aria-label={alt}
        role="img"
      >
        <ImageIcon className="h-8 w-8 text-primary/30" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}
