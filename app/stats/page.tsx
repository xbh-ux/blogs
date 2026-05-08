import { getAllPosts } from "@/lib/posts";
import StatsClient from "./StatsClient";

export const metadata = {
  title: "统计 · Anya的博客",
};

export default function StatsPage() {
  return <StatsClient posts={getAllPosts()} />;
}
