"use client";

export function Card({ children }: { children?: unknown }) {
  return <div className="card">{children}</div>;
}

Card.Header = function CardHeader({ title }: { title: string }) {
  return <h2>{title}</h2>;
};

Card.Body = function CardBody({ children }: { children?: unknown }) {
  return <div>{children}</div>;
};
