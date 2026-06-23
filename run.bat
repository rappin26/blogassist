@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist node_modules (
    echo [설치] 처음 실행이라 패키지를 설치합니다. 잠시 기다려주세요...
    call npm install
)

echo.
echo ============================================
echo  블로그 글 작성기를 시작합니다.
echo  브라우저에서 http://localhost:3000 을 여세요.
echo  종료하려면 이 창에서 Ctrl+C 를 누르세요.
echo ============================================
echo.

call npm run dev
pause
