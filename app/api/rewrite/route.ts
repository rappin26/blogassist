import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { fetchPostBody } from "@/lib/naver";
import { getStyleSamples } from "@/lib/persona";
import { getPersona } from "@/lib/personas";

export const runtime = "nodejs";
export const maxDuration = 60;

const CANDIDATE_MODELS = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.0-flash",
  "gemini-pro-latest",
];

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY가 설정되지 않았습니다. .env.local 파일을 확인하세요." },
        { status: 500 }
      );
    }

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

이제 "${persona.label}" 스타일의 새 블로그 글을 작성하세요.
첫 줄은 검색에 잘 노출될 매력적인 제목으로 시작하고, 그 다음 줄부터 위 인사말로 본문을 시작하세요.
다른 설명이나 메타 코멘트는 붙이지 마세요.`;

    const genAI = new GoogleGenerativeAI(apiKey);

    let text = "";
    let usedModel = "";
    let lastError: any = null;

    for (const modelName of CANDIDATE_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { temperature: 0.85, maxOutputTokens: 8192 },
        });
        const result = await model.generateContent(prompt);
        text = result.response.text().trim();
        if (text) {
          usedModel = modelName;
          break;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!text) {
      return NextResponse.json(
        { error: lastError?.message || "리라이팅에 실패했습니다. 잠시 후 다시 시도해주세요." },
        { status: 500 }
      );
    }

    const lines = text.split("\n");
    const firstLine = lines[0].replace(/^#+\s*/, "").trim();

    return NextResponse.json({
      title: firstLine,
      content: text.replace(/^#\s*/, ""),
      model: usedModel,
      persona: persona.label,
      chars: text.replace(/\s/g, "").length,
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
