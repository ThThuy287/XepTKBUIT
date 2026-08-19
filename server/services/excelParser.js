const XLSX = require('xlsx');

// 1. CHUẨN HÓA HEADER & ÁNH XẠ CỘT (Đã fix lỗi Giảng viên & TC)
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
  
  // Tên Giảng viên (Đã bao quát mọi case của UIT)
  'MAGV': 'MAGV', 'MÃGV': 'MAGV',
  'TENGV': 'TENGV', 'TÊNGV': 'TENGV', 'TÊNGIÁOVIÊN': 'TENGV', 'TENGIANGVIEN': 'TENGV', 'GIANGVIEN': 'TENGV', 
  'CBGD': 'TENGV', 'TENCBGD': 'TENGV', 'CANBOGIANGDAY': 'TENGV',
  'TROGIANG': 'TENGV', 'TENTROGIANG': 'TENGV',
  
  // Tín chỉ (Bao quát TC, SOTC)
  'SOTC': 'SOTC', 'SỐTC': 'SOTC', 'TC': 'SOTC', 'TINCHI': 'SOTC', 'SOTINCHI': 'SOTC',
  
  'HTGD': 'HTGD',
  'THU': 'THU', 'THỨ': 'THU',
  'TIET': 'TIET', 'TIẾT': 'TIET',
  'CACHTUAN': 'CACHTUAN', 'CÁCHTUẦN': 'CACHTUAN',
  'PHONGHOC': 'PHONGHOC', 'PHÒNGHỌC': 'PHONGHOC', 'PHONG': 'PHONGHOC',
  'NBD': 'NBD', 'NGÀYBẮTĐẦU': 'NBD', 'NGAYBATDAU': 'NBD',
  'NKT': 'NKT', 'NGÀYKẾTTHÚC': 'NKT', 'NGAYKETTHUC': 'NKT',
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
// 2. PERIOD PARSER: DFS BACKTRACKING + SCORING ENGINE
// ============================================================================

function parseCompactPeriods(str) {
  if (!str) return [];
  let s = String(str).trim().replace(/\s+/g, '');
  if (!s) return [];

  let validPaths = [];

  function dfs(index, currentPath) {
    if (index === s.length) {
      validPaths.push([...currentPath]);
      return;
    }

    // Nhánh 1: 1 chữ số (1-9)
    let t1 = parseInt(s.substring(index, index + 1), 10);
    if (t1 >= 1 && t1 <= 9) {
      currentPath.push(t1);
      dfs(index + 1, currentPath);
      currentPath.pop();
    }

    // Nhánh 2: Số 0 đại diện cho tiết 10
    if (s[index] === '0') {
      currentPath.push(10);
      dfs(index + 1, currentPath);
      currentPath.pop();
    }

    // Nhánh 3: 2 chữ số (10-15)
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
    console.warn(`[PERIOD PARSER] Cảnh báo: Không thể bóc tách chuỗi "${s}"`);
    return [];
  }

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
          code: courseCode, 
          name: mappedRow['TENMH'] ? String(mappedRow['TENMH']).trim() : "", 
          credits: 0, 
          offerings: [], 
          _typeCredits: {} // TẠO BIẾN TẠM ĐỂ THEO DÕI TÍN CHỈ TỪNG LOẠI
        };
      }
      
      // LOGIC TÍN CHỈ MỚI: Ghi nhận số Tín chỉ lớn nhất cho từng loại (LT, HT1...) của môn học này
      coursesMap[courseCode]._typeCredits[type] = Math.max(
        coursesMap[courseCode]._typeCredits[type] || 0, 
        credits
      );

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

      offering.options.push({
        displayCode: classCode, type: type,
        teacherName: mappedRow['TENGV'] ? String(mappedRow['TENGV']).trim() : (mappedRow['MAGV'] ? String(mappedRow['MAGV']).trim() : ""),
        teacherRole: "LECTURER", componentCredits: credits, 
        parentLtClassCode, sessions, rawCodes: [classCode], rawPeriod: rawPeriodStr
      });
    }
  }

  // TỔNG HỢP LẠI TOÀN BỘ TÍN CHỈ TRƯỚC KHI TRẢ VỀ (Course.credits = LT + HT1 + HT2...)
  Object.values(coursesMap).forEach(course => {
    let totalCourseCredits = 0;
    Object.values(course._typeCredits).forEach(val => {
      totalCourseCredits += val;
    });
    course.credits = totalCourseCredits;
    delete course._typeCredits; // Dọn dẹp biến tạm
  });

  if (Object.keys(coursesMap).length === 0) throw new Error("PARSER PRODUCED ZERO COURSES");
  return { coursesMap, warnings };
};