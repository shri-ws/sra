# 日本市場向けサイト改修概要（ブランチ `claude/mkt-japanese-7dbd8b`）

ステータス：worktree ブランチ上で実装完了、未プッシュ。

## 新規作成ページ (`ja/`)

日本市場向けランディングページ群：

| ページURL | 提供鑑定サービス | 米ドル価格 | 遷移先リンク |
|---|---|---|---|
| `/ja/` | 日本語ポータル総合案内ページ | — | 各個別ページへリンク |
| `/ja/vedic-birth-chart.html` | パラーシャラ97章 全本命盤鑑定（D1–D60分割盤、ヨーガ、ダシャー） | USD 21 | `/parashara-report.html?cur=usd` |
| `/ja/aisho-matching.html` | 伝統結婚・相性鑑定（グン・ミラン36点、火星ドーシャ分析） | USD 21 | `/gun-milan.html?cur=usd` |
| `/ja/dhana-yoga.html` | 富と繁栄のヨーガ鑑定（ダナ・ヨーガ、第2・第11室） | USD 11 | `/dhan-yoga-calculator.html?cur=usd` |

## デザインおよび技術実装

- `ja/ja.css`：日本語の文字組みと可読性に配慮したクリーンなスタイルシート。ダークモード対応。
- `ja/ja.js`：パラメータ（`?cur=usd`、`?ref=`）を保持し、自動翻訳クッキー（`googtrans=/en/ja`）を設定して遷移。
- Schema.org `Product` JSON-LD 構造化データ（米ドル価格設定）。
- Open Graph タグ、カノニカルリンクおよび `hreflang`（`ja`, `en`, `hi`, `x-default`）。
