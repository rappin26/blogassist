"use client";

import { useState, useEffect } from "react";

// 선택 화면용 간단 정보 (상세 문체/견본은 서버의 lib/personas.ts에 있음)
const PERSONAS = [
  { id: "hada", label: "안녕하다 (보상하다)", blurb: "친근+단호, 비유 많은 8단 공식" },
  { id: "kind", label: "친절보상", blurb: "차분·정돈된 안내서 톤, 코드 대조" },
  { id: "hero", label: "보상히어로", blurb: "히어로 컨셉 자신감, 표·후유장해 챙김" },
  { id: "maestro", label: "법률사무소 마에스트로", blurb: "격식 법률체, 의뢰인 호칭, 해시태그 마무리" },
];

// 저장된 손해사정사 소스 블로그 (클릭해서 추가 / 전체 불러오기)
const SOURCE_BLOGS = [
  { id: "jung9213", name: "이주희 손해사정사" },
  { id: "jjhyung0414", name: "이루다손해사정법인" },
  { id: "shhy1227", name: "까꿍베베 보상이야기" },
  { id: "jhsolove", name: "김손사의 보상강의" },
  { id: "since05", name: "보상마스터즈" },
  { id: "ami6125", name: "재테크 보상담당자" },
  { id: "hyemi8300", name: "보상이 알고싶다" },
  { id: "bosang1005", name: "보험금을 부탁해" },
  { id: "lsy1618", name: "보험금헌터" },
  { id: "abc_bosang", name: "ABC보상" },
  { id: "law-insurance", name: "보상법률전문가" },
  { id: "bosanglove", name: "보상연구소" },
  { id: "thesunnyclaim", name: "손해사정법인 더맑음" },
  { id: "fyss7553", name: "포유손해사정" },
  { id: "ssfm72", name: "더애플손해사정법인" },
];

interface Post {
  blogId: string;
  logNo: string;
  title: string;
  category: string;
  link: string;
}
interface BlogResult {
  blogId: string;
  posts?: Post[];
  error?: string;
}

export default function Home() {
  const [persona, setPersona] = useState("hada");
  const [urlsText, setUrlsText] = useState("");
  const [blogs, setBlogs] = useState<BlogResult[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");

  const [activeKey, setActiveKey] = useState("");
  const [lastPost, setLastPost] = useState<Post | null>(null);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [content, setContent] = useState("");
  const [imagePrompts, setImagePrompts] = useState<string[]>([]);
  const [info, setInfo] = useState<{
    model: string;
    chars: number;
    link: string;
    title: string;
    persona: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState("");

  function currentIds(): string[] {
    return urlsText
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
  }

  function addBlog(id: string) {
    const ids = currentIds();
    if (ids.includes(id)) return; // 중복 방지
    setUrlsText([...ids, id].join("\n"));
  }

  function loadAll() {
    setUrlsText(SOURCE_BLOGS.map((b) => b.id).join("\n"));
  }

  // 페이지 진입 시 저장된 블로그 전체의 최신 글을 자동으로 불러온다.
  useEffect(() => {
    const all = SOURCE_BLOGS.map((b) => b.id);
    setUrlsText(all.join("\n"));
    fetchTitles(all);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchTitles(urlsParam?: string[]) {
    const urls =
      urlsParam ??
      urlsText
        .split("\n")
        .map((u) => u.trim())
        .filter(Boolean);
    if (!urls.length) {
      setListError("블로그 주소를 한 줄에 하나씩 입력해주세요.");
      return;
    }
    setListLoading(true);
    setListError("");
    setBlogs([]);
    try {
      const res = await fetch("/api/fetch-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const data = await res.json();
      if (!res.ok) setListError(data.error || "목록을 가져오지 못했습니다.");
      else setBlogs(data.blogs || []);
    } catch (e: any) {
      setListError(e?.message || "네트워크 오류");
    } finally {
      setListLoading(false);
    }
  }

  async function rewrite(post: Post) {
    const key = post.blogId + post.logNo;
    setActiveKey(key);
    setLastPost(post);
    setRewriteLoading(true);
    setError("");
    setContent("");
    setImagePrompts([]);
    setInfo(null);
    setCopiedKey("");
    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blogId: post.blogId,
          logNo: post.logNo,
          title: post.title,
          personaId: persona,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "리라이팅 실패");
      } else {
        setContent(data.content);
        setImagePrompts(data.imagePrompts || []);
        setInfo({
          model: data.model,
          chars: data.chars,
          link: post.link,
          title: data.title,
          persona: data.persona,
        });
      }
    } catch (e: any) {
      setError(e?.message || "네트워크 오류");
    } finally {
      setRewriteLoading(false);
    }
  }

  async function copyTo(text: string, key: string) {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 1500);
  }

  function download() {
    if (!content) return;
    const name = (info?.title || "blog").slice(0, 40);
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const personaLabel = PERSONAS.find((p) => p.id === persona)?.label || "";

  return (
    <div className="wrap">
      <div className="header">
        <h1>✍️ 손해사정 블로그 리라이팅 어시스턴트</h1>
        <p>
          ① 문체를 고르고 → ② 좌측에 자동으로 불러온 손해사정 블로그 글을 클릭하면, 고른
          문체로 유사하지 않게 새로 써드립니다.
        </p>
      </div>

      {/* STEP 1 — 문체(페르소나) 선택 */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <div className="step-label">어떤 블로그 문체로 쓸까요?</div>
        <div className="persona-grid">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              className={`persona-card ${persona === p.id ? "active" : ""}`}
              onClick={() => setPersona(p.id)}
              type="button"
            >
              <div className="persona-name">{p.label}</div>
              <div className="persona-blurb">{p.blurb}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="layout">
        {/* 좌측 — 참고 블로그 글 목록 (페이지 진입 시 자동 로딩) */}
        <div className="card list-card">
          <div className="list-toolbar">
            <h2>📰 참고 블로그 글</h2>
            <button
              className="toolbtn"
              onClick={() => fetchTitles()}
              disabled={listLoading}
            >
              {listLoading ? (
                <>
                  <span className="spinner-dark" /> 불러오는 중
                </>
              ) : (
                "🔄 다시 불러오기"
              )}
            </button>
          </div>

          {/* 블로그 직접 추가 / 편집 (필요할 때만 펼치기) */}
          <details className="add-source">
            <summary>＋ 블로그 직접 추가 / 편집</summary>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>
                저장된 블로그 (클릭해서 추가)
              </span>
              <button className="toolbtn" onClick={loadAll} type="button">
                전체 채우기 ({SOURCE_BLOGS.length})
              </button>
            </div>
            <div className="chips" style={{ marginBottom: "12px" }}>
              {SOURCE_BLOGS.map((b) => (
                <button
                  key={b.id}
                  className="chip"
                  type="button"
                  onClick={() => addBlog(b.id)}
                  title={b.id}
                >
                  {b.name}
                </button>
              ))}
            </div>
            <textarea
              style={{ minHeight: "70px", marginBottom: "10px" }}
              placeholder={
                "한 줄에 하나씩 (네이버 블로그 주소 또는 아이디)\nhttps://blog.naver.com/example1\nexample2"
              }
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
            />
            <button
              className="btn"
              onClick={() => fetchTitles()}
              disabled={listLoading}
            >
              {listLoading ? (
                <>
                  <span className="spinner" />
                  불러오는 중...
                </>
              ) : (
                "이 목록으로 최신 글 5개 가져오기"
              )}
            </button>
          </details>

          {listError && <div className="error">{listError}</div>}

          <div className="list-scroll">
            {listLoading && blogs.length === 0 ? (
              <div className="placeholder" style={{ minHeight: "200px" }}>
                저장된 블로그에서 최신 글을 불러오는 중입니다...
              </div>
            ) : blogs.length === 0 ? (
              <div className="placeholder" style={{ minHeight: "200px" }}>
                불러온 글이 없습니다. 🔄 다시 불러오기를 눌러주세요.
              </div>
            ) : (
              <div>
                {blogs.map((b) => (
                  <div key={b.blogId} style={{ marginBottom: "18px" }}>
                    <div className="blog-id">📌 {b.blogId}</div>
                    {b.error ? (
                      <div className="error">{b.error}</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                        {b.posts?.map((p) => {
                          const key = p.blogId + p.logNo;
                          return (
                            <button
                              key={key}
                              className={`post-item ${activeKey === key ? "active" : ""}`}
                              onClick={() => rewrite(p)}
                              disabled={rewriteLoading}
                              title={`'${personaLabel}' 문체로 새로 작성합니다`}
                            >
                              <span className="post-cat">{p.category || "기타"}</span>
                              <span className="post-title">{p.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 결과 */}
        <div className="card output">
          <div className="output-head">
            <h2>새 글 · {personaLabel}</h2>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="toolbtn"
                onClick={() => lastPost && rewrite(lastPost)}
                disabled={!lastPost || rewriteLoading}
                title="같은 글을 다시 생성합니다"
              >
                🔄 다시 생성
              </button>
              <button
                className="toolbtn"
                onClick={() => copyTo(content, "article")}
                disabled={!content}
              >
                {copiedKey === "article" ? "복사됨 ✓" : "글 복사"}
              </button>
              <button className="toolbtn" onClick={download} disabled={!content}>
                .md 저장
              </button>
            </div>
          </div>

          {/* 비교용 원문 링크 */}
          {lastPost && (
            <div className="source-bar">
              <span className="source-tag">비교용 원문</span>
              <span className="source-title">{lastPost.title}</span>
              <a href={lastPost.link} target="_blank" rel="noreferrer">
                원문 열기 ↗
              </a>
            </div>
          )}

          {/* 작성 중 진행 표시 */}
          {rewriteLoading && (
            <div className="progress-box">
              <div className="progress-row">
                <span className="spinner-dark" />
                <span>
                  원문을 가져와 '{personaLabel}' 문체로 작성하는 중이에요... (보통
                  10~20초)
                </span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" />
              </div>
            </div>
          )}

          {content ? (
            <div className="article">{content}</div>
          ) : (
            !rewriteLoading && (
              <div className="placeholder">
                왼쪽 목록에서 글 제목을 클릭하면 여기에 새 글이 나옵니다.
              </div>
            )
          )}

          {error && (
            <div className="error">
              {error}
              {lastPost && (
                <button
                  className="retry-btn"
                  onClick={() => rewrite(lastPost)}
                  disabled={rewriteLoading}
                >
                  🔄 다시 시도
                </button>
              )}
            </div>
          )}

          {/* 이미지 프롬프트 */}
          {imagePrompts.length > 0 && (
            <div className="prompts">
              <div className="prompts-head">
                <h3>🖼️ 이미지 프롬프트 ({imagePrompts.length})</h3>
                <button
                  className="toolbtn"
                  onClick={() =>
                    copyTo(
                      imagePrompts.map((p, i) => `${i + 1}. ${p}`).join("\n"),
                      "all-prompts"
                    )
                  }
                >
                  {copiedKey === "all-prompts" ? "복사됨 ✓" : "전체 복사"}
                </button>
              </div>
              {imagePrompts.map((p, i) => (
                <div className="prompt-item" key={i}>
                  <span className="prompt-num">{i + 1}</span>
                  <span className="prompt-text">{p}</span>
                  <button
                    className="toolbtn prompt-copy"
                    onClick={() => copyTo(p, `p${i}`)}
                  >
                    {copiedKey === `p${i}` ? "✓" : "복사"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {info && (
            <div className="meta">
              {info.chars.toLocaleString()}자 · 문체: {info.persona} · 모델:{" "}
              {info.model} ·{" "}
              <a href={info.link} target="_blank" rel="noreferrer">
                원문 보기
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
