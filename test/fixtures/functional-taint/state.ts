import "server-only";
export const value = (() => process.env.API_SECRET)();
export const publicValue = (() => "public")();
