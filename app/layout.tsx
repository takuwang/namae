import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://namae-kanji-name.abuzz-harp-7041.chatgpt.site'),
  title: '나마에 — 한자로 찾는 일본식 이름',
  description: '한국 이름 한자를 일본식 인명 읽기로 조합해 자연스러운 이름을 추천합니다.',
  openGraph: {
    title: '나마에 — 한자로 찾는 일본식 이름',
    description: '내 이름 한자의 일본식 읽기를 자연스럽게 조합해 보세요.',
    type: 'website',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
