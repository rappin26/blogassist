import { NextRequest, NextResponse } from "next/server";
import { fetchPostBody } from "@/lib/naver";
import { getStyleSamples } from "@/lib/persona";
import { getPersona } from "@/lib/personas";
import { generateText, NoKeyError, QuotaError } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const blogId: string = (body.blogId || "").trim();
    const logNo: string = (body.logNo || "").trim();
    const sourceTitle: string = (body.title || "").trim();
    const personaId: string = (body.personaId || "hada").trim();

    if (!blogId || !logNo) {
      return NextResponse.json(
        { error: "글 정보(blogId, logNo)가 필요합니다." },
        { status: 400 }
      );
    }

    const persona = getPersona(personaId);
    if (!persona) {
      return NextResponse.json(
        { error: "선택한 문체(페르소나)를 찾을 수 없습니다." },
        { status: 400 }
      );
    }

    // 1. 원문(경쟁사 글) 본문 가져오기
    let sourceText = "";
    try {
      sourceText = await fetchPostBody(blogId, logNo);
    } catch (e: any) {
      return NextResponse.json(
        { error: `원문을 가져오지 못했습니다: ${e?.message || ""}` },
        { status: 502 }
      );
    }

    // 2. 선택한 페르소나의 견본.
    // hada는 persona.json(과거 글 846편)에서 무작위 추출하되,
    // 서버리스 등에서 파일을 못 읽으면 내장 견본으로 폴백한다.
    let styleSample = persona.sample;
    if (persona.id === "hada") {
      styleSample = getStyleSamples(2) || persona.sample;
    }

    const prompt = `당신은 손해사정/보험 분야 블로그 "${persona.label}"의 글을 쓰는 전문 작가입니다.
아래 문체 가이드와 실제 글 견본을 그대로 모방하여, 같은 분야 다른 블로그의 글을 "${persona.label}" 스타일의 완전히 새로운 글로 재작성하세요.

${persona.guide}

[글 시작 인사말 — 반드시 이 문구로 시작]
${persona.greeting}

[글 끝맺음 — 반드시 이 분위기의 마무리 CTA로 끝낼 것]
${persona.closing}

[실제 글 견본 — 어조와 구성을 그대로 따라하세요]
${styleSample}

[중요 — 유사문서 회피]
- 아래 원문의 문장 구조나 표현을 절대 그대로 가져오지 마세요.
- 정보(의학적 사실, 질병코드, 약관·법리 쟁점)는 활용하되, 100% 새로운 문장과 구성으로 다시 쓰세요.
- 위 인사말로 시작하고, 위 분위기의 맺음말로 끝내며, 가운데 본문은 가이드의 구조를 따르세요.

[참고할 원문 제목]
${sourceTitle || "(제목 미상)"}

[참고할 원문 본문]
${sourceText.slice(0, 6000)}

[형식 규칙 — 매우 중요]
- 절대 ** (별표 두 개) 같은 마크다운 강조 기호를 쓰지 마세요. 굵게 표시하지 말고 평범한 문장으로 쓰세요.
- 소제목도 별표나 # 기호 없이 그냥 한 줄로 쓰세요.

이제 "${persona.label}" 스타일의 새 블로그 글을 작성하세요.
첫 줄은 검색에 잘 노출될 매력적인 제목으로 시작하고, 그 다음 줄부터 위 인사말로 본문을 시작하세요.

[본문을 마친 뒤 — 이미지 프롬프트 5개]
본문을 모두 작성한 다음, 아래 형식으로 본문 흐름(단락)에 맞는 이미지 프롬프트 5개를 추가하세요.
- 본문과 이미지 프롬프트 사이에 정확히 이 구분선을 넣으세요: ===이미지프롬프트===
- 구분선 아래에 1. 2. 3. 4. 5. 번호를 붙여 한 줄에 하나씩 작성하세요.
- 각 프롬프트는 그 단락의 핵심 장면을 시각화한 묘사입니다(도입부, 질환 설명, 보험사 거절, 반박 근거, 마무리 등).
- 사람이 등장하면 반드시 "한국인"으로 명시하세요.
- 이미지 안에 글자, 숫자, 질병코드, 로고, 표지판, 문서 위 글씨를 절대 넣지 마세요. ("OOO라는 글자가 보인다" 같은 표현 금지)
- 글자 대신 인물의 표정, 손짓, 사물, 색감, 분위기로만 의미를 전달하세요.
- 사실적이고 깔끔한 블로그 삽화 느낌으로, 한국어로 작성하세요.

다른 설명이나 메타 코멘트는 붙이지 마세요.`;

    let text = "";
    let usedModel = "";
    try {
      const out = await generateText(prompt, { temperature: 0.85 });
      text = out.text;
      usedModel = out.model;
    } catch (e: any) {
      if (e instanceof QuotaError)
        return NextResponse.json({ error: e.message }, { status: 429 });
      if (e instanceof NoKeyError)
        return NextResponse.json({ error: e.message }, { status: 500 });
      return NextResponse.json(
        { error: e?.message || "리라이팅에 실패했습니다." },
        { status: 500 }
      );
    }

    // 본문과 이미지 프롬프트 분리 (구분선 표기 흔들림 허용)
    let article = text;
    let imagePrompts: string[] = [];
    const parts = text.split(/={2,}\s*이미지\s*프롬프트\s*={2,}/);
    if (parts.length >= 2) {
      article = parts[0];
      imagePrompts = parts[1]
        .split("\n")
        .map((l) => l.replace(/^\s*\d+[.)]\s*/, "").trim())
        .filter((l) => l.length > 0)
        .slice(0, 5);
    }

    // 마크다운 강조 기호(**), 머리말 # 제거
    const clean = (s: string) =>
      s.replace(/\*\*/g, "").replace(/^#+\s*/gm, "").trim();
    article = clean(article);
    imagePrompts = imagePrompts.map((p) => p.replace(/\*\*/g, "").trim());

    const firstLine = article.split("\n")[0].trim();

    return NextResponse.json({
      title: firstLine,
      content: article,
      imagePrompts,
      model: usedModel,
      persona: persona.label,
      chars: article.replace(/\s/g, "").length,
      sourceChars: sourceText.length,
    });
  } catch (err: any) {
    console.error("rewrite error:", err);
    return NextResponse.json(
      { error: err?.message || "리라이팅 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
