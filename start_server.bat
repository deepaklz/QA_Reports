@echo off
echo ============================================
echo  SaaS Testing Report Dashboard
echo  Starting server at http://localhost:8080
echo ============================================
echo.
python convert_excel.py
echo.
echo Opening browser...
start http://localhost:8080
python -m http.server 8080
pause
