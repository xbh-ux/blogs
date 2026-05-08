import { getAllPosts } from "@/lib/posts";
import TimelineClient from "./TimelineClient";

export const metadata = {
  title: "近期文章 · Anya的博客",
};

export default function TimelinePage() {
  return <TimelineClient posts={getAllPosts()} />;
}
