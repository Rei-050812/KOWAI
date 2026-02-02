import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { name, email, message } = await request.json();

    // バリデーション
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "すべての項目を入力してください" },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: "お名前は100文字以内で入力してください" },
        { status: 400 }
      );
    }

    if (email.length > 255) {
      return NextResponse.json(
        { error: "メールアドレスは255文字以内で入力してください" },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: "お問い合わせ内容は5000文字以内で入力してください" },
        { status: 400 }
      );
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "有効なメールアドレスを入力してください" },
        { status: 400 }
      );
    }

    // Supabaseに保存
    const { error: dbError } = await supabase
      .from("contact_submissions")
      .insert({
        name,
        email,
        message,
      });

    if (dbError) {
      console.error("Contact submission error:", dbError);
      return NextResponse.json(
        { error: "送信に失敗しました。しばらく経ってからお試しください。" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact API error:", error);
    return NextResponse.json(
      { error: "送信に失敗しました" },
      { status: 500 }
    );
  }
}
