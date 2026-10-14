"use client";

export interface CardProps {
  title: string;
}

export function Card({ title }: CardProps) {
  return <div className="card">{title}</div>;
}
