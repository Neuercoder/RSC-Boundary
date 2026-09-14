"use client";

export function Card(props: { apiKey?: string; title?: string }) {
  return <div>{props.apiKey ?? props.title}</div>;
}
