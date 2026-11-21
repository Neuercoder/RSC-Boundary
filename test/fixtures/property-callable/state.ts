import "server-only";

export const readers = { read: () => process.env.INTERNAL_VALUE };
export const functions = { read: function () { return process.env.INTERNAL_VALUE; } };
export const publicReaders = { read: () => "public" };
