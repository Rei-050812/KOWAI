import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStoryById, incrementViews } from "@/lib/supabase";
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

    return {
      title: `${story.title} | KOWAI`,
      description: story.hook,
      openGraph: {
        title: `${story.title} | KOWAI`,
        description: story.hook,
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

  return <StoryDetailClient story={story} />;
}
