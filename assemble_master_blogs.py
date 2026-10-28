# -*- coding: utf-8 -*-
"""
Master Blog Assembler:
1. Gathers all 50 articles from the 6 theme generators.
2. Merges with legacy blogs in data/blogs_database.json.
3. Upgrades about.html to render image thumbnails and hero banners.
4. Creates dedicated blogs.html (Crawlable SEO hub & Reader).
5. Updates sitemap.xml with blogs.html and all 50 article URLs.
"""

import json
import os
import sys
import re

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from generate_articles_theme1 import get_theme1_articles
from generate_articles_theme2 import get_theme2_articles
from generate_articles_theme3 import get_theme3_articles
from generate_articles_theme4 import get_theme4_articles
from generate_articles_theme5 import get_theme5_articles
from generate_articles_theme6 import get_theme6_articles

def assemble():
    print("Gathering articles from all 6 theme generators...")
    a1 = get_theme1_articles()
    a2 = get_theme2_articles()
    a3 = get_theme3_articles()
    a4 = get_theme4_articles()
    a5 = get_theme5_articles()
    a6 = get_theme6_articles()

    all_new_articles = a1 + a2 + a3 + a4 + a5 + a6
    print(f"Total new classical articles generated: {len(all_new_articles)}")

    # 1. Update data/blogs_database.json
    db_path = 'data/blogs_database.json'
    legacy_blogs = []
    if os.path.exists(db_path):
        try:
            with open(db_path, 'r', encoding='utf-8') as f:
                legacy_blogs = json.load(f)
        except Exception as e:
            print("Error loading legacy blogs:", e)

    # Filter legacy blogs that aren't overwritten
    new_ids = set(str(a['id']) for a in all_new_articles)
    cleaned_legacy = [b for b in legacy_blogs if str(b.get('id')) not in new_ids]

    # Combine: new 50 articles first, then legacy articles
    master_list = all_new_articles + cleaned_legacy
    print(f"Total combined articles for blogs_database.json: {len(master_list)}")

    with open(db_path, 'w', encoding='utf-8') as f:
        json.dump(master_list, f, ensure_ascii=False, indent=2)
    print(f"Successfully saved {db_path}!")

    # Also mirror into public/data/ if public/ exists
    if os.path.exists('public'):
        os.makedirs('public/data', exist_ok=True)
        with open('public/data/blogs_database.json', 'w', encoding='utf-8') as f:
            json.dump(master_list, f, ensure_ascii=False, indent=2)
        print("Mirrored blogs_database.json to public/data/blogs_database.json")

    return all_new_articles, master_list

def upgrade_about_html():
    about_path = 'about.html'
    if not os.path.exists(about_path):
        print("about.html not found!")
        return

    with open(about_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Upgrade category tabs
    old_tabs = '<div class="category-tabs-bar" id="categoryTabsBar">'
    new_tabs = """<div class="category-tabs-bar" id="categoryTabsBar">
                <button class="category-tab-btn active" data-tab="all" onclick="switchCategoryTab('all', this)">🔥 सभी शोध आलेख (All)</button>
                <button class="category-tab-btn" data-tab="gochar" onclick="switchCategoryTab('gochar', this)">🔮 ग्रह गोचर (Transits)</button>
                <button class="category-tab-btn" data-tab="rajyoga" onclick="switchCategoryTab('rajyoga', this)">👑 राजयोग व धनयोग</button>
                <button class="category-tab-btn" data-tab="vivah" onclick="switchCategoryTab('vivah', this)">💍 विवाह व 10 महादोष</button>
                <button class="category-tab-btn" data-tab="shanti" onclick="switchCategoryTab('shanti', this)">🪔 वैदिक शांति व परिहार</button>
                <button class="category-tab-btn" data-tab="ephemeris" onclick="switchCategoryTab('ephemeris', this)">🪐 खगोल गणित (Ephemeris)</button>
                <button class="category-tab-btn" data-tab="muhurta" onclick="switchCategoryTab('muhurta', this)">📅 मुहूर्त विज्ञान (Muhurta)</button>
                <button class="category-tab-btn" data-tab="admin_blogs" onclick="switchCategoryTab('admin_blogs', this)">🚩 आधिकारिक आलेख</button>"""

    if old_tabs in content and 'data-tab="gochar"' not in content:
        # replace up to the closing div of category-tabs-bar
        pattern = r'<div class="category-tabs-bar" id="categoryTabsBar">.*?</div>'
        content = re.sub(pattern, new_tabs + "\n            </div>", content, flags=re.DOTALL)
        print("Upgraded category tabs in about.html")

    # 2. Upgrade getCategoryPillHtml to handle new categories
    old_pill_func = "function getCategoryPillHtml(category, categoryTitle) {"
    if old_pill_func in content and 'badge-cat-rajyoga' not in content:
        new_pill_func = """function getCategoryPillHtml(category, categoryTitle) {
            const cat = (category || '').toLowerCase();
            let cls = 'badge-cat-official';
            let label = categoryTitle || 'शोध आलेख';

            if (cat === 'ephemeris' || cat.includes('खगोल')) {
                cls = 'badge-cat-ephemeris';
                label = '🪐 खगोल एवं सिद्धांत';
            } else if (cat === 'muhurta' || cat.includes('वास्तु') || cat.includes('मुहूर्त')) {
                cls = 'badge-cat-muhurta';
                label = '📅 वास्तु एवं मुहूर्त';
            } else if (cat === 'gochar' || cat.includes('गोचर')) {
                cls = 'badge-cat-transit';
                label = '🔮 ग्रह गोचर';
            } else if (cat === 'rajyoga' || cat.includes('राजयोग')) {
                cls = 'badge-cat-official';
                label = '👑 शास्त्रीय राजयोग';
            } else if (cat === 'vivah' || cat.includes('विवाह')) {
                cls = 'badge-cat-muhurta';
                label = '💍 विवाह व 10 महादोष';
            } else if (cat === 'shanti' || cat.includes('शांति')) {
                cls = 'badge-cat-transit';
                label = '🪔 वैदिक शांति व परिहार';
            }
            return '<span class="badge-cat-pill ' + cls + '">' + label + '</span>';
        }"""
        # replace function
        pattern = r'function getCategoryPillHtml\(category, categoryTitle\) \{.*?\n        \}'
        content = re.sub(pattern, new_pill_func, content, flags=re.DOTALL)
        print("Upgraded getCategoryPillHtml in about.html")

    # 3. Upgrade renderMagazineFeed filter logic
    old_filter = "if (activeCategoryTab === 'ephemeris') {"
    if old_filter in content and "activeCategoryTab === 'rajyoga'" not in content:
        new_filter = """if (activeCategoryTab === 'ephemeris') {
                items = items.filter(q => q && (q.category === 'ephemeris' || (q.title && (q.title.includes('Ephemeris') || q.title.includes('Certainty') || q.title.includes('Boundaries') || q.title.includes('वैदिक गणित')))));
            } else if (activeCategoryTab === 'gochar') {
                items = items.filter(q => q && (q.category === 'gochar' || (q.title && q.title.includes('गोचर'))));
            } else if (activeCategoryTab === 'rajyoga') {
                items = items.filter(q => q && (q.category === 'rajyoga' || (q.title && (q.title.includes('राजयोग') || q.title.includes('धन')))));
            } else if (activeCategoryTab === 'vivah') {
                items = items.filter(q => q && (q.category === 'vivah' || (q.title && (q.title.includes('विवाह') || q.title.includes('मांगलिक')))));
            } else if (activeCategoryTab === 'shanti') {
                items = items.filter(q => q && (q.category === 'shanti' || (q.title && (q.title.includes('शांति') || q.title.includes('दोष') || q.title.includes('स्तोत्र')))));
            } else if (activeCategoryTab === 'muhurta') {
                items = items.filter(q => q && (q.category === 'muhurta' || (q.title && (q.title.includes('नींव') || q.title.includes('मुहूर्त')))));
            } else if (activeCategoryTab === 'admin_blogs') {
                items = items.filter(q => q && (q.isAdmin || q.isBlog));
            } else if (activeCategoryTab === 'verified') {
                items = items.filter(q => q && q.answers && q.answers.some(a => a.isVerified));
            } else if (activeCategoryTab === 'my') {
                items = (currentUser && currentUser.name) ? items.filter(q => q.author && q.author.includes(currentUser.name)) : items;
            }"""
        pattern = r'if \(activeCategoryTab === \'ephemeris\'\) \{.*?(?=\n            // 2\. Filter by search query)'
        content = re.sub(pattern, new_filter, content, flags=re.DOTALL)
        print("Upgraded category filtering in about.html")

    # 4. Add card thumbnail image support
    old_card_markup = """<article class="article-card" id="card-${q.id}">
                    <div>
                        <div class="article-card-meta">"""
    new_card_markup = """<article class="article-card" id="card-${q.id}">
                    ${q.image ? `<div class="article-card-thumb" style="margin:-18px -18px 14px -18px; border-radius:12px 12px 0 0; overflow:hidden; border-bottom:1px solid rgba(212,175,55,0.25); cursor:pointer;" onclick="openArticleReader(${q.id})"><img src="${q.image}" alt="${q.title}" style="width:100%; height:160px; object-fit:cover; display:block;" loading="lazy"></div>` : ''}
                    <div>
                        <div class="article-card-meta">"""

    if old_card_markup in content:
        content = content.replace(old_card_markup, new_card_markup)
        print("Added card thumbnail image rendering to about.html")

    # 5. Add hero image in reader view
    old_body_assign = "document.getElementById('readerContentBody').innerHTML = formatArticleBody(article.body);"
    new_body_assign = """const heroImg = article.image ? `<div style="margin:20px 0; border-radius:12px; overflow:hidden; border:1px solid rgba(212,175,55,0.3);"><img src="${article.image}" alt="${article.title}" style="width:100%; max-height:440px; object-fit:cover; display:block;"></div>` : '';
            document.getElementById('readerContentBody').innerHTML = heroImg + formatArticleBody(article.body);"""

    if old_body_assign in content:
        content = content.replace(old_body_assign, new_body_assign)
        print("Added hero image rendering to openArticleReader in about.html")

    # 6. Ensure masterBlogs priority in loadBlogsDatabaseAsync
    old_primary = """const map = new Map();
            const primaryList = hasAuthenticBlogs 
                ? [...cleanLocal, ...masterBlogs, ...FALLBACK_BLOGS, ...cleanCloud] 
                : [...FALLBACK_BLOGS, ...masterBlogs, ...cleanLocal, ...cleanCloud];"""
    new_primary = """const map = new Map();
            const primaryList = [...masterBlogs, ...cleanLocal, ...cleanCloud, ...FALLBACK_BLOGS];"""
    if old_primary in content:
        content = content.replace(old_primary, new_primary)
        print("Enforced masterBlogs priority over local storage in about.html")

    with open(about_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully updated about.html!")

def generate_blogs_html(articles):
    print("Building dedicated crawlable blogs.html hub & reader...")

    # Build static cards HTML for all articles (Googlebot crawlable)
    cards_html = []
    schemas_json = []

    for art in articles:
        b_id = art['id']
        title = art['title']
        cat = art['category']
        cat_title = art['categoryTitle']
        img = art['image']
        date = art['date']
        read_time = art['readTime']
        excerpt = art['title'] + " - बृहत्पाराशर होराशास्त्रम् एवं नासा जेपीएल स्विस एफिमेरिस (<0.001\" परिशुद्धता) पर आधारित प्रामाणिक शोध आलेख।"
        
        cards_html.append(f"""
        <article class="blog-card" data-category="{cat}" id="art-{b_id}">
          <div class="blog-card-media" onclick="openBlogModal({b_id})">
            <img src="{img}" alt="{title}" loading="lazy">
          </div>
          <div class="blog-card-content">
            <div class="blog-card-badge-row">
              <span class="blog-cat-pill cat-{cat}">{cat_title}</span>
              <span class="blog-date-text">📅 {date} • ⏱️ {read_time}</span>
            </div>
            <h2 class="blog-card-title">
              <a href="about.html?post={b_id}" onclick="event.preventDefault(); openBlogModal({b_id});">{title}</a>
            </h2>
            <p class="blog-card-desc">{excerpt}</p>
            <div class="blog-card-footer">
              <div class="blog-author-tag">
                <img src="logo.png" alt="Astro Ramji">
                <span>एस्ट्रो रामजी</span>
              </div>
              <button class="btn-read-post" onclick="openBlogModal({b_id})">
                शोध पढ़ें ➔
              </button>
            </div>
          </div>
        </article>
        """)

        # Add Schema entry
        schemas_json.append({
            "@type": "BlogPosting",
            "headline": title,
            "image": f"https://shriramjiastro.in/{img}",
            "datePublished": art.get('created_at', '2026-10-24T10:00:00Z'),
            "author": {
                "@type": "Person",
                "name": "एस्ट्रो रामजी (Astro Raamji)"
            },
            "publisher": {
                "@type": "Organization",
                "name": "Shri Ramji Astro",
                "logo": {
                    "@type": "ImageObject",
                    "url": "https://shriramjiastro.in/logo.jpg"
                }
            },
            "description": excerpt
        })

    cards_joined = "\n".join(cards_html)
    schema_bundle = json.dumps({
        "@context": "https://schema.org",
        "@graph": schemas_json[:25] # Google structured data best practice
    }, ensure_ascii=False, indent=2)

    blogs_html_content = f"""<!DOCTYPE html>
<html lang="hi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>वैदिक ज्योतिष शोध पत्रिका एवं ब्लॉग्स | 50+ शास्त्रीय आलेख | Shri Ramji Astro</title>
    <meta name="description" content="महर्षि पराशर विरचित बृहत्पाराशर होराशास्त्रम्, नासा JPL स्विस एफिमेरिस (<0.001'' परिशुद्धता) एवं ग्रह गोचर पर आधारित 50+ प्रामाणिक ज्योतिष शोध आलेख। शनि साढ़े साती, राजयोग, मांगलिक परिहार, एवं खगोल गणित।">
    <meta name="keywords" content="ज्योतिष ब्लॉग, ग्रह गोचर 2026, शनि साढ़े साती परिहार, गजकेसरी योग, पंच महापुरुष योग, नीचभंग राजयोग, मांगलिक दोष 21 परिहार, इन्दु लग्न, कुबेर धन योग, षष्ट्यंश D60, सत्य चित्रा पक्ष अयनांश, Shri Ramji Astro">
    <meta name="author" content="एस्ट्रो रामजी (Founder, Shri Ramji Astro)">
    <link rel="canonical" href="https://shriramjiastro.in/blogs.html">
    <link rel="icon" type="image/png" href="favicon-32.png">

    <!-- Open Graph / Social Sharing -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://shriramjiastro.in/blogs.html">
    <meta property="og:title" content="वैदिक ज्योतिष शोध पत्रिका एवं ब्लॉग्स | 50+ शास्त्रीय आलेख | Shri Ramji Astro">
    <meta property="og:description" content="नासा जेपीएल स्विस एफिमेरिस एवं महर्षि पराशर सिद्धांत पर आधारित 50+ शोध आलेख। गोचर, राजयोग, एवं 10 महादोष।">
    <meta property="og:image" content="https://shriramjiastro.in/assets/blogs/blog-1.svg">

    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="ui-overrides.css">

    <!-- Structured Data (JSON-LD) -->
    <script type="application/ld+json">
{schema_bundle}
    </script>

    <style>
        :root {{
            --bg-dark: #0a0d14;
            --bg-card: #111622;
            --bg-card-hover: #161d2d;
            --border-gold: rgba(212, 175, 55, 0.25);
            --gold: #f59e0b;
            --gold-light: #fbbf24;
            --gold-gradient: linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #d97706 100%);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --font-serif: 'Cinzel', serif;
            --font-sans: 'Plus Jakarta Sans', 'Noto Sans Devanagari', sans-serif;
        }}

        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            background: var(--bg-dark);
            color: var(--text-main);
            font-family: var(--font-sans);
            line-height: 1.6;
            min-height: 100vh;
        }}

        /* NAVIGATION BAR */
        .site-nav {{
            position: sticky;
            top: 0;
            z-index: 100;
            background: rgba(10, 13, 20, 0.95);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--border-gold);
            padding: 12px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }}
        .site-logo-link {{
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
            color: var(--text-main);
        }}
        .site-logo-link img {{
            width: 38px;
            height: 38px;
            border-radius: 50%;
            border: 1.5px solid var(--gold);
        }}
        .site-logo-text {{
            font-family: var(--font-serif);
            font-size: 16px;
            font-weight: 800;
            letter-spacing: 1px;
            color: var(--gold-light);
        }}
        .nav-links-hub {{
            display: flex;
            gap: 18px;
            align-items: center;
        }}
        .nav-links-hub a {{
            color: #cbd5e1;
            text-decoration: none;
            font-size: 13px;
            font-weight: 600;
            transition: color 0.2s;
        }}
        .nav-links-hub a:hover, .nav-links-hub a.active {{
            color: var(--gold);
        }}
        .btn-nav-cta {{
            background: var(--gold-gradient);
            color: #000 !important;
            padding: 7px 16px;
            border-radius: 6px;
            font-weight: 800 !important;
        }}

        /* HERO MASTHEAD */
        .blogs-hero {{
            padding: 60px 20px 40px;
            text-align: center;
            background: radial-gradient(circle at 50% 20%, rgba(245, 158, 11, 0.08) 0%, transparent 70%);
            border-bottom: 1px solid rgba(255,255,255,0.06);
        }}
        .hero-badge-pill {{
            display: inline-block;
            background: rgba(245, 158, 11, 0.12);
            color: var(--gold-light);
            border: 1px solid var(--border-gold);
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 1.5px;
            padding: 6px 16px;
            border-radius: 20px;
            margin-bottom: 16px;
            text-transform: uppercase;
        }}
        .hero-main-title {{
            font-family: var(--font-serif);
            font-size: clamp(28px, 4.5vw, 46px);
            font-weight: 900;
            background: var(--gold-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 14px;
        }}
        .hero-subtitle {{
            max-width: 820px;
            margin: 0 auto 28px;
            font-size: 16px;
            color: var(--text-muted);
            line-height: 1.7;
        }}

        /* SEARCH & FILTER CONTROLS */
        .controls-bar {{
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px 30px;
        }}
        .search-box-wrap {{
            position: relative;
            max-width: 680px;
            margin: 0 auto 24px;
        }}
        .search-box-wrap input {{
            width: 100%;
            background: #111622;
            border: 1px solid var(--border-gold);
            border-radius: 30px;
            padding: 14px 24px 14px 48px;
            font-size: 15px;
            color: #fff;
            outline: none;
            transition: all 0.2s;
        }}
        .search-box-wrap input:focus {{
            border-color: var(--gold);
            box-shadow: 0 0 15px rgba(245, 158, 11, 0.2);
        }}
        .search-box-wrap span {{
            position: absolute;
            left: 18px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 18px;
            color: var(--gold);
        }}

        .category-filter-row {{
            display: flex;
            gap: 10px;
            overflow-x: auto;
            padding-bottom: 8px;
            justify-content: center;
            flex-wrap: wrap;
        }}
        .filter-btn {{
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.1);
            color: #cbd5e1;
            padding: 8px 18px;
            border-radius: 20px;
            font-size: 13.5px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
        }}
        .filter-btn:hover, .filter-btn.active {{
            background: var(--gold-gradient);
            color: #000;
            border-color: var(--gold);
        }}

        /* BLOG GRID */
        .blogs-grid-container {{
            max-width: 1280px;
            margin: 0 auto;
            padding: 0 20px 60px;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
            gap: 28px;
        }}
        .blog-card {{
            background: var(--bg-card);
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 14px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
        }}
        .blog-card:hover {{
            transform: translateY(-4px);
            border-color: var(--border-gold);
            box-shadow: 0 12px 30px rgba(0,0,0,0.5);
        }}
        .blog-card-media {{
            width: 100%;
            height: 200px;
            overflow: hidden;
            background: #07090e;
            cursor: pointer;
            border-bottom: 1px solid rgba(255,255,255,0.06);
        }}
        .blog-card-media img {{
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s;
        }}
        .blog-card:hover .blog-card-media img {{
            transform: scale(1.03);
        }}
        .blog-card-content {{
            padding: 22px;
            display: flex;
            flex-direction: column;
            flex: 1;
        }}
        .blog-card-badge-row {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 12px;
        }}
        .blog-cat-pill {{
            background: rgba(245, 158, 11, 0.12);
            color: var(--gold);
            padding: 4px 10px;
            border-radius: 6px;
            font-weight: 800;
            font-size: 11.5px;
        }}
        .blog-date-text {{
            color: #64748b;
            font-weight: 600;
        }}
        .blog-card-title {{
            font-size: 18px;
            font-weight: 800;
            line-height: 1.45;
            margin-bottom: 10px;
        }}
        .blog-card-title a {{
            color: #f1f5f9;
            text-decoration: none;
            transition: color 0.2s;
        }}
        .blog-card-title a:hover {{
            color: var(--gold);
        }}
        .blog-card-desc {{
            font-size: 13.5px;
            color: var(--text-muted);
            line-height: 1.6;
            margin-bottom: 18px;
            flex: 1;
        }}
        .blog-card-footer {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-top: 1px solid rgba(255,255,255,0.06);
            padding-top: 14px;
        }}
        .blog-author-tag {{
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            font-weight: 700;
            color: #cbd5e1;
        }}
        .blog-author-tag img {{
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 1px solid var(--gold);
        }}
        .btn-read-post {{
            background: transparent;
            border: 1px solid var(--border-gold);
            color: var(--gold);
            padding: 6px 14px;
            border-radius: 6px;
            font-size: 12.5px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
        }}
        .btn-read-post:hover {{
            background: var(--gold);
            color: #000;
        }}

        /* READER MODAL */
        .reader-modal-overlay {{
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.85);
            backdrop-filter: blur(8px);
            z-index: 1000;
            display: none;
            overflow-y: auto;
            padding: 40px 15px;
        }}
        .reader-modal-box {{
            max-width: 900px;
            margin: 0 auto;
            background: #0d111a;
            border: 1px solid var(--border-gold);
            border-radius: 16px;
            padding: 35px;
            position: relative;
            box-shadow: 0 20px 50px rgba(0,0,0,0.8);
        }}
        .btn-close-reader {{
            position: absolute;
            top: 18px; right: 18px;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.15);
            color: #fff;
            width: 36px; height: 36px;
            border-radius: 50%;
            font-size: 18px;
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
        }}
        .btn-close-reader:hover {{
            background: #ef4444;
            border-color: #ef4444;
        }}

        @media(max-width: 768px) {{
            .blogs-grid-container {{ grid-template-columns: 1fr; }}
            .nav-links-hub {{ display: none; }}
            .reader-modal-box {{ padding: 20px; }}
        }}
    </style>
</head>
<body>

    <!-- NAVBAR -->
    <header class="site-nav">
        <a href="index.html" class="site-logo-link">
            <img src="logo.png" alt="Shri Ramji Astro Logo">
            <span class="site-logo-text">SHRI RAMJI ASTRO</span>
        </a>
        <nav class="nav-links-hub">
            <a href="patrika.html">जन्म पत्रिका (Astro 360)</a>
            <a href="parashara-report.html">₹1111 पराशरीय रिपोर्ट</a>
            <a href="vmm.html">विवाह व मिलान</a>
            <a href="dhan-yoga-calculator.html">धन योग कैलकुलेटर</a>
            <a href="bphs-encyclopedia.html">BPHS विश्वकोश</a>
            <a href="blogs.html" class="active">शोध पत्रिका व ब्लॉग्स</a>
            <a href="consultation.html" class="btn-nav-cta">🔮 ₹5100 परामर्श</a>
        </nav>
    </header>

    <!-- HERO MASTHEAD -->
    <section class="blogs-hero">
        <span class="hero-badge-pill">📜 SHASTRA RESEARCH ARCHIVE • 50+ MASTER ARTICLES</span>
        <h1 class="hero-main-title">वैदिक ज्योतिष शोध पत्रिका</h1>
        <p class="hero-subtitle">
            महर्षि पराशर विरचित <em>बृहत्पाराशर होराशास्त्रम्</em>, NASA JPL Swiss Ephemeris (&lt;0.001" परिशुद्धता) एवं शास्त्रीय गोचर पर आधारित 50+ प्रामाणिक आलेख। बिना किसी अंधविश्वास या भ्रामक व्यावसायिक भय के विशुद्ध शास्त्रीय ज्योतिष।
        </p>

        <!-- SEARCH BAR -->
        <div class="search-box-wrap">
            <span>🔍</span>
            <input type="text" id="blogSearchInput" placeholder="शनि साढ़े साती, गजकेसरी योग, मांगलिक परिहार, D60 चक्र खोजें..." oninput="handleSearch(this.value)">
        </div>

        <!-- CATEGORY FILTERS -->
        <div class="category-filter-row">
            <button class="filter-btn active" onclick="filterCategory('all', this)">🔥 सभी शोध आलेख (50+)</button>
            <button class="filter-btn" onclick="filterCategory('gochar', this)">🔮 ग्रह गोचर (Transits)</button>
            <button class="filter-btn" onclick="filterCategory('rajyoga', this)">👑 शास्त्रीय राजयोग व धनयोग</button>
            <button class="filter-btn" onclick="filterCategory('vivah', this)">💍 विवाह व 10 महादोष</button>
            <button class="filter-btn" onclick="filterCategory('shanti', this)">🪔 वैदिक शांति व परिहार</button>
            <button class="filter-btn" onclick="filterCategory('ephemeris', this)">🪐 खगोल गणित (Ephemeris)</button>
            <button class="filter-btn" onclick="filterCategory('muhurta', this)">📅 वास्तु व मुहूर्त</button>
        </div>
    </section>

    <!-- MAIN ARTICLES GRID -->
    <main class="blogs-grid-container" id="blogsGrid">
{cards_joined}
    </main>

    <!-- ARTICLE READER MODAL -->
    <div class="reader-modal-overlay" id="readerModal">
        <div class="reader-modal-box">
            <button class="btn-close-reader" onclick="closeBlogModal()">✕</button>
            <div id="modalHeroBanner" style="margin:-35px -35px 25px -35px; border-radius:16px 16px 0 0; overflow:hidden; border-bottom:1px solid var(--border-gold);"></div>
            <div id="modalMetaRow" style="display:flex; gap:12px; align-items:center; margin-bottom:12px; font-size:12.5px; color:var(--gold);"></div>
            <h1 id="modalTitle" style="font-size:26px; font-weight:800; line-height:1.4; margin-bottom:20px; color:#fff;"></h1>
            <div id="modalBody" style="font-size:15px; line-height:1.8; color:#cbd5e1;"></div>
        </div>
    </div>

    <!-- UNIVERSAL FOOTER -->
    <footer style="background:#07090e; border-top:1px solid var(--border-gold); padding:45px 20px 25px; text-align:center; color:#64748b; font-size:13px;">
        <p style="margin-bottom:12px; color:#94a3b8;">
            &copy; 2026 Shri Ramji Astro. सर्वाधिकार सुरक्षित। बृहत्पाराशर होराशास्त्रम् एवं नासा जेपीएल स्विस एफिमेरिस द्वारा संचालित।
        </p>
        <div style="display:flex; justify-content:center; gap:20px; flex-wrap:wrap;">
            <a href="patrika.html" style="color:var(--gold); text-decoration:none;">जन्म पत्रिका</a>
            <a href="parashara-report.html" style="color:var(--gold); text-decoration:none;">₹1111 रिपोर्ट</a>
            <a href="consultation.html" style="color:var(--gold); text-decoration:none;">₹5100 दैवज्ञ परामर्श</a>
            <a href="vmm.html" style="color:var(--gold); text-decoration:none;">विवाह मिलान</a>
            <a href="bphs-encyclopedia.html" style="color:var(--gold); text-decoration:none;">BPHS विश्वकोश</a>
        </div>
    </footer>

    <!-- INTERACTIVE JAVASCRIPT -->
    <script>
        let BLOGS_CACHE = [];

        // Load database into cache
        async function initBlogsCache() {{
            try {{
                const res = await fetch('data/blogs_database.json?v=' + Date.now());
                if (res.ok) {{
                    BLOGS_CACHE = await res.json();
                }}
            }} catch(e) {{}}
            
            // Auto open if url param ?id=... exists
            const params = new URLSearchParams(window.location.search);
            const blogId = params.get('id');
            if (blogId) {{
                openBlogModal(blogId);
            }}
        }}

        function filterCategory(cat, btn) {{
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');

            const cards = document.querySelectorAll('.blog-card');
            cards.forEach(card => {{
                if (cat === 'all' || card.getAttribute('data-category') === cat) {{
                    card.style.display = 'flex';
                }} else {{
                    card.style.display = 'none';
                }}
            }});
        }}

        function handleSearch(query) {{
            const q = (query || '').toLowerCase().trim();
            const cards = document.querySelectorAll('.blog-card');
            cards.forEach(card => {{
                const text = card.innerText.toLowerCase();
                if (!q || text.includes(q)) {{
                    card.style.display = 'flex';
                }} else {{
                    card.style.display = 'none';
                }}
            }});
        }}

        function openBlogModal(id) {{
            const blog = BLOGS_CACHE.find(b => String(b.id) === String(id));
            if (!blog) {{
                // fallback to about.html reader
                window.location.href = 'about.html?post=' + id;
                return;
            }}

            const modal = document.getElementById('readerModal');
            document.getElementById('modalHeroBanner').innerHTML = blog.image 
                ? `<img src="${{blog.image}}" alt="${{blog.title}}" style="width:100%; max-height:380px; object-fit:cover; display:block;">` 
                : '';
            document.getElementById('modalMetaRow').innerHTML = `
                <span>${{blog.categoryTitle || 'शोध आलेख'}}</span>
                <span>📅 ${{blog.date || 'Oct 2026'}}</span>
                <span>⏱️ ${{blog.readTime || '8 min'}}</span>
            `;
            document.getElementById('modalTitle').innerText = blog.title;
            document.getElementById('modalBody').innerHTML = blog.body;

            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            history.pushState({{blogId: id}}, '', '?id=' + id);
        }}

        function closeBlogModal() {{
            document.getElementById('readerModal').style.display = 'none';
            document.body.style.overflow = 'auto';
            history.pushState({{}}, '', window.location.pathname);
        }}

        window.onclick = function(e) {{
            const modal = document.getElementById('readerModal');
            if (e.target === modal) {{
                closeBlogModal();
            }}
        }};

        window.onpopstate = function() {{
            const params = new URLSearchParams(window.location.search);
            const blogId = params.get('id');
            if (blogId) {{
                openBlogModal(blogId);
            }} else {{
                closeBlogModal();
            }}
        }};

        initBlogsCache();
    </script>
</body>
</html>
"""

    with open('blogs.html', 'w', encoding='utf-8') as f:
        f.write(blogs_html_content)
    print("Successfully built blogs.html!")

    if os.path.exists('public'):
        with open('public/blogs.html', 'w', encoding='utf-8') as f:
            f.write(blogs_html_content)
        print("Mirrored blogs.html to public/blogs.html!")

def update_sitemap(articles):
    sitemap_path = 'sitemap.xml'
    if not os.path.exists(sitemap_path):
        print("sitemap.xml not found!")
        return

    with open(sitemap_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if blogs.html is already in sitemap
    new_urls = []
    if '<loc>https://shriramjiastro.in/blogs.html</loc>' not in content:
        new_urls.append("""  <url>
    <loc>https://shriramjiastro.in/blogs.html</loc>
    <lastmod>2026-10-24</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.95</priority>
  </url>""")

    for art in articles:
        b_id = art['id']
        url_tag = f"<loc>https://shriramjiastro.in/blogs.html?id={b_id}</loc>"
        if url_tag not in content:
            new_urls.append(f"""  <url>
    <loc>https://shriramjiastro.in/blogs.html?id={b_id}</loc>
    <lastmod>2026-10-24</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
    <image:image>
      <image:loc>https://shriramjiastro.in/{art['image']}</image:loc>
      <image:title>{art['title'][:80]}</image:title>
    </image:image>
  </url>""")

    if new_urls:
        insert_marker = '</urlset>'
        if insert_marker in content:
            injected = "\n" + "\n".join(new_urls) + "\n" + insert_marker
            content = content.replace(insert_marker, injected)
            with open(sitemap_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Added {len(new_urls)} URLs to sitemap.xml!")
        else:
            print("Could not find </urlset> in sitemap.xml")

if __name__ == '__main__':
    new_arts, master_db = assemble()
    upgrade_about_html()
    generate_blogs_html(new_arts)
    update_sitemap(new_arts)
    print("Master assembly completed successfully!")
