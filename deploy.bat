@echo off
py update_version.py
if errorlevel 1 (
  echo Error al actualizar version
  pause
  exit /b
)

git add .
git commit -m "deploy new version"
git push