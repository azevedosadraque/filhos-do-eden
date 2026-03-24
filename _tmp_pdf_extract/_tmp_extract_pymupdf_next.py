import fitz
from pathlib import Path

path = Path(r"c:\desenv\filhos-do-eden\Módulo de regras para o cenário (anjo).pdf")
doc = fitz.open(path)
for idx in (43, 44):
    page = doc[idx]
    print(f"=== PAGE {idx + 1} TEXT ===")
    print(page.get_text("text"))
    print(f"=== PAGE {idx + 1} BLOCKS ===")
    blocks = page.get_text("blocks")
    for b in sorted(blocks, key=lambda x: (round(x[1], 1), round(x[0], 1))):
        x0, y0, x1, y1, text, *_ = b
        print(f"BLOCK ({x0:.1f},{y0:.1f})-({x1:.1f},{y1:.1f})")
        print(text)
        print("---")
