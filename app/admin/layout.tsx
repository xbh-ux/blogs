import { getAuthSession } from "@/auth";
import Link from "next/link";
import SignOutButton from "./components/SignOutButton";

export const metadata = {
  title: "博客管理后台",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();

  if (!session) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      {/* 导航栏 */}
      <nav
        className="border-b"
        style={{
          borderColor: "rgba(53, 191, 171, 0.2)",
          backgroundColor: "rgba(15, 23, 42, 0.8)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="text-xl font-bold" style={{ color: "#35bfab" }}>
              📝 博客管理
            </Link>
            <div className="flex gap-4">
              <Link
                href="/admin"
                className="text-sm hover:opacity-80 transition"
                style={{ color: "#94a3b8" }}
              >
                文章管理
              </Link>
              <Link
                href="/admin/new"
                className="text-sm hover:opacity-80 transition"
                style={{ color: "#94a3b8" }}
              >
                新建文章
              </Link>
            </div>
          </div>

          {/* 用户信息 */}
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: "#94a3b8" }}>
              欢迎, {session.user?.name || "Admin"}
            </span>
            <SignOutButton />
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
