import "server-only";

export function getConfig() {
  return {
    visible: true,
    secret: process.env.ADMIN_SECRET,
  };
}
