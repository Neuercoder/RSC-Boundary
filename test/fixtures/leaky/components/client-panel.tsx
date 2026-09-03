"use client";

import { getConfig } from "../lib/server-config";

export function ClientPanel() {
  const { secret } = getConfig();
  return <div data-testid="panel">{secret}</div>;
}
