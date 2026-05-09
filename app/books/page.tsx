import BooksClient from './BooksClient';
import { getBooks } from '@/lib/static-data';

export const metadata = {
  title: '读书 · Anya的博客',
};

export default async function BooksPage() {
  const books = await getBooks();
  return <BooksClient books={books} />;
}
