# 攝影服務 API 集成指南

## 📡 API 端點概述

### 公開 API（前台）

#### 1. 獲取分類清單頁面

```http
GET /p/:slug
```

**參數：**
- `slug` (string): 頁面 slug，例如 `photography-services`

**響應示例：**
```json
{
  "page": {
    "id": "abc123",
    "title": "攝影服務",
    "slug": "photography-services",
    "subtitle": "捕捉每一個珍貴的瞬間",
    "pageType": "collection",
    "contentKind": "portfolio",
    "published": true
  },
  "items": [
    {
      "id": "item1",
      "title": "企業領導人形象照",
      "slug": "corporate-portrait-001",
      "category": "portrait-branding",
      "description": "為企業高管拍攝的專業形象照...",
      "coverImage": { "url": "...", "alt": "..." },
      "images": [...]
    }
  ],
  "categories": [
    {
      "id": "portrait-branding",
      "label": "人像與形象攝影",
      "sortOrder": 70
    }
  ]
}
```

**使用場景：**
- 前端分類清單頁面渲染
- JavaScript 動態篩選
- SEO 友善的靜態頁面

---

#### 2. 獲取單個作品項目詳情

```http
GET /p/:pageSlug/:itemSlug
```

**參數：**
- `pageSlug` (string): 頁面 slug，例如 `photography-services`
- `itemSlug` (string): 項目 slug，例如 `corporate-portrait-001`

**響應示例：**
```json
{
  "page": { ... },
  "item": {
    "id": "item1",
    "title": "企業領導人形象照",
    "slug": "corporate-portrait-001",
    "category": "portrait-branding",
    "description": "...",
    "coverImage": { ... },
    "images": [
      {
        "url": "...",
        "type": "image",
        "alt": "..."
      }
    ],
    "previousItem": { ... },
    "nextItem": { ... }
  },
  "relatedItems": [...]
}
```

**使用場景：**
- 作品詳情頁面
- 圖庫瀏覽
- 上/下一項導航

---

#### 3. 獲取作品項目列表（JSON）

```http
GET /cms/custom-pages/items.json?pageSlug=photography-services
```

**查詢參數：**
- `pageSlug` (string): 頁面 slug
- `categoryId` (string, 可選): 分類 ID，用於篩選

**響應示例：**
```json
{
  "items": [
    {
      "id": "item1",
      "title": "企業領導人形象照",
      "slug": "corporate-portrait-001",
      "category": "portrait-branding",
      "coverUrl": "..."
    }
  ],
  "categories": [...]
}
```

**使用場景：**
- JavaScript 動態內容加載
- 精選作品輪播選擇器
- 前端篩選和搜尋

---

### CMS 後台 API

#### 1. 創建自訂頁面

```http
POST /cms/custom-pages
```

**請求體：**
```json
{
  "title": "攝影服務",
  "slug": "photography-services",
  "subtitle": "捕捉每一個珍貴的瞬間",
  "pageType": "collection",
  "contentKind": "portfolio",
  "metaDescription": "...",
  "published": false
}
```

**需要認證：** ✅ 是（管理員）

---

#### 2. 添加分類

```http
POST /cms/custom-pages/:pageId/categories
```

**請求體：**
```json
{
  "label": "人像與形象攝影",
  "description": "...",
  "sortOrder": 70
}
```

**需要認證：** ✅ 是（管理員）

---

#### 3. 添加作品項目

```http
POST /cms/custom-pages/:pageId/items
```

**請求體：**
```json
{
  "title": "企業領導人形象照",
  "slug": "corporate-portrait-001",
  "category": "portrait-branding",
  "description": "...",
  "coverImageUrl": "https://...",
  "images": [
    {
      "url": "https://...",
      "type": "image",
      "alt": "..."
    }
  ]
}
```

**需要認證：** ✅ 是（管理員）

---

#### 4. 上傳圖片

```http
POST /cms/media/upload
Content-Type: multipart/form-data
```

**參數：**
- `files`: 檔案陣列（最多 30 個）
- `albumId`: 相簿 ID（可選）

**響應：**
```json
{
  "files": [
    {
      "id": "media-abc123",
      "url": "https://storage.googleapis.com/...",
      "name": "image.jpg",
      "size": 1048576,
      "imageMetadata": {
        "originalWidth": 3000,
        "originalHeight": 2000,
        "processedWidth": 2048,
        "processedHeight": 1365,
        "dpi": 72,
        "colorSpace": "srgb",
        "format": "jpeg"
      }
    }
  ]
}
```

**需要認證：** ✅ 是（管理員）

---

## 🔧 前端集成範例

### 1. 取得並渲染分類清單

```javascript
// 從 Express 路由取得
async function loadPhotographyServices() {
  const response = await fetch('/cms/custom-pages/items.json?pageSlug=photography-services');
  const data = await response.json();
  
  console.log('分類:', data.categories);
  console.log('項目:', data.items);
  
  // 動態渲染...
}
```

### 2. 分類篩選

```javascript
// 使用現有的 public/js/main.js 篩選邏輯
document.querySelectorAll('.works-filter-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    const filterValue = this.dataset.filter;
    const matchValues = this.dataset.match.split(',');
    
    // 篩選顯示
    document.querySelectorAll('.work-card').forEach(card => {
      const cardCategory = card.dataset.category;
      card.style.display = matchValues.includes(cardCategory) ? 'block' : 'none';
    });
  });
});
```

### 3. 精選作品輪播

```javascript
// 在首頁用精選作品輪播（carousel 模組）
async function loadFeaturedWorks() {
  const response = await fetch('/cms/custom-pages/items.json?pageSlug=photography-services');
  const data = await response.json();
  
  // 選擇前 6 個項目
  const featured = data.items.slice(0, 6);
  
  // 轉換為輪播模組可用的格式
  const carouselData = featured.map(item => ({
    id: item.id,
    title: item.title,
    coverUrl: item.coverUrl,
    link: `/p/photography-services/${item.slug}`,
    hasVideo: item.hasVideo
  }));
  
  // 渲染輪播...
}
```

---

## 🔐 認證和權限

### 管理員 API

所有 CMS 後台 API 都需要：

1. **會話認證**
   ```
   Cookie: connect.sid=xxx
   ```

2. **租戶識別**
   ```
   Middleware: resolveTenant (自動從會話提取)
   ```

3. **権限檢查**
   ```
   Middleware: requireAuth (確保已登入)
   ```

### 公開 API

前台 API 不需要認證，但會檢查 `published` 狀態：
- ✅ 已發佈的頁面和項目可見
- ❌ 草稿或未發佈的內容不可見

---

## 📊 數據模型

### Page 模型

```javascript
{
  id: string,                    // 頁面 ID
  title: string,                 // 頁面標題
  slug: string,                  // URL slug
  subtitle: string,              // 副標題
  pageType: "collection" | "content",
  contentKind: "portfolio" | "article",
  metaDescription: string,       // SEO 描述
  titleSize: "small" | "medium" | "large" | "xlarge",
  modules: Array,                // 頁面模組
  published: boolean,
  publishAt: Date,
  backgroundImage: string,       // 背景圖片 URL
  createdAt: Date,
  updatedAt: Date
}
```

### Category 模型

```javascript
{
  id: string,
  pageId: string,                // 所屬頁面
  label: string,                 // 分類名稱
  description: string,
  sortOrder: number,             // 排列順序
  parentCategoryId: string,      // 父分類（可選，用於子分類）
  createdAt: Date,
  updatedAt: Date
}
```

### Item 模型

```javascript
{
  id: string,
  pageId: string,                // 所屬頁面
  title: string,
  slug: string,
  category: string,              // 分類 ID
  description: string,
  coverImage: {                  // 封面圖片
    url: string,
    type: "image" | "video",
    alt: string
  },
  images: Array<{
    url: string,
    type: "image" | "video",
    videoUrl: string,            // 如果 type=video
    alt: string,
    caption: string
  }>,
  published: boolean,
  publishAt: Date,
  status: "draft" | "published",
  createdAt: Date,
  updatedAt: Date
}
```

### Media 模型

```javascript
{
  id: string,
  name: string,                  // 原始檔名
  url: string,                   // 存儲 URL
  path: string,                  // 存儲路徑
  size: number,                  // 檔案大小（字節）
  contentType: string,           // MIME 類型
  albumId: string,               // 所屬相簿（可選）
  imageMetadata: {               // 圖片處理元資訊
    originalWidth: number,
    originalHeight: number,
    processedWidth: number,
    processedHeight: number,
    dpi: number,
    colorSpace: string,
    format: string
  },
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔍 查詢範例

### Firebase Firestore 查詢

```javascript
// 獲取已發佈的攝影服務頁面
db.collection("customPages")
  .where("slug", "==", "photography-services")
  .where("published", "==", true)
  .limit(1)
  .get()

// 獲取某頁面的所有分類
db.collection("pageCategories")
  .where("pageId", "==", pageId)
  .orderBy("sortOrder", "desc")
  .get()

// 獲取某分類的所有項目
db.collection("pageItems")
  .where("pageId", "==", pageId)
  .where("category", "==", categoryId)
  .where("published", "==", true)
  .orderBy("createdAt", "desc")
  .get()
```

---

## 🚀 整合最佳實踐

### 1. 性能優化

```javascript
// 使用索引查詢
db.collection("pageItems")
  .where("pageId", "==", pageId)
  .where("published", "==", true)
  .limit(20)  // 分頁

// 異步加載圖片
const imageObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.src = entry.target.dataset.src;
    }
  });
});
```

### 2. 錯誤處理

```javascript
try {
  const response = await fetch('/p/photography-services');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  renderPage(data);
} catch (error) {
  console.error('載入頁面失敗:', error);
  showErrorMessage('無法載入頁面，請稍後重試');
}
```

### 3. SEO 考慮

```javascript
// 使用服務器端渲染（views 層）
// 而不是客戶端渲染，以便 SEO 爬蟲能正確索引內容

// 設置適當的 Meta 標籤
<meta name="description" content={page.metaDescription}>
<meta property="og:image" content={item.coverImage.url}>
```

---

## 📚 相關檔案

- 路由：`routes/cms/customPage.js`
- 控制器：`controllers/cms/customPageController.js`
- 服務：`services/customPageService.js` 和 `services/collectionService.js`
- 前端視圖：`views/collectionList.js` 和 `views/collectionItemDetail.js`

---

**最後更新**: 2026-09-22
