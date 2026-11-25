# Russian-speaking market: plan (25 November 2026)

**सार (हिन्दी में):** रूस और बेलारूस के ग्राहक अभी हमें भुगतान नहीं कर सकते — रूस के Visa/Mastercard कार्ड 10 मार्च 2022 से देश के बाहर नहीं चलते और Razorpay रूस का Mir कार्ड नहीं लेता। इसलिए रूस में विज्ञापन पर पैसा न लगाएँ। जो रूसी भाषी भुगतान कर सकते हैं: कज़ाख़स्तान, इज़राइल, जर्मनी और यूरोप, बाल्टिक देश (और यूक्रेन, पर वहाँ यूक्रेनी भाषा बेहतर है)। यह सब तभी चलेगा जब Razorpay में International Payments चालू हो — यह अभी पक्का नहीं है। सबसे ज़्यादा बिकने लायक 3 रिपोर्ट: मेगा पाराशर ($21), गुण मिलान + मांगलिक ($21), धन योग ($11)। रिपोर्ट अभी अंग्रेज़ी/हिन्दी में ही बनती है, रूसी में नहीं — यह सबसे बड़ी कमी है।

---

## 1. Payment: who can actually pay us

Our checkout is Razorpay. Since 22 Nov 2026 visitors outside India get a USD order (`sutradhar_engine.py`, `USD_PRICE_BY_INR`), with a fallback to INR if the account cannot take USD. **Whether International Payments is switched on in the live Razorpay account is still unconfirmed** — until it is, nobody below can pay and none of this plan should spend money.

Razorpay takes international cards on Visa, Mastercard, American Express and Diners (Diners only for registered companies); it does not list Mir. Its compliance screening runs against OFAC, UN, EU and UK lists through its Authorised Dealer bank. ([Razorpay cards](https://razorpay.com/docs/us/payments/payment-methods/cards.md), [Razorpay international FAQ](https://razorpay.com/docs/payments/international-payments/faqs.md), [Razorpay sanctions screening FAQ](https://razorpay.com/docs/payments/international-payments/accept-international-payments-from-indian-customers/custom-integration/faqs.md))

| Where the buyer's card is issued | Can they pay us? | Why (source) |
|---|---|---|
| **Russia** | **No.** Market blocked for now. | Visa and Mastercard stopped cross-border use of Russian-issued cards from 10 March 2022; the Bank of Russia said they no longer work in foreign online stores ([Bank of Russia](https://www.cbr.ru/eng/press/event/?id=12748), [Mastercard](https://www.mastercard.com/news/press/2022/march/mastercard-statement-on-suspension-of-russian-operations)). Mir is not a Razorpay network. Sberbank is even closing its foreign-currency Visa/MC cards from 1 Sep 2026 because they cannot pay abroad ([Meduza](https://meduza.io/en/news/2026/07/24/sberbank-to-close-foreign-currency-and-multicurrency-visa-and-mastercard-cards-starting-september-1)). |
| **Belarus** | **No, in practice.** Do not target. | Cross-border limits since March 2022; Visa blocked cards of Belagroprombank, Belgazprombank and Alfa-Bank Belarus in the EEA (March 2026), Mastercard followed for two of them (April 2026); several more Belarusian banks are under EU sanctions ([Novaya Gazeta](https://novayagazeta.ru/articles/2026/03/20/karty-visa-trekh-belorusskikh-bankov-perestali-rabotat-v-es-imi-massovo-polzovalis-rossiiane-dlia-poezdok-za-granicu-news), [Interfax](https://www.interfax.com/newsroom/top-stories/116753/)). Cards of other banks "should work, but no guarantees" — too unreliable to market to. |
| **Kazakhstan** | **Yes, likely.** Test with one real payment first. | Kazakh banks issue normal Visa/Mastercard that work internationally; Kazakh cards are the ones that pay for App Store, Google Play, Booking etc. ([banki.ru catalogue](https://www.banki.ru/products/debitcards/catalogue/karty-kazakhstana/), [BCC Click to Pay](https://www.bcc.kz/en/about/press-center/click-to-pay/)). I found no Kaspi page that confirms Kaspi Gold at a foreign web checkout, so a test payment is needed. |
| **Israel, Germany and the rest of the EU, Estonia, Latvia, Lithuania** | **Yes.** | Ordinary Visa/Mastercard with 3-D Secure; Razorpay accepts cards issued by overseas banks on all major networks ([Razorpay international FAQ](https://razorpay.com/docs/sg/payments/international-payments/faqs.md)). |
| **Ukraine** | **Yes**, within National Bank limits far above our prices. | Ukrainian cards can pay online abroad without notifying the bank; hryvnia-card payments abroad are capped at UAH 200,000 a month ([kurs.com.ua](https://kurs.com.ua/en/novost/1459595-ukrayinski-bankivski-karti-za-kordonom-sho-dozvoleno-ta-jaki-limiti-zalishajutsja), [Raiffeisen Ukraine](https://raiffeisen.ua/en/news/nbu-vprovadiv-paket-pomyakshennya-valyutnih-obmezhen-2361)). But see "Ukraine" below: use Ukrainian-language copy, not Russian. |
| Armenia, Georgia, Uzbekistan, Kyrgyzstan, Moldova | Probably yes; not checked here. | Local Visa/MC; verify with a test payment before spending on ads. |

**Plain answer:** the Russia market itself is blocked for now, and so is Belarus. We market only to Russian speakers who live in, and hold cards from, Kazakhstan, Israel, the EU (Germany first) and the Baltics. The Russian landing pages say openly that cards issued in Russia and Belarus are not accepted. We do not advise anyone on getting foreign cards or other ways round the restrictions.

**What the user should check before any spend**
1. Razorpay dashboard: International Payments on, USD settlement on.
2. One real $11 test payment with a non-Indian card (a friend in Kazakhstan, Israel or Germany).
3. A test purchase of each of the 3 reports from outside India, to confirm the PDF comes in English (the reports are generated in Hindi or English; there is no Russian report).

## 2. Who buys, in the countries that can pay

| Country | Russian speakers (estimate) | Source |
|---|---|---|
| Kazakhstan | about 3.8 million native speakers (21%); far more use Russian as a second language | [Wikipedia: Russian speakers](https://en.wikipedia.org/wiki/Geographical_distribution_of_Russian_speakers) |
| Germany | about 1.9 million native speakers (2024) | same |
| Israel | about 1.2 million (15% of the population, 2011 figure) | same |
| Estonia / Latvia / Lithuania | about 29% / 33% / 7% native speakers (older figures) | same |

The ICDS think tank warns that "30 million Russian speakers abroad" is exaggerated; verifiable figures outside Russia in the former USSR are about 15 million ([ICDS 2019](https://icds.ee/wp-content/uploads/2019/09/ICDS_EFPI_Analysis_Russians_in_Europe_Anna_Tiido_September_2019.pdf)).

Likely buyer (judgement, not data): a woman of 28–50 who already follows a jyotish teacher or Telegram channel, knows words like "накшатра", "даша", "Раху", and wants something written and checkable — a full chart reading, a compatibility check before marriage, or money timing. She is used to paying a Russian-speaking astrologer 40 EUR an hour or a few thousand roubles per reading (see section 4), so $11–21 for a long report is cheap to her. Her main doubts: the report is in English, and a foreign site.

**Ukraine:** many Ukrainians now avoid Russian-language commercial content, and VKontakte, Odnoklassniki, Mail.ru and Yandex have been blocked there by decree since 2017, extended several times ([Kyiv Post](https://www.kyivpost.com/technology/ukraine-prolongs-ban-on-russian-websites-vkontakte-odnoklassniki-until-2023.html), [Hromadske](https://hromadske.ua/en/posts/ukraine-extends-ban-on-popular-russian-websites)). Recommendation: do not push Russian ads into Ukraine; if Ukraine is wanted, make a separate Ukrainian-language set later.

## 3. Search terms

**Yandex Wordstat needs a signed-in Yandex ID; I did not create one**, so I have no Wordstat volumes. If you want exact monthly numbers, sign in at wordstat.yandex.ru and check the phrases below for Kazakhstan, Israel, Germany and the Baltics (Wordstat lets you pick regions).

**Google Trends (worldwide, last 5 years, read 25 Nov 2026)** — relative interest, 100 = the peak of the strongest term ([Google Trends](https://trends.google.com/trends/explore?date=today%205-y&q=%D0%B2%D0%B5%D0%B4%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B0%D1%8F%20%D0%B0%D1%81%D1%82%D1%80%D0%BE%D0%BB%D0%BE%D0%B3%D0%B8%D1%8F,%D0%B4%D0%B6%D0%B9%D0%BE%D1%82%D0%B8%D1%88,%D0%BD%D0%B0%D1%82%D0%B0%D0%BB%D1%8C%D0%BD%D0%B0%D1%8F%20%D0%BA%D0%B0%D1%80%D1%82%D0%B0&hl=ru)):

| Term | 5-year average | Latest weeks (Nov 2026) |
|---|---|---|
| натальная карта (natal chart, any system) | 40 | 25–29 |
| джйотиш | 4 | 2–3 |
| ведическая астрология | 1 | 0–1 |

What this says: jyotish is a small niche next to Western natal-chart interest (about 1:10), and on Google it has drifted down since 2023 (4–6 in 2022–23, 2–3 now). Most Russia searches go through Yandex (about 70% in Russia, [StatCounter](https://gs.statcounter.com/search-engine-market-share/all/russian-federation)), but Russia cannot pay anyway. In Kazakhstan Google has about 69% and Yandex about 29% ([StatCounter](https://gs.statcounter.com/search-engine-market-share/all-worldwide/kazakhstan)); in Israel and the EU Google dominates. So **Google is the main search channel for the payable market**, Yandex only for Kazakhstan.

Rising related queries on Google Trends (same page) show what people want — a calculation **with an explanation**:
- "ведическая астрология рассчитать с расшифровкой" +1,050%
- "джйотиш рассчитать онлайн с расшифровкой" +350%
- "джйотиш рассчитать онлайн бесплатно" +250%; "рассчитать натальная карта джйотиш онлайн бесплатно с расшифровкой" +250%
- "раху" +40%

**Keyword list for ads and page text** (to be sized in Wordstat / Google Keyword Planner):
- Full chart: джйотиш с расшифровкой, ведическая натальная карта расшифровка, разбор карты джйотиш, джйотиш гороскоп по дате рождения, ведический гороскоп полный
- Compatibility: совместимость по джйотиш, кута совместимость, гуна милан, ашта кута 36 баллов, мангал доша
- Money: йоги богатства в гороскопе, дхана йога, джйотиш деньги, 2 и 11 дом джйотиш
- Negatives (exclude in ads): бесплатно, скачать, программа, обучение, курс

## 4. Competitors and prices

| Who | What | Price | Source |
|---|---|---|---|
| OnlineJyotish.com (Russian section) | Free janma kundali in Russian with descriptions; paid PDF horoscope "400+ pages, 100-year forecast", year forecasts | Free; paid price not shown in results | [onlinejyotish.com/russian-astrology](https://www.onlinejyotish.com/russian-astrology/), [paid kundali](https://www.onlinejyotish.com/astrology-services/paid-janmakundali.php?lang=ru) |
| OnlineJyotish guna milan | Free Russian guna-milan report | Free | [compatibility report](https://www.onlinejyotish.com/russian-astrology/vedic-compatibility-report.php?service=guna-milan) |
| fatebydate.ru, sutra.center, astrolloai.ru | Russian jyotish calculators / AI readings; astrolloai has paid tiers | Not checked | [fatebydate](https://fatebydate.ru/vedicheskaya-astrologiya/), [sutra.center FAQ](https://sutra.center/faq), [astrolloai pricing](https://astrolloai.ru/pricing) |
| "Твам Джйотиш" app | Kundli/horoscope app in Russian on the App Store | Not checked | [App Store](https://apps.apple.com/us/app/%D1%82%D0%B2%D0%B0%D0%BC-%D0%B4%D0%B6%D0%B9%D0%BE%D1%82%D0%B8%D1%88-%D0%BA%D1%83%D0%BD%D0%B4%D0%BB%D0%B8-%D0%B3%D0%BE%D1%80%D0%BE%D1%81%D0%BA%D0%BE%D0%BF/id1449579147?l=ru) |
| Russian-speaking astrologers (consultations) | Written reading 1,000 RUB, "VIP" full reading 4,500 RUB (a Dzen blog); 90-min natal analysis 10,700 RUB (Teletype); 40 EUR/hour (Lithuania listing) | as stated | [Dzen](https://dzen.ru/suite/577d418e-d79a-47d5-be87-4b10b959f7fe), [Teletype](https://teletype.in/@elena_vlasova_astrolog/format_consulting), [paslaugos.lt](https://paslaugos.lt/tatjana-oganjan-da989) |

Our position: free tools already exist in Russian, so we cannot win on "free calculation". We win on **depth with proof** — a long written report where each conclusion cites the Sanskrit shloka and the BPHS chapter, computed on Swiss Ephemeris — at $11–21, below one hour with a European astrologer. Our weakness: the report is in English (Hindi option), and the checkout page is machine-translated. Say this openly; do not hide it.

## 5. Channels (in order of priority)

1. **Telegram** — where Russian-speaking jyotish readers are, in every country. Two routes:
   - *Posts bought in jyotish channels.* Channels exist (for example telemetr.me lists "Ведическая Астрология-Джйотиш" @kalachakra_yuga and @jyotish9graha), but subscriber counts and fake-subscriber share must be checked on TGStat/Telemetr before paying ([telemetr.me/content/kalachakra_yuga](https://telemetr.me/content/kalachakra_yuga), [telemetr.me/content/jyotish9graha](https://telemetr.me/content/jyotish9graha)). Ask admins for audience geography first: a channel whose readers are mostly in Russia is useless to us.
   - *Telegram Ads.* No official minimum budget, only a minimum CPM; resellers ask about EUR 250–500 to start; the self-serve cabinet is funded in Gram (formerly TON) from about 20 Gram; third-party CPM estimates for Kazakhstan are 0.2–0.7 TON ([tgads.net cost](https://tgads.net/hub/telegram-ads-cost), [tgads.net calculator](https://tgads.net/hub/calculator), [ppc.world](https://ppc.world/news/telegram-ads-snizil-minimalnye-stavki-cpm-na-30/)). Reseller figures, not official — confirm at ads.telegram.org.
   - *Our own channel* in Russian for long-form posts (drafts in `posts-and-ads.md`).
2. **Google Ads** in Russian, geo-targeted to Kazakhstan, Israel, Germany, Estonia, Latvia, Lithuania. Russia and Belarus excluded. Start with the three landing pages.
3. **YouTube** — Shorts and one long video in Russian explaining guna milan and the 97-chapter report. Charts shown must be real (Astro-Databank or user-given), never invented people.
4. **Yandex Direct** — only for Kazakhstan (Yandex about 29% there). Whether a foreign (Indian) advertiser can fund a Direct account in Kazakhstan was not clear from Yandex help pages ([Direct payment FAQ](https://yandex.ru/support/direct/ru/payments/faq)); check with Yandex Kazakhstan support before planning on it.
5. **VK** — skip for now: its audience is mostly inside Russia (which cannot pay) and it is blocked in Ukraine.

Suggested first test (needs your yes, nothing started): after Razorpay is confirmed, USD 150–200 on Google Ads (Kazakhstan + Israel + Germany, Russian language, the 3 landing pages) for two weeks, plus one paid post in one checked Telegram jyotish channel. Measure clicks → payments per page. Stop if no payment after about 300 landing-page visits.

## 6. The 3 reports most likely to sell

| # | Report | Price outside India | Why this one |
|---|---|---|---|
| 1 | **Mega Parashara report** (97 BPHS chapters) | USD 21 | Matches the strongest rising search: "рассчитать … с расшифровкой" — people want the whole chart *explained*. Free Russian calculators give a chart; we give a long written reading with shloka references. Our flagship. |
| 2 | **Gun Milan + Manglik** | USD 21 | Compatibility is the classic paid question; Russian jyotish readers know "кута"/"гуна милан". Competitors give the 36-point score free; we add Nadi/Bhakut and Manglik checks for both partners in one report. |
| 3 | **Dhana Yoga report** | USD 11 | Lowest price, money question with a clear promise (which wealth yogas, which dasha brings money). Good first purchase and easy ad. |

Not chosen: Kaal Sarp and Manglik alone (fear-led framing does not suit this audience and Manglik is inside report 2); muhurtas (they depend on the family's location and Hindu ceremonies like griha pravesh, upanayana, mundan — little demand among Russian speakers).

## 7. Site changes made (branch `claude/mkt-russian-5d1ded`, not pushed)

- `ru/index.html` — Russian hub page for the 3 reports.
- `ru/parashara.html`, `ru/gun-milan.html`, `ru/dhana-yoga.html` — Russian landing copy, USD prices, honest notes (report in English; cards issued in Russia and Belarus not accepted), `hreflang` ru / hi / x-default, canonical, Open Graph.
- Buttons go to the existing report pages with `?cur=usd` and switch the site's own Google-translate cookie to Russian, so the checkout page opens in (machine) Russian.
- `sitemap-ru.xml` + one `Sitemap:` line in `robots.txt` (same layout as the French session, to avoid clashes).
- `llms.txt`: one line on the Russian pages.

These pages should go live **only after** the Razorpay check in section 1.

## 8. Needs your approval (nothing has been done)

- Push the branch (auto-deploys).
- Any ad money (Google Ads, Telegram Ads, paid channel posts).
- Posting any of the drafts, creating a Telegram channel, Yandex or Google Ads accounts.
- Whether to make a Russian-language version of the reports themselves — the biggest single improvement for this market, and a product task, not marketing.
