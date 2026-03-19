import urllib.parse
import urllib.request

q = 'Magnetismo "Filhos do Éden"'
url = 'https://www.bing.com/search?format=rss&q=' + urllib.parse.quote(q)
with urllib.request.urlopen(url, timeout=20) as r:
    xml = r.read().decode('utf-8', errors='ignore')
print(xml)
