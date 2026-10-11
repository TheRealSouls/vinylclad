"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import clsx from "clsx";
import type { ActionState } from "@/actions/shared";

type Action = (state: ActionState, fd: FormData) => Promise<ActionState>;

/** A form wired to a server action, with the outcome shown beside the button. */
export function ActionForm({
  action,
  submit,
  children,
  className,
  quiet = false,
  resetOnOk = false,
}: {
  action: Action;
  submit: string;
  children?: React.ReactNode;
  className?: string;
  quiet?: boolean;
  resetOnOk?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnOk && state?.ok) ref.current?.reset();
  }, [state, resetOnOk]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <div className="flex flex-wrap items-center gap-3 mt-4 first:mt-0">
        <button className={clsx("btn", quiet && "btn-quiet")} disabled={pending}>
          {pending ? "Working…" : submit}
        </button>
        {state?.error && (
          <p role="alert" className="text-accent text-sm font-medium">
            {state.error}
          </p>
        )}
        {state?.ok && !pending && (
          <p role="status" className="text-good text-sm font-medium">
            {state.ok}
          </p>
        )}
      </div>
    </form>
  );
}

/** A one-button form for small changes (remove, mark as gone). Asks first when `confirm` is set. */
export function ButtonForm({
  action,
  label,
  confirm,
  className,
}: {
  action: () => Promise<void>;
  label: string;
  confirm?: string;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="inline"
    >
      <Pending label={label} className={className} />
    </form>
  );
}

function Pending({ label, className }: { label: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={clsx("btn btn-quiet btn-small", className)} disabled={pending}>
      {label}
    </button>
  );
}
