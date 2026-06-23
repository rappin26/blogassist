import * as cheerio from "cheerio";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// 손해사정/보험 관련 글로 보이는지 판단하는 키워드
const INSURANCE_HINTS = [
  "보상",
  "손해사정",
  "보험금",
  "보험사",
  "진단비",
  "후유장해",
  "장해",
  "합의금",
  "위자료",
  "약관",
  "면책",
  "부지급",
  "암",
  "보험",
  "지급",
];

// 명백히 손해사정이 아닌 카테고리(일상/여행 등) 제외용
const EXCLUDE_HINTS = [
  "여행",
  "육아",
  "먹방",
  "일상",
  "살림",
  "주부",
  "취미",
  "블챌",
  "맛집",
  "포토",
];

export interface BlogPost {
  blogId: string;
  logNo: string;
  title: string;
  category: string;
  link: string;
}

/** 네이버 블로그 URL 또는 ID 문자열에서 블로그 ID 추출 */
export function parseBlogId(input: string): string {
  const s = (input || "").trim();
  const m = s.match(/blog\.naver\.com\/([^\/?#\s]+)/);
  if (m) return m[1];
  // m.blog.naver.com 형태
  const m2 = s.match(/m\.blog\.naver\.com\/([^\/?#\s]+)/);
  if (m2) return m2[1];
  // ID만 입력한 경우
  return s.replace(/[^a-zA-Z0-9_-]/g, "");
}

function looksInsurance(title: string, category: string): boolean {
  const hay = `${title} ${category}`;
  if (EXCLUDE_HINTS.some((k) => category.includes(k))) return false;
  return INSURANCE_HINTS.some((k) => hay.includes(k));
}

/** RSS 피드에서 최신 글 목록을 가져온다 (손해사정 글 우선 정렬, 최대 limit개) */
export async function fetchLatestPosts(
  blogId: string,
  limit = 5
): Promise<BlogPost[]> {
  const res = await fetch(`https://rss.blog.naver.com/${blogId}.xml`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) {
    throw new Error(
      "RSS 피드를 가져올 수 없습니다. 블로그가 비공개이거나 주소가 잘못됐을 수 있습니다."
    );
  }
  const xml = await res.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

  const pick = (block: string, tag: string): string => {
    // CDATA가 있으면 그 안을, 없으면 일반 텍스트를 추출한다.
    const m = block.match(
      new RegExp(
        `<${tag}>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))\\s*</${tag}>`
      )
    );
    return m ? ((m[1] !== undefined ? m[1] : m[2]) || "").trim() : "";
  };

  const all: BlogPost[] = [];
  for (const it of items) {
    const block = it[1];
    const title = pick(block, "title");
    const category = pick(block, "category");
    const link = pick(block, "link");
    const logMatch = link.match(/\/(\d+)(?:\?|$)/);
    if (!logMatch) continue;
    all.push({
      blogId,
      logNo: logMatch[1],
      title,
      category,
      link: link.split("?")[0],
    });
  }

  // 손해사정 글을 우선 노출, 부족하면 최신 글로 채움
  const insurance = all.filter((p) => looksInsurance(p.title, p.category));
  const chosen = insurance.length >= limit ? insurance : [...insurance];
  if (chosen.length < limit) {
    for (const p of all) {
      if (chosen.find((c) => c.logNo === p.logNo)) continue;
      chosen.push(p);
      if (chosen.length >= limit) break;
    }
  }
  return chosen.slice(0, limit);
}

/** PostView.naver 로 본문 텍스트를 추출한다 (iframe 우회) */
export async function fetchPostBody(
  blogId: string,
  logNo: string
): Promise<string> {
  const url = `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error("글 본문을 가져오지 못했습니다.");
  const html = await res.text();
  const $ = cheerio.load(html);

  let text = $(".se-main-container").text();
  if (!text.trim()) text = $("#postViewArea").text();
  if (!text.trim()) text = $(".se-viewer").text();

  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) throw new Error("본문이 비어 있습니다. (이미지로만 된 글일 수 있어요)");
  return clean;
}
