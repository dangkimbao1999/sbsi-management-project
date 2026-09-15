@echo off
chcp 65001 >nul
echo ========================================================
echo   SBSI MANAGEMENT PROJECT - DONG BO GITHUB AUTO PUSH
echo ========================================================
echo.
cd /d "%~dp0"
set "PATH=C:\Users\AD\.tools\git\cmd;%PATH%"
echo 1. Kiem tra commit moi nhat...
git log -1 --oneline
echo.
echo 2. Dang tien hanh day len GitHub (https://github.com/dangkimbao1999/sbsi-management-project)...
echo (Neu trinh duyet mo popup dang nhap GitHub, vui long bam "Authorize" de xac thuc).
echo.
git push origin main
if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo   [THANH CONG] Da day toan bo ma nguon len GitHub!
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo   [CHUA HOAN TAT] Vui long kiem tra lai quyen truy cap GitHub!
    echo ========================================================
)
echo.
pause
