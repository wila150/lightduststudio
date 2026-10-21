const express = require("express");
const router = express.Router();

const navController = require("../../controllers/cms/navController");
const requireAuth = require("../../middleware/requireAuth");
const resolveTenant = require("../../middleware/resolveTenant");

router.use(requireAuth);
router.use(resolveTenant);

router.get("/", navController.index);

router.get("/new", navController.newForm);
router.post("/", navController.create);

// 批次刪除、拖拉排序都要放在 /:id 之前，避免路由衝突（不然 "/reorder" 會被 "/:id" 吃掉）
router.post("/delete-many", navController.removeMany);
router.post("/reorder", navController.reorder);

router.get("/:id/edit", navController.editForm);
router.post("/:id", navController.update);

router.post("/:id/move", navController.move);

router.post("/:id/delete", navController.remove);

module.exports = router;
