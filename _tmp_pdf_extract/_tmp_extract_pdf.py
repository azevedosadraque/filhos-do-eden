from pypdf import PdfReader
from pathlib import Path

path = Path(r"c:\desenv\filhos-do-eden\Módulo de regras para o cenário (anjo).pdf")
reader = PdfReader(str(path))
print("pages", len(reader.pages))
for i, page in enumerate(reader.pages):
    text = page.extract_text() or ""
    up = text.upper()
    if "MAGNETISMO" in up or "MENTE EM BRANCO" in up:
        print("PAGE", i + 1)
        print(text[:8000])
        print("---END---")
