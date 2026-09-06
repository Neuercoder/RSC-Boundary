"use client";

export function Panel({ children }: { children?: unknown }) {
  return <div className="panel">{children}</div>;
}

Panel.Item = function PanelItem({ apiKey }: { apiKey?: string }) {
  return <span data-testid="item">{apiKey}</span>;
};
