import { Story } from "@/types";

interface ArticleStructuredDataProps {
  story: Story;
  url: string;
}

export function ArticleStructuredData({ story, url }: ArticleStructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: story.title,
    description: story.hook,
    datePublished: story.created_at,
    dateModified: story.updated_at,
    author: {
      "@type": "Organization",
      name: "KOWAI",
      url: url.split("/story")[0],
    },
    publisher: {
      "@type": "Organization",
      name: "KOWAI",
      logo: {
        "@type": "ImageObject",
        url: `${url.split("/story")[0]}/api/og?word=KOWAI`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    articleSection: "怪談",
    keywords: ["怪談", "ホラー", "AI生成", story.word],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

interface WebSiteStructuredDataProps {
  url: string;
}

export function WebSiteStructuredData({ url }: WebSiteStructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "KOWAI",
    description: "AIが紡ぐ本格ホラーストーリー",
    url: url,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${url}/ranking`,
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
