import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Logo } from "./logo";

export function FullPageNotice({
  title,
  detail,
  busy,
  children,
}: {
  title: string;
  detail?: string;
  busy?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <div
        role={busy ? "status" : "alert"}
        className="flex max-w-sm flex-col items-center gap-4 text-center"
      >
        <Logo className="size-10" />
        <div className="flex items-center gap-2 text-base font-semibold">
          {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          {title}
        </div>
        {detail && (
          <p className="text-sm text-muted-foreground">
            <bdi>{detail}</bdi>
          </p>
        )}
        {children && <div className="flex flex-wrap justify-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
