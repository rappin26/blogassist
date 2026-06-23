import { NextRequest, NextResponse } from "next/server";
import { parseBlogId, fetchLatestPosts } from "@/lib/naver";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const urls: string[] = Array.isArray(body.urls)
      ? body.urls
      : [body.url].filter(Boolean);

    if (!urls.length) {
      return NextResponse.json(
        { error: "블로그 주소를 입력해주세요." },
        { status: 400 }
      );
    }

    // 여러 블로그를 동시에 처리 (15개도 빠르게)
    const blogs = await Promise.all(
      urls.map(async (u) => {
        const blogId = parseBlogId(u);
        if (!blogId) {
          return { blogId: u, error: "주소 형식이 올바르지 않습니다." };
        }
        try {
          const posts = await fetchLatestPosts(blogId, 5);
          return { blogId, posts };
        } catch (e: any) {
          return { blogId, error: e?.message || "불러오기 실패" };
        }
      })
    );

    return NextResponse.json({ blogs });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "글 목록을 가져오지 못했습니다." },
      { status: 500 }
    );
  }
}
