"use client";

export function Card({ title, pin }: { title: string; pin?: string }) {
  return (
    <div>
      {title}
      {pin ? <span>{pin}</span> : null}
    </div>
  );
}
