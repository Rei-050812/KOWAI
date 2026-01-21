import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Noto Serif JP フォントを直接取得（Google Fonts CDN）
const FONT_URL = 'https://fonts.gstatic.com/s/notoserifjp/v21/xn77YHs72GKoTvER4Gn3b5eMZBaPRkgfU8fEwb0.woff2';

async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(FONT_URL, {
      cache: 'force-cache',
    });
    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch (error) {
    console.error('Failed to load font:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // パラメータ取得（デフォルト値付き）
    const word = searchParams.get('word') || '怪談';
    let hook = searchParams.get('hook') || '';

    // hookが80文字を超える場合は省略
    if (hook.length > 80) {
      hook = hook.substring(0, 80) + '...';
    }

    // フォント読み込み
    const font = await loadFont();

    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(180deg, #0A0A0A 0%, #1A0000 100%)',
            padding: '80px',
            fontFamily: font ? '"Noto Serif JP", serif' : 'serif',
          }}
        >
          {/* メイン単語 */}
          <div
            style={{
              fontSize: '100px',
              fontWeight: 700,
              color: '#8B0000',
              textAlign: 'center',
              marginBottom: '40px',
              textShadow: '0 0 40px rgba(139, 0, 0, 0.5)',
              letterSpacing: '0.1em',
            }}
          >
            {word}
          </div>

          {/* フックテキスト */}
          {hook && (
            <div
              style={{
                fontSize: '36px',
                color: '#CCCCCC',
                textAlign: 'center',
                lineHeight: 1.6,
                maxWidth: '1000px',
                marginBottom: '60px',
              }}
            >
              {hook}
            </div>
          )}

          {/* サイト名 */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              fontSize: '28px',
              color: '#8B0000',
              letterSpacing: '0.3em',
              textShadow: '0 0 20px rgba(139, 0, 0, 0.4)',
            }}
          >
            KOWAI
          </div>

          {/* 装飾: 上部の血の滴り風エフェクト */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '8px',
              background: 'linear-gradient(90deg, transparent, #8B0000 20%, #8B0000 80%, transparent)',
              opacity: 0.7,
            }}
          />

          {/* 装飾: 四隅のビネット効果 */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)',
              pointerEvents: 'none',
            }}
          />
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: font
          ? [
              {
                name: 'Noto Serif JP',
                data: font,
                weight: 700,
                style: 'normal',
              },
            ]
          : undefined,
        headers: {
          // 24時間キャッシュ
          'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
        },
      }
    );

    return imageResponse;
  } catch (error) {
    console.error('OG image generation error:', error);

    // エラー時はシンプルなフォールバック画像を返す
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(180deg, #0A0A0A 0%, #1A0000 100%)',
            color: '#8B0000',
            fontSize: '100px',
            fontFamily: 'serif',
            letterSpacing: '0.2em',
            textShadow: '0 0 40px rgba(139, 0, 0, 0.5)',
          }}
        >
          KOWAI
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}
