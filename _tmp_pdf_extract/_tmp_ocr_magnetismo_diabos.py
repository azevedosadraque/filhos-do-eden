import fitz
from pathlib import Path
from rapidocr_onnxruntime import RapidOCR

path = Path(r"c:\desenv\filhos-do-eden\Regras para imortais (diabos).pdf")
doc = fitz.open(path)
for idx, page in enumerate(doc):
    txt = page.get_text("text")
    if "MAGNETISMO" in txt.upper():
        print('PAGE_INDEX', idx, 'PAGE_NUM', idx + 1)
        rect = fitz.Rect(0, 640, 320, page.rect.height)
        pix = page.get_pixmap(matrix=fitz.Matrix(6, 6), clip=rect, alpha=False)
        out = Path(r"c:\desenv\filhos-do-eden\_tmp_magnetismo_diabos.png")
        pix.save(out)
        engine = RapidOCR()
        result, _ = engine(str(out))
        print('IMAGE', out)
        if not result:
            print('NO_OCR_RESULT')
        else:
            for item in result:
                print(item)
        break
