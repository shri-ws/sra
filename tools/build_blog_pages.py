#!/usr/bin/env python3
"""Build one static, search-friendly page per rewritten article.

    python3 tools/build_blog_pages.py

Reads  data/blog_seo/*.md  (article sources, see the format below)
       data/bphs_master_db.json  (BPHS verses, checked against sanskritdocuments.org)
Writes blog/<slug>.html, blog/pages.js (old id → page), data/blog_seo/index.json,
       the matching cards and schema in blogs.html, and the blog URLs in sitemap.xml.

Article source format: "key: value" header lines, a blank line, then the body.
  ## heading          → <h2>
  - item              → list
  **bold**, [text](url)
  [[BPHS.36.3]]       → that verse, word for word from the BPHS database
  Q: … / A: …         → FAQ (shown on the page and as FAQPage schema)
A verse id missing from the database stops the build, so no quotation can be invented.
"""
import html
import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'data' / 'blog_seo'
OUT = ROOT / 'blog'
SITE = 'https://shriramjiastro.in'
AUTHOR = 'एस्ट्रो रामजी (Astro Raamji)'
CATEGORY_HI = {'gochar': 'गोचर', 'vivah': 'विवाह', 'shanti': 'दोष व शांति', 'rajyoga': 'राजयोग व धनयोग',
               'ephemeris': 'दशा व गणित', 'muhurta': 'मुहूर्त'}

esc = html.escape


def load_verses():
    db = json.loads((ROOT / 'data' / 'bphs_master_db.json').read_text(encoding='utf-8'))
    verses = {}
    for ch in db['chapters']:
        for v in ch['verses']:
            verses[v['id']] = (ch['chapter'], ch['title_sa'], v['n'], v['text_sa'])
    return verses


def parse(path):
    text = path.read_text(encoding='utf-8')
    head, body = text.split('\n\n', 1)
    meta = dict(line.split(': ', 1) for line in head.splitlines())
    faq, lines = [], []
    for line in body.splitlines():
        if line.startswith('Q: '):
            faq.append([line[3:].strip(), ''])
        elif line.startswith('A: ') and faq:
            faq[-1][1] = line[3:].strip()
        else:
            lines.append(line)
    meta['faq'] = faq
    meta['body_md'] = '\n'.join(lines).strip()
    return meta


def inline(s):
    s = esc(s, quote=False)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: f'<a href="{m.group(2).replace("../", "")}">{m.group(1)}</a>', s)
    return s


def verse_block(vid, verses, cited):
    if vid not in verses:
        sys.exit(f'Verse {vid} is not in data/bphs_master_db.json — refusing to build.')
    ch, title, n, text = verses[vid]
    cited.append(vid)
    lines = '<br>'.join(esc(l.strip()) for l in text.split('\n') if l.strip())
    return (f'<figure class="bl-verse" id="{vid.replace(".", "-")}"><blockquote lang="sa">{lines}</blockquote>'
            f'<figcaption>बृहत्पाराशर होराशास्त्र · अध्याय {ch} ({esc(title)}) · श्लोक {n}</figcaption></figure>')


def render_body(md, verses, cited):
    out, para, items = [], [], []

    def flush():
        if para:
            out.append('<p>' + inline(' '.join(para)) + '</p>')
            para.clear()
        if items:
            out.append('<ul>' + ''.join(f'<li>{inline(i)}</li>' for i in items) + '</ul>')
            items.clear()

    toc = []
    for line in md.splitlines():
        s = line.strip()
        verse = re.fullmatch(r'\[\[(BPHS\.\d+\.\d+)\]\]', s)
        if not s:
            flush()
        elif s.startswith('## '):
            flush()
            hid = f's{len(toc) + 1}'
            toc.append((hid, s[3:]))
            out.append(f'<h2 id="{hid}">{inline(s[3:])}</h2>')
        elif s.startswith('- '):
            if para:
                flush()
            items.append(s[2:])
        elif verse:
            flush()
            out.append(verse_block(verse.group(1), verses, cited))
        else:
            if items:
                flush()
            para.append(s)
    flush()
    return '\n'.join(out), toc


def words(md):
    return len(re.sub(r'\[\[[^\]]+\]\]', '', md).split())


PAGE = '''<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<base href="/">
<title>{title} | Shri Ramji Astro</title>
<meta name="description" content="{description}">
<meta name="keywords" content="{keywords}">
<meta name="author" content="Astro Raamji">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Shri Ramji Astro">
<meta property="og:locale" content="hi_IN">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{banner}">
<meta property="article:published_time" content="{date}T06:00:00+05:30">
<meta property="article:modified_time" content="{date}T06:00:00+05:30">
<meta property="article:author" content="Astro Raamji">
<meta property="article:section" content="{category_hi}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{description}">
<meta name="twitter:image" content="{image}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Serif+Devanagari:wght@600;700&display=swap" rel="stylesheet">
<script type="application/ld+json">{schema}</script>
<script src="theme.js"></script>
<link rel="stylesheet" href="sra-elegance.css">
<link rel="stylesheet" href="blog/blog.css">
<script src="sra-ui.js" defer></script>
<script src="sra-auth.js" defer></script>
<script src="sra-records.js" defer></script>
<script src="sra-translate.js" defer></script>
<script src="sra-nav.js" defer></script>
<script src="sra-master.js" defer></script>
<script src="sra-i18n.js" defer></script>
</head>
<body class="bl-page">
<main class="bl-wrap">
  <div class="bl-crumbs" role="navigation" aria-label="breadcrumb"><a href="index.html">होम</a> › <a href="blogs.html">शोध ब्लॉग</a> › <span>{category_hi}</span></div>
  <article class="bl-article">
    <header class="bl-head">
      <span class="bl-cat">{category_hi}</span>
      <h1>{h1}</h1>
      <p class="bl-meta">लेखक: <a href="about.html">{author}</a> · <time datetime="{date}">{date_hi}</time> · {read_min} मिनट पढ़ें</p>
      <img class="bl-hero" src="{image_rel}" width="1200" height="630" alt="{banner}" fetchpriority="high">
    </header>
    <section class="bl-answer" aria-label="संक्षिप्त उत्तर">
      <h2 class="bl-answer-h">संक्षेप में</h2>
      <p>{snippet}</p>
    </section>
    <div class="bl-toc" role="navigation" aria-label="विषय सूची"><b>इस लेख में</b><ol>{toc}</ol></div>
    <div class="bl-body">
{body}
    </div>
    <section class="bl-faq" id="faq">
      <h2>पूछे जाने वाले प्रश्न</h2>
{faq}
    </section>
    <aside class="bl-sources">
      <h2>स्रोत</h2>
      <p>इस लेख में उद्धृत सभी श्लोक बृहत्पाराशर होराशास्त्र के मूल पाठ (sanskritdocuments.org संस्करण) से शब्दशः लिए गए हैं: {cited}। जो नियम पराशर के ग्रंथ के बाहर से हैं, उनका स्रोत लेख में अलग से बताया गया है।</p>
    </aside>
    <div class="bl-cta">
      <a class="bl-btn" href="patrika.html">📜 मुफ़्त जन्म पत्रिका बनाएँ</a>
      <a class="bl-btn bl-btn-2" href="consultation.html">🔮 व्यक्तिगत परामर्श</a>
    </div>
  </article>
  <section class="bl-related">
    <h2>और पढ़ें</h2>
    <ul>{related}</ul>
  </section>
</main>
</body>
</html>
'''

CARD = '''<article class="blog-card" data-category="{category}" id="art-{id}">
          <a class="blog-card-media" href="{url}">
            <img src="{image}" alt="{title}" width="1200" height="630" loading="lazy">
          </a>
          <div class="blog-card-content">
            <div class="blog-card-badge-row">
              <span class="blog-cat-pill cat-{category}">{category_hi}</span>
              <span class="blog-date-text">📅 {date_hi}</span>
            </div>
            <h2 class="blog-card-title"><a href="{url}">{title}</a></h2>
            <p class="blog-card-desc">{snippet}</p>
            <div class="blog-card-footer">
              <div class="blog-author-tag">
                <img src="logo.png" alt="Astro Ramji">
                <span>एस्ट्रो रामजी</span>
              </div>
              <a class="btn-read-post" href="{url}">पूरा लेख पढ़ें ➔</a>
            </div>
          </div>
        </article>'''


def update_blogs_hub(index):
    """Point the matching blogs.html cards at the new pages and list those pages in its schema."""
    path = ROOT / 'blogs.html'
    page = path.read_text(encoding='utf-8')
    for i in index:
        y, m, d = i['date'].split('-')
        card = CARD.format(category=i['category'], id=i['id'], url=i['url'], image=i['image'], title=esc(i['title']),
                           category_hi=CATEGORY_HI.get(i['category'], ''), date_hi=f'{int(d)} {HI_MONTHS[int(m) - 1]} {y}',
                           snippet=esc(i['snippet'][:180].rsplit(' ', 1)[0] + '…'))
        page, n = re.subn(r'<article class="blog-card"[^>]*id="art-%s">.*?</article>' % i['id'], lambda _: card, page, flags=re.S)
        if n != 1:
            sys.exit(f"blogs.html has no card art-{i['id']}")
    schema = {'@context': 'https://schema.org', '@type': 'CollectionPage', 'name': 'शोध ब्लॉग — Shri Ramji Astro',
              'url': f'{SITE}/blogs.html', 'inLanguage': 'hi',
              'mainEntity': {'@type': 'ItemList', 'itemListElement': [
                  {'@type': 'ListItem', 'position': n + 1, 'url': f"{SITE}/{i['url']}", 'name': i['title']}
                  for n, i in enumerate(index)]}}
    page = re.sub(r'<script type="application/ld\+json">.*?</script>',
                  lambda _: '<script type="application/ld+json">' + json.dumps(schema, ensure_ascii=False) + '</script>',
                  page, count=1, flags=re.S)
    path.write_text(page, encoding='utf-8')


HI_MONTHS = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर']


def main():
    verses = load_verses()
    articles = [parse(p) for p in sorted(SRC.glob('*.md'))]
    OUT.mkdir(exist_ok=True)
    index = []
    for a in articles:
        cited = []
        body, toc = render_body(a['body_md'], verses, cited)
        url = f"{SITE}/blog/{a['slug']}.html"
        image_rel = f"assets/blog-og/{a['slug']}.jpg"
        y, m, d = a['date'].split('-')
        schema = {'@context': 'https://schema.org', '@graph': [
            {'@type': 'BlogPosting', '@id': url + '#article', 'headline': a['title'], 'description': a['description'],
             'image': {'@type': 'ImageObject', 'url': f'{SITE}/{image_rel}', 'width': 1200, 'height': 630},
             'datePublished': a['date'] + 'T06:00:00+05:30', 'dateModified': a['date'] + 'T06:00:00+05:30',
             'inLanguage': 'hi', 'mainEntityOfPage': url, 'keywords': a['keywords'],
             'articleSection': CATEGORY_HI.get(a['category'], ''), 'wordCount': words(a['body_md']),
             'author': {'@type': 'Person', 'name': 'Astro Raamji', 'alternateName': 'एस्ट्रो रामजी', 'url': f'{SITE}/about.html'},
             'publisher': {'@type': 'Organization', 'name': 'Shri Ramji Astro', 'url': SITE,
                           'logo': {'@type': 'ImageObject', 'url': f'{SITE}/logo.jpg'}}},
            {'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q,
                                                 'acceptedAnswer': {'@type': 'Answer', 'text': ans}} for q, ans in a['faq']]},
            {'@type': 'BreadcrumbList', 'itemListElement': [
                {'@type': 'ListItem', 'position': 1, 'name': 'होम', 'item': SITE + '/'},
                {'@type': 'ListItem', 'position': 2, 'name': 'शोध ब्लॉग', 'item': SITE + '/blogs.html'},
                {'@type': 'ListItem', 'position': 3, 'name': a['h1'], 'item': url}]}]}
        # six related articles: same category first, then the rest, starting after this one so pages differ
        i = articles.index(a)
        others = articles[i + 1:] + articles[:i]
        others.sort(key=lambda o: o['category'] != a['category'])
        related = ''.join(f'<li><a href="blog/{o["slug"]}.html">{esc(o["h1"])}</a></li>' for o in others[:6])
        faq = '\n'.join(f'<details><summary>{esc(q)}</summary><p>{inline(ans)}</p></details>' for q, ans in a['faq'])
        page = PAGE.format(
            title=esc(a['title']), description=esc(a['description']), keywords=esc(a['keywords']), url=url,
            image=f'{SITE}/{image_rel}', image_rel=image_rel, banner=esc(a['banner']), date=a['date'],
            date_hi=f'{int(d)} {HI_MONTHS[int(m) - 1]} {y}', category_hi=CATEGORY_HI.get(a['category'], ''),
            schema=json.dumps(schema, ensure_ascii=False).replace('</', '<\\/'), h1=esc(a['h1']), author=AUTHOR,
            read_min=max(3, math.ceil(words(a['body_md']) / 180)), snippet=inline(a['snippet']),
            toc=''.join(f'<li><a href="blog/{a["slug"]}.html#{hid}">{inline(t)}</a></li>' for hid, t in toc),
            body=body, faq=faq, cited=', '.join(c.replace('BPHS.', '') for c in dict.fromkeys(cited)) or '—',
            related=related)
        (OUT / f"{a['slug']}.html").write_text(page, encoding='utf-8')
        index.append({'id': a['id'], 'slug': a['slug'], 'url': f"blog/{a['slug']}.html", 'title': a['h1'],
                      'image': image_rel, 'date': a['date'], 'category': a['category'], 'snippet': a['snippet']})
        print(f"blog/{a['slug']}.html  {words(a['body_md'])} words  {len(cited)} verses  {len(a['faq'])} FAQ")
    (SRC / 'index.json').write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding='utf-8')

    (OUT / 'pages.js').write_text(
        '/* Built by tools/build_blog_pages.py: old article ids → their own page (blogs.html, about.html) */\n'
        'window.SRA_BLOG_PAGES = ' + json.dumps({str(i['id']): i['url'] for i in index}) + ';\n', encoding='utf-8')
    update_blogs_hub(index)

    # sitemap: blog pages in, the old ?id= popups out (they all serve the same blogs.html)
    sm_path = ROOT / 'sitemap.xml'
    sm = sm_path.read_text(encoding='utf-8')
    sm = re.sub(r'\s*<url>\s*<loc>[^<]*(?:blogs\.html\?id=|/blog/)[^<]*</loc>.*?</url>', '', sm, flags=re.S)
    entries = ''.join(f'\n  <url>\n    <loc>{SITE}/blog/{a["slug"]}.html</loc>\n    <lastmod>{a["date"]}</lastmod>\n'
                      f'    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n'
                      f'    <image:image>\n      <image:loc>{SITE}/assets/blog-og/{a["slug"]}.jpg</image:loc>\n'
                      f'      <image:title>{esc(a["banner"])}</image:title>\n    </image:image>\n  </url>' for a in articles)
    sm = sm.replace('</urlset>', entries + '\n</urlset>')
    sm_path.write_text(sm, encoding='utf-8')


if __name__ == '__main__':
    main()
