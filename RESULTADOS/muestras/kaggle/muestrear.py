# Muestras reproducibles del dataset Kaggle sid321axn/malicious-urls-dataset.
# Uso: python -I muestrear.py <ruta a malicious_phish.csv> <carpeta de salida>
import csv, json, random, sys
src, out = sys.argv[1], sys.argv[2]
by = {}
with open(src, encoding='utf-8', errors='replace') as f:
    r = csv.reader(f); next(r)
    for row in r:
        if len(row) >= 2:
            by.setdefault(row[1], []).append(row[0])
rng = random.Random(42)
# A: F1 a escala, 500 por clase.
a = [{'url': u, 'label': t} for t in sorted(by) for u in rng.sample(by[t], 500)]
# B: cascada completa, tamano del protocolo: 50 maliciosas (20 phishing,
# 15 malware, 15 defacement) + 50 legitimas. Disjunta de A.
used = {x['url'] for x in a}
def pick(t, n): return [{'url': u, 'label': t} for u in rng.sample([u for u in by[t] if u not in used], n)]
b = pick('phishing', 20) + pick('malware', 15) + pick('defacement', 15) + pick('benign', 50)
json.dump(a, open(f'{out}/muestra_A_f1.json', 'w'), indent=0)
json.dump(b, open(f'{out}/muestra_B_cascada.json', 'w'), indent=0)
print(len(a), len(b))
