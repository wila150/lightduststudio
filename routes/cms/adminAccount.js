const express = require("express");
const router = express.Router();

const controller = require("../../controllers/cms/adminAccountController");
const requireAuth = require("../../middleware/requireAuth");
const requireSuperadmin = require("../../middleware/requireSuperadmin");
const resolveTenant = require("../../middleware/resolveTenant");

router.use(requireAuth);
router.use(resolveTenant);
router.use(requireSuperadmin);

router.get("/", controller.index);
router.post("/", controller.create);
router.post("/:uid/role", controller.updateRole);
router.post("/:uid/delete", controller.remove);

module.exports = router;
