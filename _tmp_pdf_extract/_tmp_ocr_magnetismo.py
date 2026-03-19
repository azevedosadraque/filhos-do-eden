import fitz
from pathlib import Path
from rapidocr_onnxruntime import RapidOCR

path = Path(r"c:\desenv\filhos-do-eden\Módulo de regras para o cenário (anjo).pdf")
doc = fitz.open(path)
page = doc[43]
print('PAGE_RECT', page.rect)
rect = fitz.Rect(0, 640, 320, page.rect.height)
pix = page.get_pixmap(matrix=fitz.Matrix(6, 6), clip=rect, alpha=False)
out = Path(r"c:\desenv\filhos-do-eden\_tmp_magnetismo_crop.png")
pix.save(out)
engine = RapidOCR()
result, _ = engine(str(out))
print('IMAGE', out)
if not result:
    print('NO_OCR_RESULT')
else:
    for item in result:
        print(item)
