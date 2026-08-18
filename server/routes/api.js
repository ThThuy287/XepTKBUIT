const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" }); //[cite: 2]

// Import controllers[cite: 2]
const scheduleController = require("../controllers/scheduleController"); //[cite: 2]
const courseController = require("../controllers/courseController"); //[cite: 2]
const importController = require("../controllers/importController"); //[cite: 2]

// Kiểm tra an toàn[cite: 2]
if (typeof courseController.getCourses !== "function") {
  throw new Error("Controller error: courseController.getCourses is not a function"); //[cite: 2]
}
if (typeof scheduleController.validateSchedule !== "function") {
  throw new Error("Controller error: scheduleController.validateSchedule is not a function"); //[cite: 2]
}
if (typeof importController.uploadExcel !== "function") {
  throw new Error("Controller error: importController.uploadExcel is not a function"); //[cite: 2]
}

// KHAI BÁO LẠI ĐƯỜNG DẪN CHUẨN:
router.get("/courses", courseController.getCourses); //[cite: 2]
router.post("/schedules/validate", scheduleController.validateSchedule); //[cite: 2]
router.post("/import/xlsx", upload.single("file"), importController.uploadExcel); // <--- SỬA DÒNG NÀY[cite: 2]

module.exports = router; //[cite: 2]