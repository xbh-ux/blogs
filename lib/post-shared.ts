export function createPostSlug(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/^\.+|\.+$/g, "");

  if (normalized) {
    return normalized;
  }

  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `post-${timestamp}`;
}

export function parseTagInput(input: string): string[] {
  return [
    ...new Set(
      input
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    ),
  ];
}

export function hasMeaningfulContent(content: string): boolean {
  if (/<(img|video|iframe|figure)\b/i.test(content)) {
    return true;
  }

  const plainText = content
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return Boolean(plainText);
}
