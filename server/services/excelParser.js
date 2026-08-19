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

// ==========================================
// 2. PERIOD PARSER THUẬT TOÁN MỚI (DETERMINISTIC)
// ==========================================

function parsePeriodToken(token) {
  if (!token) return [];
  let s = String(token).trim();
  if (!s) return [];

  // A. XỬ LÝ RANGE (Hỗ trợ các loại dấu gạch ngang: -, –, —)
  const rangeRegex = /^(\d+)\s*[-–—]\s*(\d+)$/;
  const rangeMatch = s.match(rangeRegex);
  if (rangeMatch) {
    let start = parseInt(rangeMatch[1], 10);
    let end = parseInt(rangeMatch[2], 10);
    if (!isNaN(start) && !isNaN(end) && start <= end) {
      let res = [];
      for (let i = start; i <= end; i++) {
        res.push(i);
      }
      return res;
    }
  }

  // B. XỬ LÝ COMPACT NOTATION (VD: "12345", "67890", "11121314")
  let parsed = [];
  let i = 0;
  while (i < s.length) {
    // Ưu tiên đọc số có 2 chữ số từ 10 đến 15
    if (i + 1 < s.length) {
      let sub2 = s.substring(i, i + 2);
      let val2 = parseInt(sub2, 10);
      if (val2 >= 10 && val2 <= 15) {
        parsed.push(val2);
        i += 2;
        continue;
      }
    }
    // Đọc số 1 chữ số hoặc số 0 (đại diện cho tiết 10 trong một số chuỗi compact)
    let char = s[i];
    if (char === '0') {
      parsed.push(10);
    } else if (/\d/.test(char)) {
      parsed.push(parseInt(char, 10));
    }
    i += 1;
  }

  return [...new Set(parsed)].sort((a, b) => a - b);
}

function parsePeriods(raw) {
  if (!raw) return [];
  let s = String(raw).trim();
  if (!s) return [];

  // Hỗ trợ multi group phân tách bằng dấu phẩy
  if (s.includes(',')) {
    const parts = s.split(',');
    return parts.map(part => parsePeriodToken(part)).filter(arr => arr.length > 0);
  }

  const single = parsePeriodToken(s);
  return single.length > 0 ? [single] : [];
}

// ==========================================
// 3. PARSE SESSIONS & EXCEL MAPPING
// ==========================================

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
  console.log("🚀🚀🚀 [BẮT ĐẦU TIẾP NHẬN FILE] 🚀🚀🚀");
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
        rawPeriod: rawPeriodStr // Lưu rawPeriod để debug
      };

      offering.options.push(record);
    }
  }

  if (Object.keys(coursesMap).length === 0) {
    throw new Error("PARSER PRODUCED ZERO COURSES");
  }

  return { coursesMap, warnings };
};