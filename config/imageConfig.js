/**
 * 圖片上傳和處理的統一配置
 * 包括大小限制、解析度、輸出格式、色彩空間等
 */

module.exports = {
    // 上傳限制
    upload: {
        // 原始檔案大小上限：15MB（只是擋離譜的大檔，不是最終存檔大小——
        // 下面 processing 那組設定會把圖片壓到 2048px/JPEG 90 品質再存，手機隨便拍一張
        // 4-8MB 的照片走完這道處理通常會縮到 1-2MB 內，不用在上傳當下就把這類正常照片擋掉）
        maxFileSize: 15 * 1024 * 1024,
        // 最小檔案大小：800KB（擋掉解析度太低/畫質太差的圖，這種圖放大到版面上會很明顯模糊）
        minFileSize: 800 * 1024,
        // 允許的 MIME 類型
        allowedMimeTypes: [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'image/tiff',
            'image/bmp'
        ]
    },

    // 圖片處理規格
    processing: {
        // 長邊尺寸（像素）
        maxDimension: 2048,
        // 解析度（DPI）
        dpi: 72,
        // 輸出格式
        outputFormat: 'jpeg',
        // 色彩空間
        colorSpace: 'srgb',
        // JPEG 品質（0-100）
        jpegQuality: 90
    },

    // 驗證錯誤訊息
    errors: {
        noFile: '沒有收到檔案',
        invalidMimeType: '只允許上傳圖片檔案（支援 JPG、PNG、WebP、GIF、TIFF、BMP）',
        fileTooSmall: '檔案大小必須至少 800KB（避免畫質太差、放大後模糊）',
        fileTooLarge: '檔案大小不能超過 15MB',
        invalidDimensions: '圖片長邊尺寸必須為 2048px（會自動縮放到此尺寸）',
        processingError: '圖片處理失敗，請重新上傳'
    }
};
