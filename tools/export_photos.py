#!/usr/bin/env python3
"""Copy practitioner photos (base64 in the DB) to static webp files in app/ph/.
The app then loads photos from fasciapp.app instead of Supabase (saves egress).
Re-run after people change photos, then commit + push. Reads only; never writes the DB."""
import json, re, base64, hashlib, io, os, urllib.request
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cfg = open(os.path.join(ROOT, "app/config.js")).read()
U = re.search(r'https://[a-z]+\.supabase\.co', cfg).group(0)
K = re.search(r'sb_publishable_[A-Za-z0-9_-]+', cfg).group(0)
req = urllib.request.Request(U + "/rest/v1/practitioners?select=id,photo&photo=not.is.null", headers={"apikey": K})
rows = json.load(urllib.request.urlopen(req))
out = os.path.join(ROOT, "app/ph"); os.makedirs(out, exist_ok=True)
idx, keep = {}, {"index.json"}
for r in rows:
    m = re.match(r'data:image/[a-z]+;base64,(.*)', r["photo"] or "", re.S)
    if not m: continue
    raw = base64.b64decode(m.group(1)); h = hashlib.sha1(raw).hexdigest()[:8]
    name = f'{r["id"]}-{h}.webp'; keep.add(name); idx[r["id"]] = name
    p = os.path.join(out, name)
    if not os.path.exists(p):
        im = Image.open(io.BytesIO(raw)).convert("RGB"); im.thumbnail((256, 256))
        im.save(p, "WEBP", quality=72, method=6)
for f in os.listdir(out):
    if f not in keep: os.remove(os.path.join(out, f))
json.dump(idx, open(os.path.join(out, "index.json"), "w"), separators=(",", ":"))
print(len(idx), "photos")
