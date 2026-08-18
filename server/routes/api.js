const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

// Import controllers v?i c� ch? ki?m tra an to�n
const scheduleController = require("../controllers/scheduleController");
const courseController = require("../controllers/courseController");
const importController = require("../controllers/importController");

// �?m b?o handler b?t bu?c ph?i l� function tr�?c khi bind v�o Express route
if (typeof courseController.getCourses !== "function") {
  throw new Error("Controller error: courseController.getCourses is not a function");
}
if (typeof scheduleController.validateSchedule !== "function") {
  throw new Error("Controller error: scheduleController.validateSchedule is not a function");
}
if (typeof importController.uploadExcel !== "function") {
  throw new Error("Controller error: importController.uploadExcel is not a function");
}

router.get("/courses", courseController.getCourses);
router.post("/schedules/validate", scheduleController.validateSchedule);
router.post("/xlsx", upload.single("file"), importController.uploadExcel);

module.exports = router;
