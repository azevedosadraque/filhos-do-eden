import fitz
from pathlib import Path

path = Path(r"c:\desenv\filhos-do-eden\Regras para imortais (diabos).pdf")
doc = fitz.open(path)
for idx, page in enumerate(doc):
    txt = page.get_text("text")
    up = txt.upper()
    if "ESTA TÉCNICA CRIA PEQUENAS" in up or "ESTA TECNICA CRIA PEQUENAS" in up:
        print('PAGE_INDEX', idx, 'PAGE_NUM', idx + 1)
        print(txt[:4000])
        print('---')
