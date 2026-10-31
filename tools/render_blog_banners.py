#!/usr/bin/env python3
"""Render assets/blog-og/<slug>.jpg (1200×630) for every article in data/blog_seo/*.md.

    python3 tools/render_blog_banners.py [slug ...]

Uses each article's banner / banner_sub / category / glyph / motif / palette header lines and
tools/blog_banner_template.html, screenshotted by headless Chrome at 2× and scaled down (smooth edges).
"""
import subprocess
import sys
import tempfile
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_blog_pages as B  # noqa: E402

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
TEMPLATE = (B.ROOT / 'tools' / 'blog_banner_template.html').as_uri()


def main():
    only = sys.argv[1:]
    out = B.ROOT / 'assets' / 'blog-og'
    out.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for path in sorted(B.SRC.glob('*.md')):
            a = B.parse(path)
            if only and a['slug'] not in only:
                continue
            query = urllib.parse.urlencode({'t': a['banner'], 's': a['banner_sub'], 'c': B.CATEGORY_HI.get(a['category'], ''),
                                            'g': a.get('glyph', 'ॐ'), 'm': a.get('motif', 'wheel'), 'h': a.get('palette', 'kumkum')})
            png = Path(tmp) / f"{a['slug']}.png"
            subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2',
                            '--window-size=1200,630', '--virtual-time-budget=8000', f'--screenshot={png}',
                            f'{TEMPLATE}?{query}'], check=True, capture_output=True)
            subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '86', '-z', '630', '1200', str(png),
                            '--out', str(out / f"{a['slug']}.jpg")], check=True, capture_output=True)
            print('banner', a['slug'])


if __name__ == '__main__':
    main()
