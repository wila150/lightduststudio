const express = require("express");
const multer = require("multer");
const router = express.Router();

const customPageController = require("../../controllers/cms/customPageController");
const requireAuth = require("../../middleware/requireAuth");
const resolveTenant = require("../../middleware/resolveTenant");

router.use(requireAuth);
router.use(resolveTenant);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("只允許上傳圖片檔案"));
        }
        cb(null, true);
    }
});

// 頁面列表
router.get("/", customPageController.index);

// 新增頁面
router.get("/new", customPageController.newForm);
// 新增頁面表單跟編輯頁面共用同一個 <form>，一律寫死 enctype="multipart/form-data"（編輯模式才有背景圖上傳），
// 新增當下沒有檔案輸入框，瀏覽器還是會用 multipart 送出，一樣要有 multer 才能解析出 req.body
router.post("/", upload.none(), customPageController.create);

// 內容編輯器插入圖片
router.post("/upload-image", upload.single("file"), customPageController.uploadImage);

// 批次刪除（要放在 /:id 之前，避免路由衝突）
router.post("/delete-many", customPageController.removeMany);

// 作品集底下有附影片的項目清單（供「影片輪播」模組後台選擇器使用）
router.get("/video-items.json", customPageController.videoItemsJson);

// 編輯頁面
router.get("/:id/edit", customPageController.editForm);
router.post("/:id", upload.single("backgroundImage"), customPageController.update);

// 即時預覽（不檢查 published）
router.get("/:id/preview", customPageController.preview);

// 模組：新增/更新/刪除/排序（一般內容頁）
router.post("/:id/modules", customPageController.addModule);
// 拖拉排序要放在 /:id/modules/:moduleId 之前，避免路由衝突
router.post("/:id/modules/reorder", customPageController.reorderModules);
// 模組編輯表單是用 fetch(FormData) 送出的（即時預覽面板攔截了 submit），
// 瀏覽器對 FormData body 一律用 multipart/form-data，所以這裡要有 multer 才能解析出 req.body
router.post("/:id/modules/:moduleId", upload.none(), customPageController.updateModule);
router.post("/:id/modules/:moduleId/delete", customPageController.removeModule);
router.post("/:id/modules/:moduleId/move", customPageController.moveModule);

// 刪除頁面
router.post("/:id/delete", customPageController.remove);

// ===== 分類清單型頁面：分類管理 =====

router.post("/:id/categories", upload.single("coverImage"), customPageController.createCategory);
// 拖拉排序要放在 /:id/categories/:categoryId 之前，避免路由衝突
router.post("/:id/categories/reorder", customPageController.reorderCategories);
router.get("/:id/categories/:categoryId/edit", customPageController.editCategoryForm);
router.post("/:id/categories/:categoryId", upload.single("coverImage"), customPageController.updateCategory);
router.post("/:id/categories/:categoryId/move", customPageController.moveCategory);
router.post("/:id/categories/:categoryId/delete", customPageController.removeCategory);

// ===== 分類清單型頁面：項目管理 =====

router.get("/:id/items/new", customPageController.newItemForm);
// 貼上影片連結自動帶入標題、封面、網址代稱
router.get("/:id/video-info", customPageController.videoInfo);
router.post("/:id/items", upload.array("images", 20), customPageController.createItem);

router.post("/:id/items/delete-many", customPageController.removeManyItems);
// 拖拉排序要放在 /:id/items/:itemId 之前，避免路由衝突
router.post("/:id/items/reorder", customPageController.reorderItems);
// 從媒體庫資料夾建立作品（一次可以勾多個資料夾），要放在 /:id/items/:itemId 之前
router.post("/:id/items/from-albums", express.json(), customPageController.createItemsFromAlbums);

router.get("/:id/items/:itemId/edit", customPageController.editItemForm);
router.post("/:id/items/:itemId", upload.array("images", 20), customPageController.updateItem);

router.get("/:id/items/:itemId/preview", customPageController.previewItem);

router.post("/:id/items/:itemId/cover", upload.single("cover"), customPageController.updateItemCover);
// 移除封面（影片改回 YouTube 縮圖），要放在 /cover 之後也不會衝突：路徑不同
router.post("/:id/items/:itemId/cover/delete", customPageController.removeItemCover);
router.post("/:id/items/:itemId/videos", upload.single("coverImage"), customPageController.addItemVideo);
// 拖拉排序要放在 /photos/:imageId 之前，避免路由衝突
router.post("/:id/items/:itemId/photos/reorder", customPageController.reorderItemImages);
router.post("/:id/items/:itemId/photos/:imageId/delete", customPageController.removeItemImage);
router.post("/:id/items/:itemId/photos/:imageId/alt", customPageController.updateItemImageAlt);
router.post("/:id/items/:itemId/photos/from-media", customPageController.addItemFromMedia);

router.post("/:id/items/:itemId/move", customPageController.moveItem);
router.post("/:id/items/:itemId/delete", customPageController.removeItem);

// 項目詳細頁的內容模組：新增/更新/刪除/排序
router.post("/:id/items/:itemId/modules", customPageController.addItemModule);
// 拖拉排序要放在 /:id/items/:itemId/modules/:moduleId 之前，避免路由衝突
router.post("/:id/items/:itemId/modules/reorder", customPageController.reorderItemModules);
router.post("/:id/items/:itemId/modules/:moduleId", upload.none(), customPageController.updateItemModule);
router.post("/:id/items/:itemId/modules/:moduleId/delete", customPageController.removeItemModule);
router.post("/:id/items/:itemId/modules/:moduleId/move", customPageController.moveItemModule);

module.exports = router;
