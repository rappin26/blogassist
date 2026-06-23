import { NextRequest, NextResponse } from "next/server";
import { generateText, NoKeyError, QuotaError } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const LENGTH_GUIDE: Record<string, string> = {
  짧게: "공백 제외 약 800~1,200자. 핵심만 간결하게.",
  보통: "공백 제외 약 1,500~2,500자. 표준 블로그 분량.",
  길게: "공백 제외 약 3,000~4,500자. 깊이 있게 상세히.",
};

const TONE_GUIDE: Record<string, string> = {
  친근함: "친구에게 설명하듯 편안하고 다정한 존댓말 톤.",
  전문적: "전문가가 신뢰감 있게 설명하는 정중하고 명료한 존댓말 톤.",
  활기참: "에너지 넘치고 경쾌한 톤.",
  담백함: "군더더기 없이 담백하고 차분한 정보 전달 톤.",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const topic: string = (body.topic || "").trim();
    const keywords: string = (body.keywords || "").trim();
    const audience: string = (body.audience || "").trim();
    const tone: string = body.tone || "친근함";
    const length: string = body.length || "보통";

    if (!topic) {
      return NextResponse.json({ error: "주제를 입력해주세요." }, { status: 400 });
    }

    const prompt = `당신은 정보/하우투(How-to) 분야 전문 블로그 작가입니다.
독자에게 실질적으로 도움이 되는, 검색에 잘 노출되는 한국어 블로그 글을 작성합니다.

작성 원칙:
- 자연스러운 한국어로, 사람이 직접 쓴 듯한 글을 작성합니다. AI 티가 나는 기계적 표현을 피합니다.
- 명확한 제목, 도입부(왜 이 글을 읽어야 하는지), 소제목으로 구분된 본문, 마무리 요약으로 구성합니다.
- 하우투 글이므로 단계별 설명, 구체적인 팁, 주의사항을 포함합니다.
- 과장이나 허위 정보 없이 정확하고 실용적인 내용을 씁니다.
- 마크다운 형식(#, ##, -, 번호 목록)을 사용합니다.

다음 조건으로 블로그 글을 작성해주세요.

[주제]
${topic}

[핵심 키워드]
${keywords || "(지정 없음 — 주제에 맞게 자연스럽게 선정)"}

[대상 독자]
${audience || "(일반 독자)"}

[글의 톤]
${TONE_GUIDE[tone] || TONE_GUIDE["친근함"]}

[분량]
${LENGTH_GUIDE[length] || LENGTH_GUIDE["보통"]}

요구사항:
1. 첫 줄은 클릭하고 싶어지는 매력적인 제목(# 으로 시작)으로 작성하세요.
2. SEO를 고려해 핵심 키워드를 본문에 자연스럽게 녹여주세요.
3. 소제목(##)으로 단락을 나누고, 필요한 곳에 목록을 사용하세요.
4. 마지막에 핵심을 정리하는 마무리 단락을 넣어주세요.
5. 글만 출력하고, 다른 설명이나 메타 코멘트는 붙이지 마세요.`;

    let text = "";
    let usedModel = "";
    try {
      const out = await generateText(prompt, { temperature: 0.8 });
      text = out.text;
      usedModel = out.model;
    } catch (e: any) {
      if (e instanceof QuotaError)
        return NextResponse.json({ error: e.message }, { status: 429 });
      if (e instanceof NoKeyError)
        return NextResponse.json({ error: e.message }, { status: 500 });
      return NextResponse.json(
        { error: e?.message || "생성에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      content: text,
      model: usedModel,
      chars: text.replace(/\s/g, "").length,
    });
  } catch (err: any) {
    console.error("generate error:", err);
    return NextResponse.json(
      { error: err?.message || "글 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
