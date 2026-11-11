"use client";
export default function Client(props: Record<string, unknown>) {
  return <div>{String(props)}</div>;
}
