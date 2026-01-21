import { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getStoryById, incrementViews } from "@/lib/supabase";
import StoryDetailClient from "./StoryDetailClient";
import { ArticleStructuredData } from "@/components/StructuredData";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    const story = await getStoryById(id);

    if (!story) {
      return {
        title: "怪談が見つかりません",
      };
    }

    // OGP画像URL生成
    const ogImageUrl = `/api/og?word=${encodeURIComponent(story.word)}&hook=${encodeURIComponent(story.hook)}`;

    return {
      title: story.title,
      description: story.hook,
      openGraph: {
        title: story.title,
        description: story.hook,
        type: "article",
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: `「${story.word}」の怪談`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: story.title,
        description: story.hook,
        images: [ogImageUrl],
      },
    };
  } catch {
    return {
      title: "怪談",
    };
  }
}

export default async function StoryPage({ params }: PageProps) {
  const { id } = await params;
  const story = await getStoryById(id);

  if (!story) {
    notFound();
  }

  // 閲覧数をインクリメント（非同期で実行）
  incrementViews(id);

  // share_countを取得（StoryWithScore型にキャスト）
  const shareCount = (story as unknown as { share_count?: number }).share_count || 0;

  // URLを取得
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const url = `${protocol}://${host}/story/${id}`;

  return (
    <>
      <ArticleStructuredData story={story} url={url} />
      <StoryDetailClient story={story} shareCount={shareCount} />
    </>
  );
}
