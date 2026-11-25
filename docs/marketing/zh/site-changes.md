# 华语受众站点更新说明（分支 `claude/mkt-chinese-5a882a`）

状态：已在 worktree 分支中实现，未推送到远程仓库。

## 新增页面 (`zh/`)

面向新加坡、台湾、香港、北美及澳洲华语受众：

| 页面路径 | 核心服务 | 美元定价 | 目标跳转链接 |
|---|---|---|---|
| `/zh/` | 华语总览聚合页，包含三大报告简介与支付提示 | — | 链接至下方子页面 |
| `/zh/feituo-benmingpan.html` | 吠陀本命盘全盘深度分析（97章原典、D1–D60分盘、大运流年） | USD 21 | `/parashara-report.html?cur=usd` |
| `/zh/hepan-peidui.html` | 古典合婚36分配对与火星煞排查（Gun Milan & Manglik） | USD 21 | `/gun-milan.html?cur=usd` |
| `/zh/caifu-yujia.html` | 财富瑜伽与财运时机分析（Dhana Yogas，2宫与11宫财帛） | USD 11 | `/dhan-yoga-calculator.html?cur=usd` |

## 样式与技术细节

- `zh/zh.css`：专为中文排版优化的清晰样式表，适配移动端和深色模式。
- `zh/zh.js`：参数转发脚本，保留 `?cur=usd` 与 `?ref=`，并设置全站语言转换 Cookie（`googtrans=/en/zh-CN`）。
- 包含 Schema.org `Product` JSON-LD 结构化数据（USD 价格）。
- 完整的 Open Graph 社交标签、规范链接（Canonical）与 `hreflang`（`zh`, `en`, `hi`, `x-default`）。
