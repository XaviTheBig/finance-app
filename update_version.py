from pathlib import Path
import json
from datetime import datetime

print(">>> SCRIPT EJECUTADO")
print(">>> Archivo actual:", Path(__file__).resolve())
print(">>> Carpeta actual:", Path.cwd())

base_path = Path(__file__).resolve().parent
version_file = base_path / "version.json"

print(">>> version.json esperado en:", version_file)

with open(version_file, "r", encoding="utf-8") as f:
    data = json.load(f)

print(">>> Versión antes:", data["version"])

major, minor, patch = map(int, data["version"].split("."))
patch += 1

data["version"] = f"{major}.{minor}.{patch}"
data["updatedAt"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

with open(version_file, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(">>> Versión después:", data["version"])
print(">>> Fecha:", data["updatedAt"])
print(">>> FIN")