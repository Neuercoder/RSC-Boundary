import "server-only";
export const read = () => process.env.INTERNAL_VALUE;
export const asyncRead = async () => process.env.INTERNAL_VALUE;
export const publicRead = () => "public";
export const discarded = () => (process.env.INTERNAL_VALUE, "public");
