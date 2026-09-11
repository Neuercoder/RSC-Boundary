"use server";

export const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

export async function deleteAccount(userId: string) {
  return process.env.ADMIN_TOKEN ?? userId;
}

export async function getPublicProfile(userId: string) {
  return `profile:${userId}`;
}
