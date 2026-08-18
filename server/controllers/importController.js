const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { parseExcel } = require("../services/excelParser");
const fs = require("fs");

exports.uploadExcel = async (req, res) => {
  try {
    const io = req.app.get("io");
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const importDoc = await prisma.import.create({ data: { fileName: req.file.originalname } });
    const { coursesMap, warnings } = await parseExcel(req.file.path, io);

    let stats = { courses: 0, options: 0, lt: 0, ht1: 0, ht2: 0, special: 0 };

    for (const cVal of Object.values(coursesMap)) {
      const courseCredits = parseInt(cVal.credits || cVal.courseCredits) || 0;
      const course = await prisma.course.create({
        data: { importId: importDoc.id, code: cVal.code, name: cVal.name, credits: courseCredits }
      });
      stats.courses++;

      // FIX LỖI CRITICAL: Đưa Map lưu trữ LT lên tầm vóc Course 
      // (Bảo toàn danh sách LT xuyên suốt khi quét qua các Offering HT1/HT2)
      const courseLtMap = {}; 
      const thQueue = [];

      // BƯỚC 1: LƯU TOÀN BỘ LỚP LT TRƯỚC ĐỂ LÀM MỐC
      for (const offVal of cVal.offerings) {
        const offering = await prisma.offering.create({ data: { courseId: course.id, type: offVal.type } });
        
        for (const optVal of offVal.options) {
          const displayCode = optVal.displayCode || optVal.classCode || optVal.code || "";
          const teacherName = optVal.teacherName || optVal.teacher || optVal.instructor || null;
          const componentCredits = parseInt(optVal.componentCredits || optVal.credits) || null;
          
          let sessionsData = optVal.sessions || optVal.schedules || optVal.session || [];
          if (typeof sessionsData === 'string') {
             try { sessionsData = JSON.parse(sessionsData); } catch(e) { sessionsData = []; }
          }

          if (optVal.type === "LT") {
            const savedLt = await prisma.classOption.create({
              data: {
                courseId: course.id, offeringId: offering.id, 
                displayCode: displayCode,
                rawCodes: JSON.stringify(optVal.rawCodes || optVal.raw || []), 
                teacherName: teacherName,
                componentCredits: componentCredits,
                sessions: JSON.stringify(sessionsData), 
                type: optVal.type, 
                relationshipStatus: "NOT_APPLICABLE"
              }
            });
            // Ghi nhận ID của LT vào giỏ
            courseLtMap[displayCode] = savedLt.id;
            stats.options++;
            stats.lt++;
          } else {
            // Đưa lớp TH vào hàng đợi, chờ quét xong hết LT mới xử lý
            thQueue.push({
              optVal, offeringId: offering.id, displayCode, teacherName, componentCredits, sessionsData
            });
          }
        }
      }

      // BƯỚC 2: RÚT HÀNG ĐỢI THỰC HÀNH VÀ KẾT NỐI CHA-CON
      for (const th of thQueue) {
        const { optVal, offeringId, displayCode, teacherName, componentCredits, sessionsData } = th;
        let parentCode = null;
        let parentId = null;
        let relStatus = "UNLINKED_TH";

        const match = displayCode.match(/^(.*)\.(\d+)$/);
        if (match) {
          const potentialParent = match[1];
          if (courseLtMap[potentialParent]) {
            parentCode = potentialParent;
            parentId = courseLtMap[potentialParent];
            relStatus = "LINKED_TO_LT";
          }
        } else if (courseLtMap[displayCode]) {
          parentCode = displayCode;
          parentId = courseLtMap[displayCode];
          relStatus = "LINKED_TO_LT";
        }

        await prisma.classOption.create({
          data: {
            courseId: course.id, offeringId: offeringId, 
            displayCode: displayCode,
            rawCodes: JSON.stringify(optVal.rawCodes || optVal.raw || []), 
            teacherName: teacherName,
            componentCredits: componentCredits,
            sessions: JSON.stringify(sessionsData), 
            type: optVal.type,
            parentLtClassId: parentId,
            parentLtClassCode: parentCode,
            relationshipStatus: relStatus
          }
        });
        
        stats.options++;
        if (optVal.type === "HT1") stats.ht1++; 
        else if (optVal.type === "HT2") stats.ht2++; 
        else stats.special++;
      }
    }

    await prisma.import.update({
      where: { id: importDoc.id },
      data: { status: "COMPLETED", statistics: JSON.stringify(stats), warnings: JSON.stringify(warnings || []) }
    });

    try { fs.unlinkSync(req.file.path); } catch (e) {}
    res.json({ success: true, importId: importDoc.id, summary: stats, warnings });
  } catch (error) {
    console.error("=== UPLOAD CRASH ===", error);
    if (req.file) { try { fs.unlinkSync(req.file.path); } catch (e) {} }
    res.status(500).json({ success: false, message: error.stack || error.message });
  }
};