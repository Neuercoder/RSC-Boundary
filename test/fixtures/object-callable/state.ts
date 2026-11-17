import "server-only";
export const methods = { read() { return process.env.INTERNAL_VALUE; } };
export const getters = { get value() { return process.env.INTERNAL_VALUE; } };
export const publicMethods = { read() { return "public"; } };
