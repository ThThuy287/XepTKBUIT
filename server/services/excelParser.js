const xlsx = require('xlsx');

// HÀM BÓC TÁCH TIẾT HỌC (QUY ƯỚC: 0 = TIẾT 10)
function extractPeriods(str) {
  if (!str) return [];
  let s = String(str).trim();
  if (!s) return [];

  // Dải tiết ban đêm / ngoài giờ (>10)
  if (s.startsWith('1112')) return [11, 12, 13, 14, 15].slice(0, Math.floor(s.length / 2));
  if (s.startsWith('1213')) return [12, 13, 14, 15].slice(0, Math.floor(s.length / 2));
  if (s.startsWith('1011')) return [10, 11, 12, 13, 14, 15].slice(0, Math.floor(s.length / 2));

  // Tách từng ký tự: Nếu gặp '0' hoặc '10' thì đó là Tiết 10
  let parsed = [];
  let i = 0;
  while (i < s.length) {
    if (s.substring(i, i + 2) === '10') {
      parsed.push(10);
      i += 2;
    } else if (s[i] === '0') {
      // QUY ƯỚC UIT: 0 LÀ TIẾT 10
      parsed.push(10);
      i += 1;
    } else if (/\d/.test(s[i])) {
      parsed.push(parseInt(s[i], 10));
      i += 1;
    } else {
      i += 1;
    }
  }

  // Sắp xếp tăng dần và loại bỏ trùng lặp
  return [...new Set(parsed)].sort((a, b) => a - b);
}

exports.parseExcel = async (filePath, io) => {
  const workbook = xlsx.readFile(filePath);
  const coursesMap = {};
  const warnings = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    let headerIdx = -1;
    for (let i = 0; i < Math.min(20, jsonData.length); i++) {
      const rowStr = Object.values(jsonData[i]).join(" ").toUpperCase();
      if (rowStr.includes("MÃ MH") && rowStr.includes("MÃ LỚP")) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) continue;

    const headers = Object.values(jsonData[headerIdx]).map(h => String(h).toUpperCase().trim());
    const dataRows = jsonData.slice(headerIdx + 1);

    const getCol = (keywords) => headers.findIndex(h => keywords.includes(h));
    
    const cCourseCode = getCol(["MÃ MH", "MÃ MÔN"]);
    const cClassCode = getCol(["MÃ LỚP"]);
    const cCourseName = getCol(["TÊN MÔN HỌC", "TÊN MÔN"]);
    const cTeacher = getCol(["TÊN GIẢNG VIÊN", "GIẢNG VIÊN", "TÊN TRỢ GIẢNG", "TRỢ GIẢNG", "CBGD"]);
    const cCredits = getCol(["TỐ TC", "SỐ TC", "TC"]);
    const cType = getCol(["HTGD"]);
    const cDay = getCol(["THỨ"]);
    const cPeriod = getCol(["TIẾT"]);
    const cRoom = getCol(["PHÒNG HỌC", "PHÒNG"]);
    const cWeek = getCol(["CÁCH TUẦN", "TUẦN"]);
    const cStartDate = getCol(["NBD", "BẮT ĐẦU"]);
    const cEndDate = getCol(["NKT", "KẾT THÚC"]);

    for (const row of dataRows) {
      const rawRow = Object.values(row);
      const courseCode = cCourseCode !== -1 ? String(rawRow[cCourseCode]).trim() : "";
      if (!courseCode || courseCode.toUpperCase().includes("MÃ")) continue;

      const classCode = cClassCode !== -1 ? String(rawRow[cClassCode]).trim() : "";
      const courseName = cCourseName !== -1 ? String(rawRow[cCourseName]).trim() : "";
      
      let teacherName = cTeacher !== -1 ? String(rawRow[cTeacher]).trim() : "";
      let teacherRole = "UNKNOWN";
      if (cTeacher !== -1) {
        const headerName = headers[cTeacher];
        if (headerName.includes("TRỢ GIẢNG")) teacherRole = "TEACHING_ASSISTANT";
        else if (headerName.includes("GIẢNG VIÊN")) teacherRole = "LECTURER";
      }

      const credits = cCredits !== -1 ? parseFloat(rawRow[cCredits]) || 0 : 0;

      let type = cType !== -1 ? String(rawRow[cType]).trim().toUpperCase() : "UNKNOWN";
      if (!["LT", "HT1", "HT2", "ĐA", "DA", "KLTN", "TTTN"].includes(type)) type = "UNKNOWN";
      if (type === "ĐA") type = "DA";

      const rawDay = cDay !== -1 ? String(rawRow[cDay]).trim() : "";
      const rawPeriod = cPeriod !== -1 ? String(rawRow[cPeriod]).trim() : "";
      const room = cRoom !== -1 ? String(rawRow[cRoom]).trim() : "";
      const weekPattern = cWeek !== -1 ? String(rawRow[cWeek]).trim() : "";
      const startDate = cStartDate !== -1 ? String(rawRow[cStartDate]).trim() : "";
      const endDate = cEndDate !== -1 ? String(rawRow[cEndDate]).trim() : "";

      const daysArr = rawDay.split(",").map(d => d.trim()).filter(Boolean);
      const periodsArr = rawPeriod.split(",").map(p => p.trim()).filter(Boolean);

      const sessions = [];
      const maxSessions = Math.max(daysArr.length, periodsArr.length);

      if (maxSessions === 0) {
        sessions.push({ day: null, periods: [], room, weekPattern, weekPhase: "UNKNOWN", rawWeekPattern: weekPattern, startDate, endDate, hasSchedule: false });
      } else {
        for (let i = 0; i < maxSessions; i++) {
          const dStr = daysArr[i] || daysArr[0] || null;
          const pStr = periodsArr[i] || periodsArr[0] || "";
          const dInt = dStr ? parseInt(dStr, 10) : null;
          const parsedPeriods = extractPeriods(pStr);
          
          sessions.push({
            day: dInt,
            periods: parsedPeriods,
            room,
            weekPattern,
            weekPhase: "UNKNOWN",
            rawWeekPattern: weekPattern,
            startDate,
            endDate,
            hasSchedule: !!(dInt && parsedPeriods.length > 0)
          });
        }
      }

      if (!coursesMap[courseCode]) {
        coursesMap[courseCode] = { 
          code: courseCode, 
          name: courseName, 
          credits: 0, 
          componentMaxCredits: {}, 
          offerings: [] 
        };
      }

      const currentMax = coursesMap[courseCode].componentMaxCredits[type] || 0;
      if (credits > currentMax) {
        coursesMap[courseCode].componentMaxCredits[type] = credits;
        coursesMap[courseCode].credits = Object.values(coursesMap[courseCode].componentMaxCredits).reduce((sum, val) => sum + val, 0);
      }

      let offering = coursesMap[courseCode].offerings.find(o => o.type === type);
      if (!offering) {
        offering = { type, options: [] };
        coursesMap[courseCode].offerings.push(offering);
      }

      offering.options.push({
        displayCode: classCode,
        type: type,
        teacherName,
        teacherRole,
        componentCredits: credits, 
        sessions,
        rawCodes: [classCode]
      });
    }
  }

  return { coursesMap, warnings };
};