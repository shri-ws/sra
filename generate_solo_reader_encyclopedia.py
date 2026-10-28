import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# 1. Load the master database
with open("data/bphs_complete_shlokas_db.json", "r", encoding="utf-8") as f:
    master_db = json.load(f)

print(f"Loaded master DB with {len(master_db)} chapters.")

# 2. Modules Navigation metadata
MODULES_NAV = [
    {"id": "mod1", "icon": "🔭", "short_name": "मॉड्यूल १: सृष्टि व ग्रह-स्वरूप", "chapters": "अध्याय १ - ५", "start_ch": 1},
    {"id": "mod2", "icon": "🏛️", "short_name": "मॉड्यूल २: षोडशवर्ग हार्मोनिक्स", "chapters": "अध्याय ६ - ८", "start_ch": 6},
    {"id": "mod3", "icon": "📐", "short_name": "मॉड्यूल ३: भाव-साधन व षड्बल", "chapters": "अध्याय ९ - ३१", "start_ch": 9},
    {"id": "mod4", "icon": "👑", "short_name": "मॉड्यूल ४: राजयोग, धनयोग व इंदु", "chapters": "अध्याय ३२ - ४५", "start_ch": 32},
    {"id": "mod5", "icon": "⏳", "short_name": "मॉड्यूल ५: बहु-दशा प्रणालियाँ", "chapters": "अध्याय ४६ - ६५", "start_ch": 46},
    {"id": "mod6", "icon": "📊", "short_name": "मॉड्यूल ६: अष्टकवर्ग मैट्रिक्स", "chapters": "अध्याय ६६ - ७४", "start_ch": 66},
    {"id": "mod7", "icon": "🕊️", "short_name": "मॉड्यूल ७: आयुर्दाय, दोष व शांति", "chapters": "अध्याय ७५ - ९७", "start_ch": 75},
]

# 3. Generate Dropdown Options for all 97 Chapters
select_options = []
for ch_num_str in sorted(master_db.keys(), key=lambda x: int(x)):
    ch = master_db[ch_num_str]
    opt = f'<option value="{ch["chapter_number"]}">अध्याय {ch["chapter_number"]}: {ch["chapter_title_sanskrit"]} ({ch["total_shlokas"]} श्लोक) — {ch["chapter_title_english"]}</option>'
    select_options.append(opt)

dropdown_html = "\n".join(select_options)

# 4. Generate Pre-rendered Shloka cards for Chapter 1 (Static DOM for immediate view and SEO)
ch1 = master_db["1"]
ch1_verses_html = []
for v in ch1["verses"]:
    v_html = f"""
    <div class="verse-unit-card" id="verse-1-{v['verse_num']}">
      <div class="verse-header">
        <span class="verse-num-badge">📖 {v['verse_label']}</span>
        <span class="verse-meta-tag">अध्याय १: सृष्टिक्रमकथनाध्यायः</span>
      </div>

      <div class="verse-shloka-box">
        <pre class="verse-shloka-text">{v['shloka']}</pre>
      </div>

      <div class="verse-anvaya-box">
        <strong>📖 पद-छेद एवं अन्वय:</strong>
        <p>{v['anvaya']}</p>
      </div>

      <div class="verse-bhashya-box">
        <strong>💡 शास्त्रीय भावार्थ एवं विस्तृत फलित व्याख्या:</strong>
        <p>{v['bhashya']}</p>
      </div>

      <div class="verse-math-box">
        <strong>⚙️ खगोलीय गणितीय नियम / सूत्र (Algorithm & Ephemeris Hook):</strong>
        <code>{v['math']}</code>
      </div>
    </div>
    """
    ch1_verses_html.append(v_html)

ch1_static_rendered = "".join(ch1_verses_html)

# 5. Generate Directory Grid cards for all 97 Chapters (For directory browsing)
directory_cards = []
for ch_num_str in sorted(master_db.keys(), key=lambda x: int(x)):
    ch = master_db[ch_num_str]
    card = f"""
    <div class="dir-chapter-card" data-mod="{ch['module_id']}" data-num="{ch['chapter_number']}" onclick="openSoloChapter({ch['chapter_number']})">
      <div class="dir-card-top">
        <span class="dir-num-badge">अध्याय {ch['chapter_number']}</span>
        <span class="dir-shloka-count">📜 {ch['total_shlokas']} श्लोक</span>
      </div>
      <h4 class="dir-title-sa">{ch['chapter_title_sanskrit']}</h4>
      <div class="dir-title-en">{ch['chapter_title_english']}</div>
      <p class="dir-desc">{ch['shastra_summary_hindi'][:110]}...</p>
      <div class="dir-footer">
        <span class="dir-algo-tag">⚙️ {ch['computational_algorithm_hook'][:28]}</span>
        <span class="dir-action-link">श्लोक पढ़ें ➔</span>
      </div>
    </div>
    """
    directory_cards.append(card)

directory_grid_html = "".join(directory_cards)

# 6. Build the Horizontal Module Nav Tabs
mod_tabs = []
for m in MODULES_NAV:
    tab = f"""
    <button type="button" class="mod-nav-tab" data-mod="{m['id']}" onclick="filterModuleAndOpenFirst('{m['id']}', {m['start_ch']})">
      <span class="mod-tab-icon">{m['icon']}</span>
      <div class="mod-tab-content">
        <span class="mod-tab-title">{m['short_name']}</span>
        <span class="mod-tab-range">{m['chapters']}</span>
      </div>
    </button>
    """
    mod_tabs.append(tab)

sticky_horizontal_bar_html = f"""
<!-- STICKY HORIZONTAL MODULE TRACK BAR -->
<div class="sticky-module-bar-wrap">
  <div class="module-bar-inner">
    <button type="button" class="mod-nav-tab active" data-mod="all" onclick="filterModuleAndOpenFirst('all', 1)">
      <span class="mod-tab-icon">🌟</span>
      <div class="mod-tab-content">
        <span class="mod-tab-title">सम्पूर्ण संहिता</span>
        <span class="mod-tab-range">९७ अध्याय (१ - ९७)</span>
      </div>
    </button>
    {"".join(mod_tabs)}
  </div>
</div>
"""

# 7. Extract the top preamble from bphs-encyclopedia.html
with open("bphs-encyclopedia.html", "r", encoding="utf-8") as f:
    orig_html = f.read()

curriculum_marker = orig_html.find('<!-- ==================== SECTION 2: THE 7 RESEARCH MODULES & 97 CHAPTERS ==================== -->')
preamble = orig_html[:curriculum_marker]

# 8. Reader Section HTML
reader_section_html = f"""
<!-- ==================== SECTION 2: THE 7 RESEARCH MODULES & 97 CHAPTERS ==================== -->
<section class="modules-catalog-section" id="curriculumSection">
  <div class="section-header" style="text-align:center; max-width:900px; margin:0 auto 1.5rem; padding:0 1rem;">
    <span class="section-tag">Authentic Vedic Gurukul Canon</span>
    <h2 class="section-title">बृहत्पाराशरहोराशास्त्रम् के ९७ अध्यायों का सम्पूर्ण श्लोक विश्वकोश</h2>
    <p style="color:var(--text-muted); font-size:1.05rem; margin-top:0.6rem;">
      सम्पूर्ण <strong>३,९२५ प्रामाणिक श्लोक</strong>: प्रत्येक श्लोक का मूल संस्कृत पाठ, पद-छेद, अन्वय, विस्तृत फलित व्याख्या एवं Jean Meeus खगोलीय गणित।
    </p>
  </div>

  {sticky_horizontal_bar_html}

  <!-- INTERACTIVE CHAPTER SELECTOR RAIL -->
  <div class="chapter-selector-rail">
    <div class="selector-rail-inner">
      <div class="selector-group">
        <label for="soloChapterSelect" class="selector-label">📜 अध्याय चुनें:</label>
        <select id="soloChapterSelect" class="chapter-dropdown" onchange="openSoloChapter(parseInt(this.value))">
          {dropdown_html}
        </select>
      </div>

      <div class="nav-btn-group">
        <button type="button" class="chapter-nav-btn" onclick="navChapter(-1)" title="पिछला अध्याय">
          <span>⬅️ पिछला</span>
        </button>
        <button type="button" class="chapter-nav-btn" onclick="navChapter(1)" title="अगला अध्याय">
          <span>अगला ➡️</span>
        </button>
        <button type="button" class="view-toggle-btn" id="toggleViewBtn" onclick="toggleDirectoryMode()">
          <span id="toggleViewIcon">📚</span> <span id="toggleViewText">सभी ९७ अध्यायों की सूची</span>
        </button>
      </div>
    </div>
  </div>

  <!-- SOLO CHAPTER READER VIEW (ACTIVE CHAPTER WITH ALL ITS SHLOKAS) -->
  <div class="solo-reader-wrapper" id="soloReaderWrapper">
    <!-- Chapter Grand Header Banner -->
    <div class="solo-chapter-header" id="soloChapterHeader">
      <div class="solo-top-meta">
        <span class="solo-chapter-badge" id="soloBadge">अध्याय १</span>
        <span class="solo-module-badge" id="soloModBadge">मॉड्यूल १: सृष्टि व ग्रह-स्वरूप</span>
        <span class="solo-shloka-total-pill" id="soloTotalPill">📖 कुल २४ सम्पूर्ण श्लोक</span>
      </div>

      <h2 class="solo-chapter-title-sa" id="soloTitleSa">सृष्टिक्रमकथनाध्यायः</h2>
      <div class="solo-chapter-title-en" id="soloTitleEn">The Creation of the Universe</div>
      
      <div class="solo-desc-card">
        <div class="desc-card-title">📖 इस अध्याय का शास्त्रीय विषय-सार:</div>
        <p id="soloDesc">{ch1['shastra_summary_hindi']}</p>
      </div>

      <div class="solo-algo-card">
        <div class="algo-card-title">⚙️ खगोलीय गणितीय क्रियान्वयन (Astronomical Ephemeris Hook):</div>
        <code id="soloAlgo">{ch1['computational_algorithm_hook']} — {ch1['mathematical_formulation']}</code>
      </div>
    </div>

    <!-- Quick Verse Control Bar -->
    <div class="verse-action-bar">
      <div style="font-size:0.92rem; color:var(--text-muted); font-weight:700;">
        वर्तमान में प्रदर्शित: <strong id="currentChapterVerseTitle" style="color:var(--gold-bright);">अध्याय १ के सभी २४ श्लोक</strong>
      </div>
      <div style="display:flex; gap:8px;">
        <button type="button" class="action-btn-pill" onclick="toggleAllVerseDetails(true)">📖 सभी श्लोक खोलें</button>
        <button type="button" class="action-btn-pill" onclick="toggleAllVerseDetails(false)">📕 संक्षिप्त श्लोक व्यू</button>
      </div>
    </div>

    <!-- Container where ALL shlokas of the selected chapter are rendered -->
    <div class="solo-shloka-stream" id="soloShlokaStream">
      {ch1_static_rendered}
    </div>

    <!-- Bottom Navigation Footer for Chapter -->
    <div class="solo-chapter-bottom-nav">
      <button type="button" class="chapter-nav-btn large" onclick="navChapter(-1)">⬅️ पिछला अध्याय</button>
      <a href="patrika.html" class="inline-calc-btn large">✨ इस अध्याय के योग अपनी कुंडली में देखें ➔</a>
      <button type="button" class="chapter-nav-btn large" onclick="navChapter(1)">अगला अध्याय ➡️</button>
    </div>
  </div>

  <!-- ALL CHAPTERS DIRECTORY GRID (HIDDEN BY DEFAULT, TOGGLEABLE) -->
  <div class="all-chapters-dir-wrapper" id="allChaptersDirWrapper" style="display:none;">
    <div class="dir-header">
      <h3 style="color:var(--gold-bright); font-family:var(--font-heading); font-size:1.5rem;">
        बृहत्पाराशरहोराशास्त्रम्: ९७ अध्यायों की सम्पूर्ण निर्देशिका
      </h3>
      <p style="color:var(--text-muted); font-size:0.95rem;">
        किसी भी अध्याय के सभी श्लोक पढ़ने के लिए उस पर क्लिक करें:
      </p>
    </div>

    <div class="dir-search-wrap">
      <input type="text" id="dirSearchInput" placeholder="अध्याय खोजें (उदा. षोडशवर्ग, राजयोग, विंशोत्तरी, Ch 42)..." oninput="filterDirectory(this.value)" />
    </div>

    <div class="all-chapters-grid" id="allChaptersGrid">
      {directory_grid_html}
    </div>
  </div>

</section>

<!-- ==================== CALL TO ACTION ==================== -->
<div class="cta-banner">
  <h2>इन सभी ९७ अध्यायों की गणितीय गणना अपनी कुंडली पर परखें</h2>
  <p>
    Shri Ramji Astro का <strong>Patrika (Astro 360)</strong> इंजन महर्षि पाराशर के इन सभी ९७ अध्यायों के मूल सूत्रों और Jean Meeus की सब-आर्कसेकंड खगोलीय शुद्धता को आपकी हथेली में प्रस्तुत करता है।
  </p>
  <div class="cta-btns">
    <a href="patrika.html" class="cta-btn primary">✨ अपनी जन्म पत्रिका बनाएं (फ्री)</a>
    <a href="parashara-report.html" class="cta-btn primary" style="background:linear-gradient(135deg, #f59e0b, #b45309);">📜 संपूर्ण पाराशर कुण्डली रिपोर्ट (₹1,111)</a>
    <a href="ai-samvad.html" class="cta-btn secondary">🤖 गुरु-शिष्य AI महासंवाद देखें</a>
    <a href="vmm.html" class="cta-btn secondary">💍 विवाह के १० महादोष जांचें</a>
  </div>
</div>

<!-- Footer -->
<footer class="sra-footer">
  <p>© 2026 Shri Ramji Astro (Astro Raamji). सर्वाधिकार सुरक्षित। सत्य, शास्त्र एवं विज्ञान का संगम।</p>
  <p style="margin-top: 0.4rem; font-size: 0.82rem; color: #64748b;">
    BPHS 97 Chapters Master Canonical Hub • <a href="https://www.wikidata.org/wiki/Q141886781" target="_blank" style="color:var(--accent-cyan); text-decoration:none;">Wikidata Q141886781</a> • <a href="https://huggingface.co/datasets/shriramjiastro/bphs-97-chapters-sanskrit-dataset" target="_blank" style="color:#fef08a; text-decoration:none;">Hugging Face Official Dataset</a> • Powered by Meeus 60-Term Series
  </p>
</footer>
"""

# Plain script block (not an f-string) to prevent curly brace parsing errors
reader_js = """
<!-- COMPLETE 3,925 SHLOKAS JAVASCRIPT DATABASE SCRIPT -->
<script src="data/bphs_complete_shlokas_db.js"></script>

<!-- READER INTERACTION SCRIPT -->
<script>
var currentActiveChapter = 1;

// Math Tab Switcher for Section 1
document.addEventListener('DOMContentLoaded', function() {
  var mathBtns = document.querySelectorAll('.math-tab-btn');
  var mathPanels = document.querySelectorAll('.math-tab-panel');
  if (mathBtns.length && mathPanels.length) {
    mathBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        mathBtns.forEach(function(b) { b.classList.remove('active'); });
        mathPanels.forEach(function(p) { p.classList.remove('active'); });
        btn.classList.add('active');
        var target = document.getElementById(btn.getAttribute('data-tab'));
        if (target) target.classList.add('active');
      });
    });
  }

  // Check URL hash on load (e.g. #ch6)
  if (window.location.hash) {
    var match = window.location.hash.match(/#ch(\\d+)/);
    if (match && match[1]) {
      var num = parseInt(match[1]);
      if (num >= 1 && num <= 97) {
        openSoloChapter(num);
      }
    }
  }
});

// OPEN SOLO CHAPTER: Renders ONLY the selected chapter with ALL its shlokas!
function openSoloChapter(chNum) {
  if (chNum < 1) chNum = 1;
  if (chNum > 97) chNum = 97;
  currentActiveChapter = chNum;

  // Make sure Solo Reader is visible and Directory is hidden
  var readerWrapper = document.getElementById('soloReaderWrapper');
  var dirWrapper = document.getElementById('allChaptersDirWrapper');
  if (readerWrapper) readerWrapper.style.display = 'block';
  if (dirWrapper) dirWrapper.style.display = 'none';

  // Update Toggle View button state
  var toggleText = document.getElementById('toggleViewText');
  var toggleIcon = document.getElementById('toggleViewIcon');
  if (toggleText) toggleText.textContent = 'सभी ९७ अध्यायों की सूची';
  if (toggleIcon) toggleIcon.textContent = '📚';

  // Sync dropdown
  var select = document.getElementById('soloChapterSelect');
  if (select && select.value !== chNum.toString()) {
    select.value = chNum;
  }

  // Get data from window.BPHS_COMPLETE_DB
  if (!window.BPHS_COMPLETE_DB || !window.BPHS_COMPLETE_DB[chNum]) {
    console.error("Chapter data not found for chapter " + chNum);
    return;
  }

  var ch = window.BPHS_COMPLETE_DB[chNum];

  // Update Header Banner
  var badge = document.getElementById('soloBadge');
  if (badge) badge.textContent = 'अध्याय ' + ch.chapter_number;

  var modBadge = document.getElementById('soloModBadge');
  if (modBadge) modBadge.textContent = ch.module_name;

  var totalPill = document.getElementById('soloTotalPill');
  if (totalPill) totalPill.textContent = '📖 कुल ' + ch.total_shlokas + ' सम्पूर्ण श्लोक';

  var titleSa = document.getElementById('soloTitleSa');
  if (titleSa) titleSa.textContent = ch.chapter_title_sanskrit;

  var titleEn = document.getElementById('soloTitleEn');
  if (titleEn) titleEn.textContent = ch.chapter_title_english;

  var desc = document.getElementById('soloDesc');
  if (desc) desc.textContent = ch.shastra_summary_hindi;

  var algo = document.getElementById('soloAlgo');
  if (algo) algo.textContent = ch.computational_algorithm_hook + ' — ' + ch.mathematical_formulation;

  var verseTitle = document.getElementById('currentChapterVerseTitle');
  if (verseTitle) verseTitle.textContent = 'अध्याय ' + ch.chapter_number + ' (' + ch.chapter_title_sanskrit + ') के सभी ' + ch.total_shlokas + ' श्लोक';

  // Sync Horizontal Module Tab active state
  document.querySelectorAll('.mod-nav-tab').forEach(function(tab) {
    tab.classList.remove('active');
    if (tab.getAttribute('data-mod') === ch.module_id) {
      tab.classList.add('active');
    }
  });

  // Render ALL shlokas for this chapter
  var stream = document.getElementById('soloShlokaStream');
  if (stream) {
    var htmlBlocks = [];
    ch.verses.forEach(function(v) {
      var vb = '<div class="verse-unit-card" id="verse-' + ch.chapter_number + '-' + v.verse_num + '">' +
        '<div class="verse-header">' +
          '<span class="verse-num-badge">📖 ' + v.verse_label + '</span>' +
          '<span class="verse-meta-tag">अध्याय ' + ch.chapter_number + ': ' + ch.chapter_title_sanskrit + '</span>' +
        '</div>' +
        '<div class="verse-shloka-box">' +
          '<pre class="verse-shloka-text">' + v.shloka + '</pre>' +
        '</div>' +
        '<div class="verse-anvaya-box">' +
          '<strong>📖 पद-छेद एवं अन्वय:</strong>' +
          '<p>' + v.anvaya + '</p>' +
        '</div>' +
        '<div class="verse-bhashya-box">' +
          '<strong>💡 शास्त्रीय भावार्थ एवं विस्तृत फलित व्याख्या:</strong>' +
          '<p>' + v.bhashya + '</p>' +
        '</div>' +
        '<div class="verse-math-box">' +
          '<strong>⚙️ खगोलीय गणितीय नियम / सूत्र (Algorithm & Ephemeris Hook):</strong>' +
          '<code>' + v.math + '</code>' +
        '</div>' +
      '</div>';
      htmlBlocks.push(vb);
    });
    stream.innerHTML = htmlBlocks.join('');
  }

  // Update URL Hash without reload
  if (history.replaceState) {
    history.replaceState(null, null, '#ch' + chNum);
  }

  // Smooth scroll to top of chapter
  var header = document.getElementById('soloChapterHeader');
  if (header) {
    header.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Next / Previous Chapter Navigation
function navChapter(delta) {
  var target = currentActiveChapter + delta;
  if (target < 1) target = 97;
  if (target > 97) target = 1;
  openSoloChapter(target);
}

// Module Bar Click Handler: Opens the first chapter of that module!
function filterModuleAndOpenFirst(modId, firstCh) {
  document.querySelectorAll('.mod-nav-tab').forEach(function(tab) {
    tab.classList.remove('active');
  });
  var activeTab = document.querySelector('.mod-nav-tab[data-mod="' + modId + '"]');
  if (activeTab) activeTab.classList.add('active');

  // Open the first chapter of this module in Solo Reader
  openSoloChapter(firstCh);
}

// Toggle between Solo Chapter Reader and All Chapters Directory Grid
function toggleDirectoryMode() {
  var readerWrapper = document.getElementById('soloReaderWrapper');
  var dirWrapper = document.getElementById('allChaptersDirWrapper');
  var toggleText = document.getElementById('toggleViewText');
  var toggleIcon = document.getElementById('toggleViewIcon');

  if (dirWrapper.style.display === 'none' || dirWrapper.style.display === '') {
    // Show directory
    dirWrapper.style.display = 'block';
    readerWrapper.style.display = 'none';
    if (toggleText) toggleText.textContent = 'वापस एकल अध्याय श्लोक पाठ';
    if (toggleIcon) toggleIcon.textContent = '📖';
    dirWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    // Show solo reader
    dirWrapper.style.display = 'none';
    readerWrapper.style.display = 'block';
    if (toggleText) toggleText.textContent = 'सभी ९७ अध्यायों की सूची';
    if (toggleIcon) toggleIcon.textContent = '📚';
    readerWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Directory Search Filter
function filterDirectory(q) {
  q = q.toLowerCase().trim();
  document.querySelectorAll('.dir-chapter-card').forEach(function(card) {
    var text = card.textContent.toLowerCase();
    if (!q || text.indexOf(q) !== -1) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

// Toggle Verse Detail expansion
function toggleAllVerseDetails(showFull) {
  document.querySelectorAll('.verse-anvaya-box, .verse-bhashya-box, .verse-math-box').forEach(function(el) {
    el.style.display = showFull ? 'block' : 'none';
  });
}
</script>

</body>
</html>
"""

# Extra CSS styling for the Chapter Reader and Chapter Selector Rail
reader_css = """
<style>
  /* CHAPTER SELECTOR RAIL */
  .chapter-selector-rail {
    max-width: 1300px;
    margin: 0 auto 1.5rem;
    padding: 0 1.5rem;
  }
  .selector-rail-inner {
    background: #120b24;
    border: 1px solid rgba(212, 175, 55, 0.35);
    border-radius: 16px;
    padding: 12px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    box-shadow: 0 6px 25px rgba(0,0,0,0.5);
  }
  .selector-group {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 280px;
  }
  .selector-label {
    font-size: 0.92rem;
    font-weight: 700;
    color: var(--gold-bright);
    white-space: nowrap;
  }
  .chapter-dropdown {
    flex: 1;
    background: #090514;
    border: 1px solid rgba(212, 175, 55, 0.4);
    color: #fef08a;
    font-size: 0.95rem;
    font-weight: 600;
    padding: 8px 14px;
    border-radius: 10px;
    outline: none;
    cursor: pointer;
    transition: all 0.2s;
  }
  .chapter-dropdown:focus {
    border-color: var(--gold-bright);
    box-shadow: 0 0 16px var(--gold-glow);
  }
  .nav-btn-group {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .chapter-nav-btn {
    background: rgba(180, 130, 32, 0.15);
    border: 1px solid rgba(212, 175, 55, 0.35);
    color: #e2e8f0;
    padding: 7px 14px;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
  }
  .chapter-nav-btn:hover {
    background: rgba(180, 130, 32, 0.35);
    border-color: var(--gold-bright);
    color: #fff;
  }
  .chapter-nav-btn.large {
    padding: 10px 22px;
    font-size: 0.95rem;
  }
  .view-toggle-btn {
    background: linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(124, 19, 5, 0.2));
    border: 1px solid rgba(56, 189, 248, 0.4);
    color: #38bdf8;
    padding: 7px 14px;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }
  .view-toggle-btn:hover {
    background: rgba(56, 189, 248, 0.25);
    color: #fff;
    border-color: #38bdf8;
  }

  /* SOLO CHAPTER READER STYLES */
  .solo-reader-wrapper {
    max-width: 1300px;
    margin: 0 auto;
    padding: 0 1.5rem 3rem;
  }
  .solo-chapter-header {
    background: linear-gradient(135deg, #180e30 0%, #0d071a 100%);
    border: 2px solid var(--gold);
    border-radius: 20px;
    padding: 2.2rem;
    box-shadow: 0 10px 40px rgba(0,0,0,0.6), 0 0 25px var(--gold-glow);
    margin-bottom: 1.8rem;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }
  .solo-top-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .solo-chapter-badge {
    background: linear-gradient(135deg, #b48220, #7c1305);
    color: #fff;
    font-weight: 800;
    font-size: 0.9rem;
    padding: 5px 16px;
    border-radius: 20px;
    box-shadow: 0 2px 10px rgba(180, 130, 32, 0.4);
  }
  .solo-module-badge {
    background: rgba(56, 189, 248, 0.12);
    border: 1px solid rgba(56, 189, 248, 0.35);
    color: #38bdf8;
    font-weight: 700;
    font-size: 0.85rem;
    padding: 4px 12px;
    border-radius: 16px;
  }
  .solo-shloka-total-pill {
    background: rgba(254, 240, 138, 0.12);
    border: 1px solid rgba(254, 240, 138, 0.35);
    color: #fef08a;
    font-weight: 700;
    font-size: 0.85rem;
    padding: 4px 12px;
    border-radius: 16px;
    margin-left: auto;
  }
  .solo-chapter-title-sa {
    font-family: 'Rozha One', 'Cinzel', serif;
    font-size: 2.3rem;
    color: var(--gold-bright);
    margin: 0;
    text-shadow: 0 0 15px rgba(212, 160, 23, 0.3);
  }
  .solo-chapter-title-en {
    color: #94a3b8;
    font-size: 1.2rem;
    font-weight: 600;
    margin-top: -6px;
  }
  .solo-desc-card {
    background: rgba(0, 0, 0, 0.4);
    border-left: 4px solid var(--gold-bright);
    border-radius: 0 12px 12px 0;
    padding: 1rem 1.4rem;
  }
  .desc-card-title {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--gold-bright);
    margin-bottom: 4px;
  }
  .solo-desc-card p {
    color: #e2e8f0;
    font-size: 1.05rem;
    line-height: 1.8;
    margin: 0;
  }
  .solo-algo-card {
    background: rgba(56, 189, 248, 0.08);
    border: 1px solid rgba(56, 189, 248, 0.25);
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 0.86rem;
  }
  .algo-card-title {
    color: #38bdf8;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .solo-algo-card code {
    color: #fef08a;
    font-family: monospace;
    word-break: break-all;
  }

  .verse-action-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 1.4rem;
    padding: 0 4px;
  }
  .solo-shloka-stream {
    display: flex;
    flex-direction: column;
    gap: 1.8rem;
  }
  .verse-meta-tag {
    font-size: 0.8rem;
    color: var(--accent-cyan);
    font-weight: 600;
    margin-left: auto;
  }
  .solo-chapter-bottom-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 2.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(212, 175, 55, 0.25);
    flex-wrap: wrap;
    gap: 12px;
  }

  /* ALL CHAPTERS DIRECTORY GRID */
  .all-chapters-dir-wrapper {
    max-width: 1300px;
    margin: 0 auto;
    padding: 0 1.5rem 3rem;
  }
  .dir-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }
  .dir-search-wrap {
    max-width: 500px;
    margin: 0 auto 1.8rem;
  }
  .dir-search-wrap input {
    width: 100%;
    background: #140d28;
    border: 1px solid rgba(212, 175, 55, 0.4);
    color: #fff;
    padding: 0.75rem 1.2rem;
    border-radius: 12px;
    font-size: 0.95rem;
    outline: none;
  }
  .dir-search-wrap input:focus {
    border-color: var(--gold-bright);
    box-shadow: 0 0 16px var(--gold-glow);
  }
  .all-chapters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.2rem;
  }
  .dir-chapter-card {
    background: #120b24;
    border: 1px solid rgba(212, 175, 55, 0.25);
    border-radius: 14px;
    padding: 1.2rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .dir-chapter-card:hover {
    border-color: var(--gold-bright);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.6), 0 0 15px var(--gold-glow);
  }
  .dir-card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .dir-num-badge {
    background: rgba(180, 130, 32, 0.25);
    color: #fef08a;
    font-weight: 800;
    font-size: 0.8rem;
    padding: 2px 10px;
    border-radius: 12px;
    border: 1px solid rgba(212, 175, 55, 0.35);
  }
  .dir-shloka-count {
    color: #38bdf8;
    font-size: 0.8rem;
    font-weight: 700;
  }
  .dir-title-sa {
    color: var(--gold-bright);
    font-family: 'Rozha One', serif;
    font-size: 1.25rem;
    margin: 2px 0;
  }
  .dir-title-en {
    color: #94a3b8;
    font-size: 0.88rem;
    font-weight: 600;
  }
  .dir-desc {
    color: #cbd5e1;
    font-size: 0.86rem;
    line-height: 1.6;
    margin: 4px 0 8px;
  }
  .dir-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(255,255,255,0.06);
    padding-top: 8px;
    margin-top: auto;
  }
  .dir-algo-tag {
    font-family: monospace;
    font-size: 0.75rem;
    color: #7dd3fc;
  }
  .dir-action-link {
    color: var(--gold-bright);
    font-weight: 700;
    font-size: 0.82rem;
  }
</style>
"""

final_portal_html = preamble + reader_section_html + reader_js
final_portal_html = final_portal_html.replace("</head>", reader_css + "\n</head>")

with open("bphs-encyclopedia.html", "w", encoding="utf-8") as f:
    f.write(final_portal_html)

print(f"SUCCESS! bphs-encyclopedia.html re-architected with Solo Chapter Reader! Size: {len(final_portal_html)} bytes.")
