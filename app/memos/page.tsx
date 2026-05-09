import MemosClient from './MemosClient';
import { getMemos } from '@/lib/static-data';

export const metadata = {
  title: '随记 · Anya的博客',
};

export default async function MemosPage() {
  const memos = await getMemos();
  return <MemosClient memos={memos} />;
}
