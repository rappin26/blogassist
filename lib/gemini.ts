import { GoogleGenerativeAI } from "@google/generative-ai";

// 무료 등급에서 시도할 모델 (앞에서부터 순차 시도)
const MODELS = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.0-flash",
  "gemini-pro-latest",
];

export class NoKeyError extends Error {}
export class QuotaError extends Error {}

/**
 * 환경변수에서 사용 가능한 Gemini API 키를 모두 모은다.
 * - GEMINI_API_KEYS: 콤마로 구분된 여러 키 (예: "키1,키2,키3")
 * - GEMINI_API_KEY, GEMINI_API_KEY_2 ~ _5: 개별 키
 * 앞에 있는 키부터 우선 사용하고, 한도(429)에 걸리면 다음 키로 넘어간다.
 */
export function getApiKeys(): string[] {
  const keys: string[] = [];
  const add = (v?: string) => {
    if (v && v.trim()) keys.push(v.trim());
  };
  (process.env.GEMINI_API_KEYS || "").split(",").forEach((k) => add(k));
  add(process.env.GEMINI_API_KEY);
  add(process.env.GEMINI_API_KEY_2);
  add(process.env.GEMINI_API_KEY_3);
  add(process.env.GEMINI_API_KEY_4);
  add(process.env.GEMINI_API_KEY_5);
  return [...new Set(keys)]; // 중복 제거
}

export function isQuotaError(e: any): boolean {
  const m = String(e?.message || "");
  return m.includes("429") || /quota|Too Many Requests|rate.?limit/i.test(m);
}

/**
 * 모델 × 키 조합을 순차 시도하며 텍스트를 생성한다.
 * 같은 모델을 먼저 모든 키로 시도(예비키 활용) → 안 되면 다음 모델.
 */
export async function generateText(
  prompt: string,
  opts?: { temperature?: number }
): Promise<{ text: string; model: string; keyIndex: number }> {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new NoKeyError(
      "GEMINI_API_KEY가 설정되지 않았습니다. .env.local(또는 배포 환경변수)을 확인하세요."
    );
  }

  let lastError: any = null;
  let sawQuota = false;

  for (const modelName of MODELS) {
    for (let i = 0; i < keys.length; i++) {
      try {
        const genAI = new GoogleGenerativeAI(keys[i]);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: opts?.temperature ?? 0.85,
            maxOutputTokens: 8192,
          },
        });
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        if (text) return { text, model: modelName, keyIndex: i };
      } catch (e) {
        lastError = e;
        if (isQuotaError(e)) sawQuota = true;
      }
    }
  }

  if (sawQuota) {
    throw new QuotaError(
      "지금 Gemini 무료 사용량 한도에 도달했어요. 약 1분 뒤에 다시 시도하거나, 예비 API 키(GEMINI_API_KEY_2)를 추가해주세요."
    );
  }
  throw new Error(
    String(lastError?.message || "생성에 실패했습니다. 잠시 후 다시 시도해주세요.")
  );
}
