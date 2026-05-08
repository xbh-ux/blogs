import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'public', 'data');

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

function readJsonFile<T>(filename: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(path.join(dataDir, filename), 'utf-8');
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

export function getBooks(): Book[] {
  const data = readJsonFile<unknown[]>('books.json', []);

  return data.filter(isRecord).map((item) => ({
    title: getString(item.title),
    author: getString(item.author),
    status: getString(item.status),
    rating: typeof item.rating === 'number' ? item.rating : 0,
    note: getString(item.note),
    cover: getString(item.cover) || undefined,
  }));
}

export function getMemos(): Memo[] {
  const data = readJsonFile<unknown[]>('memos.json', []);

  return data.filter(isRecord).map((item, index) => ({
    id: typeof item.id === 'number' ? item.id : index + 1,
    text: getString(item.text),
    date: getString(item.date),
    tag: getString(item.tag) || undefined,
  }));
}

export function getFriendLinks(): FriendLink[] {
  const data = readJsonFile<unknown[]>('links.json', []);

  return data.filter(isRecord).map((item) => ({
    name: getString(item.name),
    url: getString(item.url),
    desc: getString(item.desc),
    avatar: getString(item.avatar),
  }));
}
