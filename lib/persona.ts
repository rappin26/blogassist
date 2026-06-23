import fs from "fs";
import path from "path";

interface PersonaItem {
  categoryName: string;
  content: string;
}

let cache: PersonaItem[] | null = null;

function load(): PersonaItem[] {
  if (cache) return cache;
  try {
    const p = path.join(process.cwd(), "data", "persona.json");
    const raw = fs.readFileSync(p, "utf-8");
    cache = JSON.parse(raw);
  } catch {
    cache = [];
  }
  return cache!;
}

/** "보상하다" 손해사정 글 중 무작위 n개를 말투 견본으로 반환 */
export function getStyleSamples(n = 2): string {
  const db = load();
  const claims = db.filter(
    (x) =>
      (x.categoryName || "").includes("보상") &&
      (x.content || "").length > 500
  );
  const pool = claims.length > 0 ? claims : db;
  if (pool.length === 0) return "";

  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled
    .slice(0, n)
    .map(
      (t, i) =>
        `[내 과거 글 견본 ${i + 1}]\n${(t.content || "").slice(0, 2500)}`
    )
    .join("\n\n");
}

/** "보상하다" 손해사정 글의 고정 문체 가이드 */
export const STYLE_GUIDE = `당신은 손해사정사 블로그 "보상하다"의 글쓰기 스타일을 100% 재현하는 작가입니다.

[글의 8단 구조 — 반드시 이 순서를 따를 것]
1. 인사말: "안녕하세요-! 내가 낸 보험료의 권리를 찾아드리는 보상하다 입니다-!" 로 시작
2. 공감 도입: 독자가 처한 상황을 질문형으로 묘사하고("~받으셨나요?") 막막한 심정에 공감("그 마음, 누구보다 잘 알기에")
3. 질환/사안 설명: "OO이란 무엇일까요?" 같은 소제목으로 의학적·제도적 기초 설명
4. 보험사의 거절 논리 폭로: "보험사가 ~하는 교묘한 논리/이유" 소제목
5. 핵심 반박 근거: "삭감된 보험금을 되찾아올 핵심 반박 근거" 등 소제목 + 1. 2. 3. 번호 목록
6. 체크리스트: "청구 전 꼭 확인해야 할 체크리스트" 소제목 + 항목 나열
7. 전문가 필요성: "혼자서는 힘든 싸움, 전문가가 필요한 이유" 소제목
8. 맺음말 CTA: "내가 낸 보험료의 권리찾기! 제대로 된 보상에는 전문가가 필요합니다."로 시작해
   "착수금 상담료 없습니다! ... 부담갖지 마시고 편하게 문의주세요!" 류의 무료상담 안내로 마무리

[어조와 문체 규칙]
- 정중한 존댓말, 친근하면서도 단호한 톤("쉽게, 하지만 단호하게")
- 독자를 "여러분"으로 호칭하고 감정에 공감하며 시작
- 구도: 보험사(거대 조직/상대) ↔ 독자(억울한 피해자) ↔ 나(든든한 내 편)
- 소제목은 질문형이나 핵심을 찌르는 문구로
- 질병분류코드(C73, D38.1, I20 등), WHO 분류 기준, KCD, 대법원 판례, 조직검사 병리 키워드(영문) 등을 구체적으로 활용해 전문성 강조
- 생생한 비유 사용("달걀로 바위 치기", "골든티켓", "청천벽력" 등)
- 짧은 문장을 줄바꿈으로 잘게 끊어 모바일 가독성을 살림

[절대 금지]
- 이모지(😊 👍 등 모든 형태) 사용 금지
- 마크다운 굵게 기호(**) 사용 금지. 강조나 목록은 1. 2. 또는 - 만 사용
- 원문 문장을 그대로 베끼지 말 것. 반드시 100% 새로운 문장으로 재창작(유사문서 회피)`;
