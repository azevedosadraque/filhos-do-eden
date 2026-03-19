import urllib.parse
import urllib.request

q = '"Esta técnica cria pequenas alterações no padrão das chamas"'
url = 'https://duckduckgo.com/html/?q=' + urllib.parse.quote(q)
with urllib.request.urlopen(url, timeout=20) as r:
    html = r.read().decode('utf-8', errors='ignore')
print(html[:12000])
