const XLSX = require('xlsx');

// 1. CHUẨN HÓA HEADER
const normalizeHeader = (header) => {
  if (!header) return '';
  return header.toString()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/\n/g, '');
};

const HEADER_MAP = {
  'MAMH': 'MAMH', 'MAMONHOC': 'MAMH', 'MÃMH': 'MAMH',
  'MALOP': 'MALOP', 'MÃLỚP': 'MALOP',
  'TENMH': 'TENMH', 'TENMONHOC': 'TENMH', 'TÊNMÔNHỌC': 'TENMH',
  'MAGV': 'MAGV', 'MÃGV': 'MAGV',
  'TENGV': 'TENGV', 'TÊNGV': 'TENGV', 'TÊNGIÁOVIÊN': 'TENGV',
  'SOTC': 'SOTC', 'SỐTC': 'SOTC',
  'HTGD': 'HTGD',
  'THU': 'THU', 'THỨ': 'THU',
  'TIET': 'TIET', 'TIẾT': 'TIET',
  'CACHTUAN': 'CACHTUAN', 'CÁCHTUẦN': 'CACHTUAN',
  'PHONGHOC': 'PHONGHOC', 'PHÒNGHỌC': 'PHONGHOC',
  'NBD': 'NBD', 'NGÀYBẮTĐẦU': 'NBD',
  'NKT': 'NKT', 'NGÀYKẾTTHÚC': 'NKT',
  'MALOPLT': 'MA_LOP_LT'
};

const detectFormatAndHeaderRow = (sheet) => {
  const range = XLSX.utils.decode_range(sheet['!ref']);
  for (let R = range.s.r; R <= Math.min(range.e.r, 30); ++R) { 
    const rowHeaders = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = sheet[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell && cell.v !== undefined && cell.v !== null) {
        const normalized = normalizeHeader(cell.v);
        if (HEADER_MAP[normalized]) rowHeaders.push(HEADER_MAP[normalized]);
      }
    }
    if (rowHeaders.includes('MAMH') && rowHeaders.includes('MALOP') && rowHeaders.includes('TENMH')) {
      return {
        headerRowIndex: R,
        format: rowHeaders.includes('MA_LOP_LT') ? 'FORMAT_DANHSACHLOP_1171' : 'FORMAT_TKB_STANDARD'
      };
    }
  }
  throw new Error("KHÔNG TÌM THẤY BỘ 3 CỘT: MAMH, MALOP, TENMH");
};

// ============================================================================
// 2. COMPACT PERIOD PARSER (DETERMINISTIC PATH-SCORING ENGINE)
// ============================================================================

function parseCompactPeriods(str) {
  if (!str) return [];
  // Xóa mọi khoảng trắng lọt vào giữa chuỗi
  let s = String(str).trim().replace(/\s+/g, '');
  if (!s) return [];

  let validPaths = [];

  function dfs(index, currentPath) {
    if (index === s.length) {
      validPaths.push([...currentPath]);
      return;
    }

    // Nhánh 1: Cắt 1 chữ số (từ 1 đến 9)
    let t1 = parseInt(s.substring(index, index + 1), 10);
    if (t1 >= 1 && t1 <= 9) {
      currentPath.push(t1);
      dfs(index + 1, currentPath);
      currentPath.pop();
    }

    // Nhánh 2: Ký tự '0' mặc định mang giá trị 10 trong Compact Notation của UIT
    if (s[index] === '0') {
      currentPath.push(10);
      dfs(index + 1, currentPath);
      currentPath.pop();
    }

    // Nhánh 3: Cắt 2 chữ số (từ 10 đến 15)
    if (index + 1 < s.length) {
      let str2 = s.substring(index, index + 2);
      let t2 = parseInt(str2, 10);
      if (t2 >= 10 && t2 <= 15) {
        currentPath.push(t2);
        dfs(index + 2, currentPath);
        currentPath.pop();
      }
    }
  }

  dfs(0, []);

  if (validPaths.length === 0) {
    console.warn(`[PERIOD PARSER] INVALID_PERIOD_FORMAT: Không thể bóc tách "${s}"`);
    return [];
  }

  // BỘ CHẤM ĐIỂM (Scoring Engine) ĐỂ CHỌN PATH HỢP LÝ NHẤT
  let bestPath = validPaths[0];
  let bestScore = -999999;

  for (let path of validPaths) {
    let isStrictlyIncreasing = true;
    let contiguousCount = 0;
    let jumpPenalty = 0;
    
    for (let i = 1; i < path.length; i++) {
      if (path[i] <= path[i - 1]) isStrictlyIncreasing = false;
      if (path[i] === path[i - 1] + 1) contiguousCount++;
      
      let jump = path[i] - path[i - 1];
      if (jump > 1) jumpPenalty += jump;
    }

    let score = contiguousCount * 10;
    if (isStrictlyIncreasing) score += 100;
    score -= jumpPenalty;

    if (score > bestScore) {
      bestScore = score;
      bestPath = path;
    }
  }

  return [...new Set(bestPath)].sort((a, b) => a - b);
}

function parsePeriods(raw) {
  if (!raw) return [];
  let s = String(raw).trim();
  if (!s) return [];

  // Tách đa Session nếu Excel chứa dấu phẩy (VD: "123, 67890")
  if (s.includes(',')) {
    return s.split(',').map(part => parseCompactPeriods(part)).filter(arr => arr.length > 0);
  }

  const single = parseCompactPeriods(s);
  return single.length > 0 ? [single] : [];
}

const parseSessions = (thuRaw, tietRaw, phongRaw) => {
  if (!thuRaw && !tietRaw) return [];
  const days = thuRaw ? String(thuRaw).split(',').map(d => d.trim()).filter(Boolean) : [];
  const tietGroups = tietRaw ? parsePeriods(tietRaw) : [];
  const rooms = phongRaw ? String(phongRaw).split(',').map(r => r.trim()).filter(Boolean) : [];
  
  const sessions = [];
  const maxLen = Math.max(days.length, tietGroups.length);
  
  for (let i = 0; i < maxLen; i++) {
    const day = days[i] ? parseInt(days[i], 10) : (days[0] ? parseInt(days[0], 10) : null);
    const periods = tietGroups[i] || tietGroups[0] || [];
    const room = rooms[i] ? rooms[i] : (rooms[0] || '');
    sessions.push({ day, periods, room });
  }
  return sessions;
};

// ============================================================================
// 3. MAIN EXCEL PARSER
// ============================================================================

exports.parseExcel = async (filePath, io) => {
  console.log("🚀🚀🚀 [BẮT ĐẦU TIẾP NHẬN FILE (FINAL GOLDEN PARSER)] 🚀🚀🚀");

  // CHẠY UNIT TEST TRỰC TIẾP LÚC KHỞI ĐỘNG SERVER ĐỂ CHỨNG MINH THUẬT TOÁN
  console.log("--- BẮT ĐẦU PERIOD UNIT TEST ---");
  console.log("123 ->", parseCompactPeriods("123"));
  console.log("67890 ->", parseCompactPeriods("67890"));
  console.log("90 ->", parseCompactPeriods("90"));
  console.log("10 ->", parseCompactPeriods("10"));
  console.log("12 ->", parseCompactPeriods("12"));
  console.log("121314 ->", parseCompactPeriods("121314"));
  console.log("11121314 ->", parseCompactPeriods("11121314"));
  console.log("1245 ->", parseCompactPeriods("1245"));
  console.log("--- KẾT THÚC UNIT TEST ---");

  let workbook;
  try {
    workbook = XLSX.readFile(filePath);
  } catch (error) {
    throw new Error("Không thể đọc được file Excel.");
  }

  const coursesMap = {};
  const warnings = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet['!ref']) continue;

    let formatInfo;
    try {
      formatInfo = detectFormatAndHeaderRow(sheet);
    } catch (error) {
      warnings.push(`HEADER DETECTION FAILED: ${sheetName}`);
      continue;
    }

    const rawData = XLSX.utils.sheet_to_json(sheet, { range: formatInfo.headerRowIndex, defval: "" });

    for (const row of rawData) {
      const mappedRow = {};
      Object.keys(row).forEach(key => {
        const normKey = normalizeHeader(key);
        if (HEADER_MAP[normKey]) mappedRow[HEADER_MAP[normKey]] = row[key];
      });

      const courseCode = mappedRow['MAMH'] ? String(mappedRow['MAMH']).trim() : "";
      const classCode = mappedRow['MALOP'] ? String(mappedRow['MALOP']).trim() : "";

      if (!courseCode || !classCode || courseCode.toUpperCase().includes("MÃ")) continue;
      
      let type = mappedRow['HTGD'] ? String(mappedRow['HTGD']).trim().toUpperCase() : "UNKNOWN";
      if (!["LT", "HT1", "HT2", "ĐA", "DA", "KLTN", "TTTN"].includes(type)) type = "UNKNOWN";
      if (type === "ĐA") type = "DA";

      const credits = mappedRow['SOTC'] ? parseFloat(mappedRow['SOTC']) || 0 : 0;
      
      if (!coursesMap[courseCode]) {
        coursesMap[courseCode] = { 
          code: courseCode, name: mappedRow['TENMH'] ? String(mappedRow['TENMH']).trim() : "", 
          credits: 0, offerings: [], _tempLtCredits: 0 
        };
      }
      
      // COURSE CREDITS LẤY CHUẨN TỪ LỚP LT
      if (type === 'LT') {
        coursesMap[courseCode].credits = credits;
        coursesMap[courseCode]._tempLtCredits = credits;
      } else if (coursesMap[courseCode].credits === 0) {
         coursesMap[courseCode].credits = credits; 
      }

      let offering = coursesMap[courseCode].offerings.find(o => o.type === type);
      if (!offering) {
        offering = { type, options: [] };
        coursesMap[courseCode].offerings.push(offering);
      }

      // TRỰC TIẾP MAP TỪ EXCEL, KHÔNG SUY LUẬN
      const parentLtClassCode = mappedRow['MA_LOP_LT'] ? String(mappedRow['MA_LOP_LT']).trim() : null;
      const rawPeriodStr = mappedRow['TIET'] ? String(mappedRow['TIET']).trim() : "";

      const sessionsRaw = parseSessions(mappedRow['THU'], rawPeriodStr, mappedRow['PHONGHOC']);
      
      // GOLDEN RECORD TRACE ĐỂ VERIFY LOGIC LUỒNG ĐI
      if (["IT005", "CE118", "AI002"].includes(courseCode)) {
        console.log("🎯 [PERIOD TRACE]", { 
          courseCode, 
          classCode, 
          rawPeriod: rawPeriodStr, 
          parsedPeriods: sessionsRaw[0]?.periods || [], 
          sessions: sessionsRaw 
        });
      }

      const sessions = sessionsRaw.length === 0 ? [{
        day: null, periods: [], room: "",
        weekPattern: mappedRow['CACHTUAN'] ? String(mappedRow['CACHTUAN']).trim() : "",
        rawWeekPattern: mappedRow['CACHTUAN'] ? String(mappedRow['CACHTUAN']).trim() : "",
        startDate: mappedRow['NBD'] ? String(mappedRow['NBD']).trim() : "",
        endDate: mappedRow['NKT'] ? String(mappedRow['NKT']).trim() : "",
        hasSchedule: false // CHUẨN XÁC CHO LỚP HT2
      }] : sessionsRaw.map(s => ({
        ...s,
        weekPattern: mappedRow['CACHTUAN'] ? String(mappedRow['CACHTUAN']).trim() : "",
        rawWeekPattern: mappedRow['CACHTUAN'] ? String(mappedRow['CACHTUAN']).trim() : "",
        startDate: mappedRow['NBD'] ? String(mappedRow['NBD']).trim() : "",
        endDate: mappedRow['NKT'] ? String(mappedRow['NKT']).trim() : "",
        hasSchedule: !!(s.day && s.periods.length > 0)
      }));

      offering.options.push({
        displayCode: classCode, type: type,
        teacherName: mappedRow['TENGV'] ? String(mappedRow['TENGV']).trim() : (mappedRow['MAGV'] ? String(mappedRow['MAGV']).trim() : ""),
        teacherRole: "LECTURER", componentCredits: credits, 
        parentLtClassCode, sessions, rawCodes: [classCode], rawPeriod: rawPeriodStr
      });
    }
  }

  if (Object.keys(coursesMap).length === 0) throw new Error("PARSER PRODUCED ZERO COURSES");
  return { coursesMap, warnings };
};