@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo  Vercel로 웹 배포합니다.
echo  - 처음 실행이면 브라우저에서 로그인하라고 나옵니다.
echo  - 질문이 나오면 대부분 Enter(기본값)로 넘어가면 됩니다.
echo  - 배포 후 GEMINI_API_KEY 환경변수 등록을 잊지 마세요!
echo    (자세한 건 DEPLOY.md 참고)
echo ============================================
echo.

call npx vercel --prod
echo.
pause
