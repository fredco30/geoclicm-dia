import { redirect } from "next/navigation";

type Props = { searchParams: Promise<{ uid?: string; token?: string }> };

export default async function NewPasswordPage({ searchParams }: Props) {
  const { uid, token } = await searchParams;
  if (uid && token && /^[A-Za-z0-9_-]+$/.test(uid) && /^[A-Za-z0-9_-]+$/.test(token)) {
    redirect(`/api/auth/reset/${encodeURIComponent(uid)}/${encodeURIComponent(token)}/`);
  }
  redirect("/api/auth/recovery/");
}
