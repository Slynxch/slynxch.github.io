# slynxch.github.io

Slynx_ch 的個人網站 — 電腦科學・程式設計・AI・經典閱讀。

🔗 **https://slynxch.github.io**

## 設計

- **風格**：墨黑 × 香檳金的編輯式排版，搭配象牙紙色的「關於我」與引言段落；字體使用 Cormorant Garamond、Noto Serif TC、Inter 與 Noto Sans TC。
- **動畫**：開場倒數幕簾、逐字浮現的標題、可隨滑鼠轉動的金色點陣球體與軌道（Canvas）、隨捲動速度變化的跑馬燈、捲動填色文字、深淺主題平滑轉換、磁吸按鈕、3D 傾斜卡片與自訂游標。
- **作品**：「我的作品」區塊會即時從 GitHub API 讀取公開專案（快取 1 小時），專案不足時以「Coming Soon」補位。
- **無障礙**：支援 `prefers-reduced-motion`、鍵盤操作、跳至主要內容連結；停用 JavaScript 時內容仍可完整瀏覽。

## 結構

```
index.html            主頁
404.html              自訂 404 頁面
assets/css/style.css  樣式
assets/js/main.js     互動與動畫（原生 JavaScript，無相依套件）
assets/favicon.svg    網站圖示
assets/og-image.jpg   社群分享預覽圖
```

## 本機預覽

```bash
python3 -m http.server 8000
```

然後開啟 http://localhost:8000 。

## 自訂

- 文字內容都在 `index.html`，直接修改即可。
- 主色調在 `assets/css/style.css` 開頭的 `:root` 變數（如 `--gold`、`--ink`、`--paper`）。
- GitHub 使用者名稱在 `assets/js/main.js` 的 `GITHUB_USER`。
