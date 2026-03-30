import json
from datetime import datetime

# Leer version.json
with open("version.json", "r") as f:
    data = json.load(f)

# Separar versión
version = data["version"].split(".")
major, minor, patch = map(int, version)

# Incrementar PATCH (último número)
patch += 1

new_version = f"{major}.{minor}.{patch}"

# Nueva fecha
now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# Guardar cambios
data["version"] = new_version
data["updatedAt"] = now

with open("version.json", "w") as f:
    json.dump(data, f, indent=2)

print(f"✅ Nueva versión: {new_version}")