@echo off
setlocal
cd /d "%~dp0"
echo.
echo  Automation and Robotics - Feedback Portal
echo  -----------------------------------------
echo.
echo  Open http://127.0.0.1:8765 in your browser after this starts.
echo.
py app.py
if errorlevel 1 (
  echo.
  echo If required, install Python and ReportLab first.
  echo Command: py -m pip install reportlab
)
pause
