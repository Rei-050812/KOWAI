import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStoryById, incrementViews } from "@/lib/supabase";
import { STYLE_LABELS } from "@/types";
import StoryDetailClient from "./StoryDetailClient";

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
        title: "怪談が見つかりません | KOWAI",
      };
    }

    const description = story.content.slice(0, 100) + "...";

    return {
      title: `「${story.word}」の怪談 | KOWAI`,
      description,
      openGraph: {
        title: `「${story.word}」の怪談 | KOWAI`,
        description,
        type: "article",
      },
    };
  } catch {
    return {
      title: "怪談 | KOWAI",
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

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-3xl mx-auto">
        {/* パンくずリスト */}
        <nav className="mb-8 text-sm text-gray-500">
          <a href="/" className="hover:text-horror-crimson transition-colors">
            トップ
          </a>
          <span className="mx-2">/</span>
          <span className="text-gray-400">怪談詳細</span>
        </nav>

        {/* メタ情報 */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <span className="bg-horror-red/30 text-horror-crimson px-4 py-2 rounded-full font-bold text-lg">
              {story.word}
            </span>
            <span className="text-gray-400">
              {STYLE_LABELS[story.style]}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {new Date(story.created_at).toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            に生成
          </p>
        </div>

        {/* 怪談本文 */}
        <article className="horror-card mb-8">
          <div className="story-text text-gray-200 whitespace-pre-wrap leading-loose text-base md:text-lg">
            {story.content}
          </div>
        </article>

        {/* アクションボタン（クライアントコンポーネント） */}
        <StoryDetailClient story={story} />

        {/* 戻るリンク */}
        <div className="mt-12 text-center">
          <a
            href="/"
            className="inline-block horror-button"
          >
            別の怪談を作る
          </a>
        </div>
      </div>
    </div>
  );
}
