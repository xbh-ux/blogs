import { getAuthSession } from "@/auth";
import { redirect } from "next/navigation";

export default async function EditArticleLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();
  if (!session) {
    redirect("/admin/login");
  }

  return <>{children}</>;
}
