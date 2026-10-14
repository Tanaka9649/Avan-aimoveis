"use client";
import { startTransition, type ComponentProps } from "react";

/** Submit without React's unconditional reset of uncontrolled inputs on resolved actions. */
export function PreservedForm({ action, ...props }: Omit<ComponentProps<"form">, "action" | "onSubmit"> & {
  action: (data: FormData) => void | Promise<unknown>;
}) {
  return <form method="post" {...props} onSubmit={event => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(event.currentTarget, submitter);
    startTransition(async () => { await action(data); });
  }}/>;
}
