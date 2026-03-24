from pypdf import PdfReader
from pathlib import Path

path = Path(r"c:\desenv\filhos-do-eden\Módulo de regras para o cenário (anjo).pdf")
reader = PdfReader(str(path))
page = reader.pages[43]
try:
    text = page.extract_text(extraction_mode="layout")
except TypeError:
    text = page.extract_text()
print(text)
