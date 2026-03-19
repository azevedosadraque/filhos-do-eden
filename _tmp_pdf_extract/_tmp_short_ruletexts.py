import re
from pathlib import Path

path = Path(r"c:\desenv\filhos-do-eden\scripts\data\tecnicas.js")
text = path.read_text(encoding="utf-8")
pattern = re.compile(r'technique\("([^"]+)".*?ruleText:\s*"((?:[^"\\]|\\.)*)"', re.S)
rows = []
for match in pattern.finditer(text):
    key = match.group(1)
    rule = match.group(2).encode("utf-8").decode("unicode_escape")
    rows.append((len(rule), key, rule[:110].replace("\n", " ")))

for length, key, snippet in sorted(rows)[:25]:
    print(f"{length:4} {key:30} {snippet}")
