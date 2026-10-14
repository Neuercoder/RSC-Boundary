export async function updateEmail(formData: string) {
  "use server";
  return process.env.EMAIL_SECRET ?? formData;
}

export async function ping(value: string) {
  return value;
}
