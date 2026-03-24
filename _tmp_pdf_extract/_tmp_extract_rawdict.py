import fitz
from pathlib import Path
import json

path = Path(r"c:\desenv\filhos-do-eden\Módulo de regras para o cenário (anjo).pdf")
doc = fitz.open(path)
page = doc[43]
raw = page.get_text("rawdict")
for block in raw.get("blocks", []):
    if block.get("type") != 0:
        continue
    for line in block.get("lines", []):
        bbox = line.get("bbox", [0,0,0,0])
        y0 = bbox[1]
        x0 = bbox[0]
        if y0 >= 700:
            print("LINE", bbox)
            text = ""
            for span in line.get("spans", []):
                for ch in span.get("chars", []):
                    text += ch.get("c", "")
            print(repr(text))
            print("---")
