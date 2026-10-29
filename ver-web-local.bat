@echo off
rem Abre la web en un servidor local (necesario para ver los modelos 3D; con doble clic en index.html no cargan).
cd /d "%~dp0"
start "" "http://localhost:8765/index.html?nointro"
python -m http.server 8765
