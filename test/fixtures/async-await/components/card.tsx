"use client";

export interface CardProps {
  title: string;
  apiKey?: string;
}

export function Card({ title, apiKey }: CardProps) {
  return (
    <div className="card">
      {title}
      {apiKey ? <span data-testid="key">{apiKey}</span> : null}
    </div>
  );
}
