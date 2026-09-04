"use client";

export function Badge({ text }: { text?: string }) {
  return <span data-testid="badge">{text}</span>;
}
