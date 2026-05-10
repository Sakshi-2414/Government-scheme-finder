@echo off
echo =======================================
echo  Government Scheme Finder - Windows
echo =======================================

echo Installing Python dependencies...
pip install -r requirements.txt

echo Installing Node dependencies...
cd client
npm install
cd ..

echo Starting Python backend...
start "Backend" cmd /k "cd server && python app.py"

timeout /t 2 /nobreak >nul

echo Starting React frontend...
start "Frontend" cmd /k "cd client && npm run dev"

echo.
echo App is starting...
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5001
echo.
pause
