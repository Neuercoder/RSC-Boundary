"use client";

export function Card({ title, apiKey }: { title: string; apiKey?: string }) {
  return (
    <div>
      {title}
      {apiKey ? <span data-testid="key">{apiKey}</span> : null}
    </div>
  );
}
