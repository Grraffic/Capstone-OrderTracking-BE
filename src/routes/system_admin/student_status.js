const express = require("express");
const router = express.Router();
const studentStatusController = require("../../controllers/system_admin/student_status.controller");
const { verifyToken, requireAdminOrPropertyCustodian } = require("../../middleware/auth");

router.use(verifyToken);
router.use(requireAdminOrPropertyCustodian);

router.patch("/:id/status", studentStatusController.updateStudentStatus);

module.exports = router;

