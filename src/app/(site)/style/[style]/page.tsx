import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStoriesByStyle } from "@/lib/supabase";
import { StoryStyle, StoryWithScore, STYLE_LABELS, STYLE_DESCRIPTIONS } from "@/types";
import RankingCard from "@/components/RankingCard";
import StyleFilter from "@/components/StyleFilter";

interface StylePageProps {
  params: Promise<{ style: string }>;
}

const validStyles: StoryStyle[] = ["short", "medium", "long"];

export async function generateMetadata({ params }: StylePageProps): Promise<Metadata> {
  const { style } = await params;
  if (!validStyles.includes(style as StoryStyle)) {
    return { title: "Not Found" };
  }
  const label = STYLE_LABELS[style as StoryStyle];
  return {
    title: `${label}の怪談`,
    description: `${label}の怪談一覧 - ${STYLE_DESCRIPTIONS[style as StoryStyle]}`,
  };
}

export const dynamic = "force-dynamic";

export default async function StylePage({ params }: StylePageProps) {
  const { style } = await params;

  if (!validStyles.includes(style as StoryStyle)) {
    notFound();
  }

  let stories: StoryWithScore[] = [];

  try {
    stories = await getStoriesByStyle(style as StoryStyle, 20);
  } catch (error) {
    console.error("Failed to fetch stories by style:", error);
  }

  const label = STYLE_LABELS[style as StoryStyle];
  const description = STYLE_DESCRIPTIONS[style as StoryStyle];

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        <StyleFilter current={style as StoryStyle} />

        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-4">
            <span className="text-horror-crimson">{label}</span>の怪談
          </h1>
          <p className="text-gray-400">{description}</p>
        </div>

        {stories.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p className="text-6xl mb-4">📚</p>
            <p>{label}の怪談はまだありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {stories.map((story, index) => (
              <RankingCard
                key={story.id}
                story={story}
                rank={index + 1}
                showScore
              />
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <a
            href="/ranking"
            className="text-horror-crimson hover:text-white transition-colors"
          >
            ← ランキングに戻る
          </a>
        </div>
      </div>
    </div>
  );
}
