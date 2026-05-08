import path from "path";
import matter from "gray-matter";
import { hasMeaningfulContent, parseTagInput } from "./post-shared";

export { createPostSlug, hasMeaningfulContent, parseTagInput } from "./post-shared";

const RESERVED_WINDOWS_BASENAMES =
  /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDateInput(value: unknown): string {
  const normalized = normalizeString(value);
  if (!normalized) {
    return "";
  }

  const dateMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) {
    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      return "";
    }

    return normalized;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().split("T")[0];
}

export interface NormalizedPostInput {
  title: string;
  date: string;
  tags: string[];
  content: string;
}

export function normalizePostInput(payload: unknown): { data: NormalizedPostInput | null; error?: string } {
  const input =
    payload && typeof payload === "object"
      ? (payload as {
          title?: unknown;
          date?: unknown;
          tags?: unknown;
          content?: unknown;
        })
      : {};

  const title = normalizeString(input.title);
  if (!title) {
    return { data: null, error: "标题不能为空" };
  }

  const date = normalizeDateInput(input.date);
  if (!date) {
    return { data: null, error: "发布日期格式无效" };
  }

  const content =
    typeof input.content === "string" ? input.content.trim() : "";
  if (!content || !hasMeaningfulContent(content)) {
    return { data: null, error: "文章内容不能为空" };
  }

  const tags =
    typeof input.tags === "string"
      ? parseTagInput(input.tags)
      : Array.isArray(input.tags)
        ? parseTagInput(
            input.tags
              .filter((tag): tag is string => typeof tag === "string")
              .join(",")
          )
        : [];

  return {
    data: {
      title,
      date,
      tags,
      content,
    },
  };
}

export function isPathInsideDirectory(filePath: string, directory: string): boolean {
  const resolvedDirectory = path.resolve(directory);
  const resolvedFilePath = path.resolve(filePath);
  const relativePath = path.relative(resolvedDirectory, resolvedFilePath);

  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

export function buildPostDocument({
  frontmatter,
  content,
}: {
  frontmatter: Record<string, unknown>;
  content: string;
}): string {
  return matter.stringify(content, frontmatter);
}

export function isSafePostId(value: string): boolean {
  return value.split("/").every(isSafePostSegment);
}

function isSafePostSegment(segment: string): boolean {
  return (
    Boolean(segment) &&
    segment !== "." &&
    segment !== ".." &&
    !segment.includes("\\") &&
    !/[<>:"/\\|?*\u0000-\u001f]/.test(segment) &&
    !/[. ]$/.test(segment) &&
    !RESERVED_WINDOWS_BASENAMES.test(segment)
  );
}
