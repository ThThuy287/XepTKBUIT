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
        if (HEADER_MAP[normalized]) {
          rowHeaders.push(HEADER_MAP[normalized]);
        }
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
// 2. COMPACT PERIOD PARSER (DETERMINISTIC BACKTRACKING - KHÔNG FALLBACK SAI)
// ============================================================================

function parseCompactPeriods(str) {
  if (!str) return [];
  let s = String(str).trim();
  if (!s) return [];

  // Xử lý trường hợp "12" đặc biệt
  if (s === "12") return [1, 2];

  const n = s.length;
  let bestValidPartition = null;

  function backtrack(index, currentPath) {
    if (index === n) {
      if (isValidSequence(currentPath)) {
        if (!bestValidPartition || currentPath.length > bestValidPartition.length) {
          bestValidPartition = [...currentPath];
        }
      }
      return;
    }

    // Thử cắt token 1 chữ số (1..9)
    if (index < n) {
      let t1 = parseInt(s.substring(index, index + 1), 10);
      if (t1 >= 1 && t1 <= 9) {
        currentPath.push(t1);
        backtrack(index + 1, currentPath);
        currentPath.pop();
      }
    }

    // Thử cắt token 2 chữ số (10..15) hoặc chuỗi kết thúc bằng '0' đứng sau số 9 (VD: "90" -> [9, 10])
    if (index + 1 < n) {
      let sub2 = s.substring(index, index + 2);
      let t2 = parseInt(sub2, 10);
      
      // Nếu là 10..15 chuẩn hoặc chuỗi kết thúc bằng '0' (như '90')
      if ((t2 >= 10 && t2 <= 15) || sub2 === "90" || sub2 === "00") {
        let actualVal = (sub2 === "90") ? 10 : t2;
        currentPath.push(actualVal);
        backtrack(index + 2, currentPath);
        currentPath.pop();
      }
    }
  }

  function isValidSequence(arr) {
    if (arr.length === 0) return false;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] < 1 || arr[i] > 15) return false;
      if (i > 0 && arr[i] !== arr[i - 1] + 1) return false; // Tuần tự tăng +1 tuyệt đối
    }
    return true;
  }

  backtrack(0, []);

  if (bestValidPartition) {
    return [...new Set(bestValidPartition)].sort((a, b) => a - b);
  }

  // LOẠI BỎ FALLBACK LỎNG LẺO: Nếu không match được sequence chuẩn, quăng lỗi hoặc trả mảng rỗng theo yêu cầu chống tạo sai period.
  throw new Error(`INVALID_PERIOD_FORMAT: Không thể phân tích chuỗi tiết "${s}"`);
}

function parsePeriods(raw) {
  if (!raw) return [];
  let s = String(raw).trim();
  if (!s) return [];

  if (s.includes(',')) {
    return s.split(',').map(part => parseCompactPeriods(part)).filter(arr => arr.length > 0);
  }

  const single = parseCompactPeriods(s);
  return single.length > 0 ? [single] : [];
}

// ============================================================================
// 3. PARSE SESSIONS & MAPPING
// ============================================================================

const parseSessions = (thuRaw, tietRaw, phongRaw) => {
  if (!thuRaw && !tietRaw) return [];
  const days = thuRaw ? thuRaw.toString().split(',').map(d => d.trim()).filter(Boolean) : [];
  const tietGroups = tietRaw ? parsePeriods(tietRaw) : [];
  const rooms = phongRaw ? phongRaw.toString().split(',').map(r => r.trim()).filter(Boolean) : [];
  
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

exports.parseExcel = async (filePath, io) => {
  console.log("🚀🚀🚀 [BẮT ĐẦU TIẾP NHẬN FILE (STRICT UNIT TEST CHECK)] 🚀🚀🚀");

  // CHẠY UNIT TEST TRỰC TIẾP KHI PARSER KHỞI ĐỘNG
  try {
    console.log("PERIOD UNIT TEST:", {
      "123": parseCompactPeriods("123"),
      "67890": parseCompactPeriods("67890"),
      "90": parseCompactPeriods("90"),
      "11121314": parseCompactPeriods("11121314"),
      "12131415": parseCompactPeriods("12131415")
    });
  } catch (err) {
    console.error("UNIT TEST FAILED:", err.message);
  }

  let workbook;
  try {
    workbook = XLSX.readFile(filePath);
  } catch (error) {
    console.error("❌ LỖI ĐỌC FILE:", error);
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

    const rawData = XLSX.utils.sheet_to_json(sheet, { 
      range: formatInfo.headerRowIndex, 
      defval: "" 
    });

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
          code: courseCode, 
          name: mappedRow['TENMH'] ? String(mappedRow['TENMH']).trim() : "", 
          credits: 0, 
          offerings: [],
          _tempLtCredits: 0 
        };
      }
      
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

      const parentLtClassCode = mappedRow['MA_LOP_LT'] ? String(mappedRow['MA_LOP_LT']).trim() : null;
      const rawPeriodStr = mappedRow['TIET'] ? String(mappedRow['TIET']).trim() : "";

      const sessionsRaw = parseSessions(mappedRow['THU'], rawPeriodStr, mappedRow['PHONGHOC']);
      
      // LOG CHÍNH XÁC KHI GẶP IT005.R11 HOẶC IT005.R11.1 ĐỂ KIỂM TRA TRỰC TIẾP TRÊN RENDER
      if (courseCode === "IT005" && (classCode === "IT005.R11" || classCode === "IT005.R11.1")) {
        console.log("🎯 [EXACT RECORD LOG] ->", {
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
        hasSchedule: false
      }] : sessionsRaw.map(s => ({
        ...s,
        weekPattern: mappedRow['CACHTUAN'] ? String(mappedRow['CACHTUAN']).trim() : "",
        rawWeekPattern: mappedRow['CACHTUAN'] ? String(mappedRow['CACHTUAN']).trim() : "",
        startDate: mappedRow['NBD'] ? String(mappedRow['NBD']).trim() : "",
        endDate: mappedRow['NKT'] ? String(mappedRow['NKT']).trim() : "",
        hasSchedule: !!(s.day && s.periods.length > 0)
      }));

      const record = {
        displayCode: classCode,
        type: type,
        teacherName: mappedRow['TENGV'] ? String(mappedRow['TENGV']).trim() : (mappedRow['MAGV'] ? String(mappedRow['MAGV']).trim() : ""),
        teacherRole: "LECTURER",
        componentCredits: credits, 
        parentLtClassCode,
        sessions,
        rawCodes: [classCode],
        rawPeriod: rawPeriodStr
      };

      offering.options.push(record);
    }
  }

  if (Object.keys(coursesMap).length === 0) {
    throw new Error("PARSER PRODUCED ZERO COURSES");
  }

  return { coursesMap, warnings };
};