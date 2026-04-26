# product-research

華克電腦產品研究報告（公開版）。對外公開的筆電、AI PC、商用機種深度評測。

## 部署

- **Repo**: GitHub Public
- **發布**: Cloudflare Pages（自動 webhook，1~2 分鐘上線）
- **網址**: `https://research.voccomputerpage.com.tw`（規劃中）/ `product-research.voccomputer.workers.dev`（預設）
- **存取**: 公開，不掛 Access

## 結構

```
product-research/
├── index.html              # 總覽頁（卡片牆 + 搜尋 + 品牌篩選）
├── assets/style.css        # 共用樣式
├── data/reports.json       # 報告 metadata（給 index 自動列表用）
└── research/
    └── *.html              # 各別研究報告 HTML
```

## 新增一篇報告

1. 把研究報告 HTML 放到 `research/<slug>.html`
2. 編輯 `data/reports.json`，在 `reports` 陣列加一筆：

```json
{
  "slug": "lenovo-thinkpad-t14",
  "title": "Lenovo ThinkPad T14 Gen 6 研究報告",
  "brand": "Lenovo",
  "category": "商用筆電",
  "model": "ThinkPad T14 Gen 6",
  "summary": "...",
  "tags": ["商用", "AMD", "14吋"],
  "publishedAt": "2026-04-30",
  "updatedAt": "2026-04-30",
  "url": "research/lenovo-thinkpad-t14.html"
}
```

3. `git add . && git commit && git push` → Cloudflare 自動部署

## 內容規範

- 對外公開內容，**不可包含**內部成本、議價空間、利潤分析、業務評論
- 個人筆記版（含敏感資訊）保留在 `voc-reports/research/` 私密 repo
