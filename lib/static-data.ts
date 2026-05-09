import path from 'path';
import { readFile } from 'node:fs/promises';

const dataDir = path.join(process.cwd(), 'public', 'data');
let booksCache: Book[] | null = null;
let memosCache: Memo[] | null = null;
let friendLinksCache: FriendLink[] | null = null;

export interface Book {
  title: string;
  author: string;
  status: string;
  rating: number;
  note: string;
  cover?: string;
}

export interface Memo {
  id: number;
  text: string;
  date: string;
  tag?: string;
}

export interface FriendLink {
  name: string;
  url: string;
  desc: string;
  avatar: string;
}

async function readJsonFile<T>(filename: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path.join(dataDir, filename), 'utf-8');
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Failed to read static data file: ${filename}`, error);
    return fallback;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export async function getBooks(): Promise<Book[]> {
  if (booksCache && process.env.NODE_ENV === 'production') {
    return booksCache.map((book) => ({ ...book }));
  }

  const data = await readJsonFile<unknown[]>('books.json', []);
  booksCache = data.filter(isRecord).map((item) => ({
    title: getString(item.title),
    author: getString(item.author),
    status: getString(item.status),
    rating: typeof item.rating === 'number' ? item.rating : 0,
    note: getString(item.note),
    cover: getString(item.cover) || undefined,
  }));

  return booksCache.map((book) => ({ ...book }));
}

export async function getMemos(): Promise<Memo[]> {
  if (memosCache && process.env.NODE_ENV === 'production') {
    return memosCache.map((memo) => ({ ...memo }));
  }

  const data = await readJsonFile<unknown[]>('memos.json', []);
  memosCache = data.filter(isRecord).map((item, index) => ({
    id: typeof item.id === 'number' ? item.id : index + 1,
    text: getString(item.text),
    date: getString(item.date),
    tag: getString(item.tag) || undefined,
  }));

  return memosCache.map((memo) => ({ ...memo }));
}

export async function getFriendLinks(): Promise<FriendLink[]> {
  if (friendLinksCache && process.env.NODE_ENV === 'production') {
    return friendLinksCache.map((link) => ({ ...link }));
  }

  const data = await readJsonFile<unknown[]>('links.json', []);
  friendLinksCache = data.filter(isRecord).map((item) => ({
    name: getString(item.name),
    url: getString(item.url),
    desc: getString(item.desc),
    avatar: getString(item.avatar),
  }));

  return friendLinksCache.map((link) => ({ ...link }));
}
