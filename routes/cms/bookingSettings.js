const express = require("express");
const router = express.Router();

const controller = require("../../controllers/cms/bookingSettingsController");
const requireAuth = require("../../middleware/requireAuth");
const resolveTenant = require("../../middleware/resolveTenant");

router.use(requireAuth);
router.use(resolveTenant);

router.get("/", controller.edit);
router.post("/", controller.update);

module.exports = router;
