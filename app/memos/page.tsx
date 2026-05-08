import MemosClient from './MemosClient';
import { getMemos } from '@/lib/static-data';

export const metadata = {
  title: '随记 · Anya的博客',
};

export default function MemosPage() {
  return <MemosClient memos={getMemos()} />;
}
