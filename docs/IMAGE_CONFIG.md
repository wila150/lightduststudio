# 圖片上傳配置文檔

## 概述

本文檔說明 PortfolioWeb 專案中圖片上傳和處理的完整配置。

## 圖片規格

### 上傳限制

| 項目 | 規格 | 說明 |
|------|------|------|
| **檔案大小範圍** | 800KB - 2MB | 經過驗證和處理的最終大小 |
| **長邊尺寸** | 2048px | 自動按比例縮放至此尺寸 |
| **解析度（DPI）** | 72dpi | 網路標準解析度 |
| **輸出格式** | JPG | 所有上傳的圖片都會轉換為 JPEG |
| **色彩空間** | sRGB | 網路標準色彩空間 |
| **JPEG 品質** | 90 | 高品質設定，平衡檔案大小和視覺質量 |

### 允許的輸入格式

支援以下圖片格式上傳（會自動轉換為 JPG）：
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- GIF (.gif)
- TIFF (.tiff, .tif)
- BMP (.bmp)

## 配置檔案

### imageConfig.js

位置：`/config/imageConfig.js`

包含所有圖片相關的配置常數：
- `upload` - 上傳限制設定
- `processing` - 圖片處理參數
- `errors` - 驗證錯誤訊息

## 圖片處理流程

1. **檔案上傳** → multer 接收檔案
2. **大小驗證** → 檢查檔案大小是否在 800KB-2MB 範圍
3. **格式驗證** → 確認 MIME 類型是否為允許的圖片格式
4. **圖片處理**：
   - 讀取圖片元資訊（寬度、高度）
   - 按長邊比例縮放至 2048px（不放大）
   - 轉換色彩空間為 sRGB
   - 轉換為 JPEG 格式（品質 90）
   - 設置 DPI 為 72
   - 啟用 progressive JPEG 和 mozjpeg 優化
5. **儲存** → 上傳到 Firebase Storage

## 相關檔案

| 檔案 | 說明 |
|------|------|
| `config/imageConfig.js` | 圖片配置常數 |
| `services/mediaService.js` | 媒體服務，包含圖片驗證和處理邏輯 |
| `routes/cms/media.js` | 媒體路由，使用 imageConfig 設置 multer 限制 |
| `controllers/cms/mediaController.js` | 媒體控制器，包含上傳端點 |

## 使用範例

### 上傳單張圖片

```
POST /cms/media/upload
Content-Type: multipart/form-data

files: [image.png]
albumId: [optional]
```

### 上傳多張圖片

```
POST /cms/media/upload
Content-Type: multipart/form-data

files: [image1.png, image2.jpg, image3.webp]
albumId: [optional]
```

## 錯誤處理

常見的上傳錯誤及說明：

| 錯誤訊息 | 原因 | 解決方案 |
|---------|------|--------|
| 只允許上傳圖片檔案 | 上傳了非圖片格式 | 確保上傳的是支援的圖片格式 |
| 檔案大小必須至少 800KB | 圖片太小 | 上傳更高解析度的圖片 |
| 檔案大小不能超過 2MB | 圖片太大 | 上傳較小的圖片，或讓系統自動縮放 |

## 依賴套件

- **sharp** (^0.35.3) - 高效的圖片處理庫
- **multer** (^2.2.0) - 檔案上傳中間件

## 後續功能擴展建議

1. 支援圖片裁切功能
2. 新增圖片濾鏡和特效
3. 支援批量上傳進度條
4. 新增圖片縮圖版本（thumbnail）
5. 支援 WebP 格式輸出（現代瀏覽器）

---

**最後更新**: 2026-09-22
