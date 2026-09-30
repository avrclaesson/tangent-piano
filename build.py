#!/usr/bin/env python3
"""Build Tangent: dist/app (installable PWA) and dist/preview.html (artifact fragment)."""
import json, os, shutil
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC, DIST = os.path.join(ROOT, 'src'), os.path.join(ROOT, 'dist')
APP = os.path.join(DIST, 'app')
VERSION = 'tangent-v1'

shutil.rmtree(DIST, ignore_errors=True)
os.makedirs(APP)

detect = open(os.path.join(SRC, 'detect.js')).read()
detect = detect.replace("if (typeof module !== 'undefined') module.exports = { yin, createDetector };", '')
fragment = open(os.path.join(SRC, 'app.html')).read().replace('/*DETECT*/', detect)

open(os.path.join(DIST, 'preview.html'), 'w').write(fragment)

head_extra = '''<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="theme-color" content="#1b1311">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Tangent">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" href="icon-192.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}</style>
'''
title_end = fragment.index('</title>') + len('</title>')
head_part, body_part = fragment[:title_end], fragment[title_end:]
# keep <link>/<style> in head: split at first <div class="app">
split = body_part.index('<div class="app">')
index = ('<!doctype html>\n<html lang="en">\n<head>\n' + head_extra + head_part + body_part[:split]
         + '</head>\n<body>\n' + body_part[split:] + '\n</body>\n</html>\n')
open(os.path.join(APP, 'index.html'), 'w').write(index)

manifest = {
    "name": "Tangent Piano", "short_name": "Tangent",
    "description": "Play along on your piano. Tangent listens and tells you if the note and timing were right.",
    "start_url": "./", "scope": "./", "display": "standalone", "orientation": "portrait",
    "background_color": "#1b1311", "theme_color": "#1b1311",
    "icons": [
        {"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
        {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
    ],
}
json.dump(manifest, open(os.path.join(APP, 'manifest.webmanifest'), 'w'), indent=2)

sw = f'''const V = '{VERSION}';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', (e) => {{ e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL))); self.skipWaiting(); }});
self.addEventListener('activate', (e) => {{
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))));
  self.clients.claim();
}});
self.addEventListener('fetch', (e) => {{
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const cacheable = url.origin === location.origin || url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com');
  if (!cacheable) return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {{
    if (res.ok) {{ const copy = res.clone(); caches.open(V).then((c) => c.put(e.request, copy)); }}
    return res;
  }}).catch(() => caches.match('./index.html'))));
}});
'''
open(os.path.join(APP, 'sw.js'), 'w').write(sw)

# Icon: mahogany tile, three ivory keys with a black key, a brass note falling onto them.
def icon(size, pad=0.0):
    S = 1024
    im = Image.new('RGB', (S, S), (27, 19, 17))
    d = ImageDraw.Draw(im)
    inset = int(S * pad)
    x0, x1 = 170 + inset // 2, 854 - inset // 2
    top, bot = 560, 860 - inset // 3
    kw = (x1 - x0) / 3
    for i in range(3):
        d.rounded_rectangle([x0 + i * kw + 8, top, x0 + (i + 1) * kw - 8, bot], radius=28, fill=(242, 234, 216))
    bw = kw * 0.55
    bx = x0 + kw * 2 - bw / 2
    d.rounded_rectangle([bx, top - 4, bx + bw, top + (bot - top) * 0.58], radius=18, fill=(26, 18, 16))
    nx = x0 + kw * 0.5
    d.rounded_rectangle([nx - kw * 0.36, 190 + inset // 3, nx + kw * 0.36, 470], radius=34, fill=(217, 164, 65))
    d.rectangle([x0 - 20, 510, x1 + 20, 526], fill=(217, 164, 65))
    return im.resize((size, size), Image.LANCZOS)

icon(192).save(os.path.join(APP, 'icon-192.png'))
icon(512, pad=0.12).save(os.path.join(APP, 'icon-512.png'))
icon(180).save(os.path.join(APP, 'apple-touch-icon.png'))
shutil.copy(os.path.join(APP, 'manifest.webmanifest'), DIST)
for f in ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png']:
    shutil.copy(os.path.join(APP, f), DIST)
shutil.make_archive(os.path.join(DIST, 'tangent-piano'), 'zip', APP)
print('built', os.listdir(APP))
