# 🌐 웹에 배포하기 (Vercel — 무료)

로컬에서 `run.bat`으로 띄우지 않고, **인터넷 주소로 어디서나 접속**하게 만드는 방법입니다.
Next.js 앱이라 **Vercel**이 가장 쉽고 무료입니다.

---

## 방법 A. Vercel CLI (가장 빠름, 추천)

터미널에서 아래 순서대로 하면 됩니다. (Claude Code 입력창에서 `!` 를 앞에 붙여 실행해도 됩니다.)

### 1) Vercel 계정 만들기 / 로그인
```
cd C:\Webprogram\blog-writer
npx vercel login
```
- 이메일 또는 GitHub 계정으로 로그인합니다. (계정 없으면 무료 가입)
- 브라우저가 열리면 인증을 완료하세요.

### 2) 첫 배포
```
npx vercel
```
- 몇 가지 질문이 나오면 전부 **Enter**(기본값)로 넘어가면 됩니다.
  - Set up and deploy? → **Y**
  - Which scope? → 본인 계정 선택
  - Link to existing project? → **N**
  - Project name? → 그냥 Enter (blog-writer)
  - Directory? → 그냥 Enter (`./`)
- 끝나면 `https://blog-writer-xxxx.vercel.app` 같은 **임시 주소**가 나옵니다.

### 3) API 키 등록 (중요!)
이게 없으면 글 생성이 안 됩니다.
```
npx vercel env add GEMINI_API_KEY
```
- 값에 본인 Gemini API 키를 붙여넣고 Enter.
- 적용 환경을 물으면 **Production, Preview, Development 전부** 선택(스페이스바로 선택 후 Enter).

또는 더 쉬운 방법: https://vercel.com → 본인 프로젝트 → **Settings → Environment Variables**
에서 `GEMINI_API_KEY` 추가.

### 4) 실서비스 주소로 배포
```
npx vercel --prod
```
- 이제 `https://blog-writer-xxxx.vercel.app` 주소로 **어디서나 접속**됩니다.
- 앞으로 코드를 고치면 `npx vercel --prod` 만 다시 실행하면 갱신됩니다.
  (또는 `deploy.bat` 더블클릭)

---

## 방법 B. GitHub 연동 (★ 이 방식으로 진행 중 — 한 번 설정하면 자동 갱신, 영구 주소)

코드를 GitHub에 올려두면, 수정 후 push만 해도 Vercel이 자동 재배포합니다.

> ✅ 로컬 git 저장소 초기화와 첫 커밋은 **이미 완료**되어 있습니다(main 브랜치).
> 아래 1~4단계만 진행하면 됩니다.

### 1) GitHub에 저장소 만들기
- https://github.com/new 접속
- Repository name: `blog-writer` (아무 이름이나)
- **반드시 Private(비공개)로 설정** — `data/persona.json`에 내 실제 블로그 글 846편이 들어있기 때문입니다.
- README/.gitignore/license는 **추가하지 마세요**(이미 파일이 있음).
- **Create repository** 클릭.

### 2) 내 PC와 연결 후 올리기 (터미널 또는 `!`로 실행)
```
cd C:\Webprogram\blog-writer
git remote add origin https://github.com/<내아이디>/blog-writer.git
git push -u origin main
```
- 첫 push 때 GitHub 로그인 창(브라우저/자격증명 관리자)이 뜨면 로그인하세요.
- `.gitignore`가 `.env.local`을 제외하므로 **API 키는 올라가지 않습니다.**

### 3) Vercel에 연결
- https://vercel.com 로그인(없으면 무료 가입, GitHub 계정으로 가입 추천)
- **Add New → Project → Import Git Repository** 에서 방금 만든 `blog-writer` 선택
  (처음이면 "Install Vercel for GitHub" 권한 허용)
- **Environment Variables** 에 `GEMINI_API_KEY` = (재발급한 Gemini 키) 추가
- **Deploy** 클릭 → 잠시 후 `https://blog-writer-xxxx.vercel.app` 영구 주소 완성

### 4) 끝! 이후 갱신 방법
코드를 고친 뒤 아래만 실행하면 Vercel이 자동으로 새 버전을 배포합니다.
```
cd C:\Webprogram\blog-writer
git add .
git commit -m "수정 내용"
git push
```

---

## ⚠️ 꼭 알아둘 점

- **주소는 공개됩니다.** 주소를 아는 사람은 누구나 접속해 글을 생성할 수 있고, 그만큼 내 Gemini 무료 한도를 씁니다.
  - 외부에 알리지 않으면 사실상 나만 씁니다.
  - 비밀번호 잠금이 필요하면 말씀해 주세요. 간단한 접근 암호를 붙여드릴 수 있습니다.
- **무료 등급 비용:** Vercel 호비(Hobby) 요금제는 무료입니다. 단 호비는 원칙상 비상업적 용도이며,
  사업용으로 본격 사용 시 Pro($20/월)가 필요할 수 있습니다. (개인이 가볍게 쓰는 수준은 보통 무료로 충분)
- **API 키:** 절대 코드에 직접 넣지 말고 위처럼 환경변수로만 등록하세요. (`.env.local`은 배포에 포함되지 않습니다.)
- **함수 실행시간:** 무료 등급은 함수 1회 최대 60초입니다. 글 생성은 보통 5~15초라 충분합니다.
