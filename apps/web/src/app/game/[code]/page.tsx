import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  buildFcEmbedMetadata,
  buildGameShareUrl,
  isValidJoinCodeFormat,
} from '@/lib/farcaster-embed';
import { normalizeJoinCodeInput } from '@/lib/join-code';
import { GameJoinRedirect } from './GameJoinRedirect';

type PageProps = {
  params: { code: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const code = normalizeJoinCodeInput(params.code);
  if (!isValidJoinCodeFormat(code)) {
    return { title: 'Invalid challenge' };
  }

  const embed = buildFcEmbedMetadata(code);
  const shareUrl = buildGameShareUrl(code);

  return {
    title: `Join challenge ${code} · Crack My Code`,
    description: `Join private Crack My Code challenge ${code} on Celo.`,
    openGraph: {
      title: `Join challenge ${code}`,
      description: 'Crack the code first to win.',
      url: shareUrl,
      images: [{ url: '/embed.png', width: 1200, height: 800 }],
    },
    other: embed,
  };
}

export default function GameSharePage({ params }: PageProps) {
  const code = normalizeJoinCodeInput(params.code);
  if (!isValidJoinCodeFormat(code)) {
    notFound();
  }

  return <GameJoinRedirect code={code} />;
}
