const XLSX = require('xlsx');

// 1. CHUẨN HÓA HEADER THUẬT TOÁN MỚI
const normalizeHeader = (header) => {
  if (!header) return '';
  return header.toString()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Bỏ dấu
    .toUpperCase()
    .replace(/\s+/g, '') // Bỏ TẤT CẢ khoảng trắng ("MA LOP LT" -> "MALOPLT")
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
  'MALOPLT': 'MA_LOP_LT' // Đã khớp với output của normalizeHeader
};

// 2. DETECT HEADER VỚI LOG CHI TIẾT
const detectFormatAndHeaderRow = (sheet) => {
  const range = XLSX.utils.decode_range(sheet['!ref']);
  
  for (let R = range.s.r; R <= Math.min(range.e.r, 30); ++R) { 
    const rawRowValues = [];
    const rowHeaders = [];
    
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = sheet[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell && cell.v !== undefined && cell.v !== null) {
        rawRowValues.push(cell.v);
        const normalized = normalizeHeader(cell.v);
        if (HEADER_MAP[normalized]) {
          rowHeaders.push(HEADER_MAP[normalized]);
        }
      }
    }
    
    if (rawRowValues.length > 0) {
      console.log(`\n[DÒNG ${R + 1}]`);
      console.log(`RAW:`, rawRowValues);
      console.log(`NORMALIZED:`, rowHeaders);
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

// 3. THUẬT TOÁN EXTRACT PERIODS DETERMINISTIC CHUẨN XÁC
function extractPeriods(str) {
  if (!str) return [];
  let s = String(str).trim();
  let parsed = [];
  let i = 0;
  while (i < s.length) {
    const nextTwo = s.substring(i, i + 2);
    if (['10', '11', '12', '13', '14', '15'].includes(nextTwo)) {
      parsed.push(parseInt(nextTwo, 10));
      i += 2;
    } else if (s[i] === '0') {
      parsed.push(10);
      i += 1;
    } else if (/\d/.test(s[i])) {
      parsed.push(parseInt(s[i], 10));
      i += 1;
    } else {
      i += 1;
    }
  }
  return [...new Set(parsed)].sort((a, b) => a - b);
}

// 4. PARSE SESSIONS
const parseSessions = (thuRaw, tietRaw, phongRaw) => {
  if (!thuRaw && !tietRaw) return [];
  const days = thuRaw ? thuRaw.toString().split(',') : [];
  const periodsStr = tietRaw ? tietRaw.toString().split(',') : [];
  const rooms = phongRaw ? phongRaw.toString().split(',') : [];
  
  const sessions = [];
  const maxLen = Math.max(days.length, periodsStr.length);
  
  for (let i = 0; i < maxLen; i++) {
    const day = days[i] ? parseInt(days[i].trim()) : null;
    const pStr = periodsStr[i] || "";
    const parsedPeriods = extractPeriods(pStr);
    const room = rooms[i] ? rooms[i].trim() : (rooms[0] ? rooms[0].trim() : '');
    
    sessions.push({ day, periods: parsedPeriods, room });
  }
  return sessions;
};

// 5. HÀM XỬ LÝ CHÍNH
exports.parseExcel = async (filePath, io) => {
  console.log("🚀🚀🚀 [BẮT ĐẦU TIẾP NHẬN FILE] 🚀🚀🚀");
  console.log("📂 Đường dẫn file:", filePath);
  
  let workbook;
  try {
    workbook = XLSX.readFile(filePath);
    console.log("📑 CÁC SHEET TÌM THẤY:", workbook.SheetNames);
  } catch (error) {
    console.error("❌ LỖI TRÍ MẠNG LÚC ĐỌC FILE TỪ Ổ ĐĨA RENDER:", error);
    throw new Error("Không thể đọc được file Excel.");
  }

  const coursesMap = {};
  const warnings = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet['!ref']) continue;

    console.log(`\n=== ĐANG QUÉT SHEET: ${sheetName} ===`);
    let formatInfo;
    
    try {
      formatInfo = detectFormatAndHeaderRow(sheet);
      console.log("=> FORMAT DETECTED:", formatInfo.format);
      console.log("=> HEADER ROW:", formatInfo.headerRowIndex + 1);
    } catch (error) {
      console.error(`❌ HEADER DETECTION FAILED: ${sheetName}`);
      console.error(error);
      warnings.push(`HEADER DETECTION FAILED: ${sheetName}`);
      continue; // Cố tình bỏ qua sheet rác, nhưng đã log đủ bằng chứng
    }

    const rawData = XLSX.utils.sheet_to_json(sheet, { 
      range: formatInfo.headerRowIndex, 
      defval: "" 
    });

    console.log(`\n=> RAW ROW COUNT TRONG SHEET ${sheetName}:`, rawData.length);
    if (rawData.length > 0) {
      console.log("=> 5 DÒNG DATA THÔ ĐẦU TIÊN:\n", rawData.slice(0, 5));
    }

    let normalizedRowCount = 0;

    for (const row of rawData) {
      const mappedRow = {};
      Object.keys(row).forEach(key => {
        const normKey = normalizeHeader(key);
        if (HEADER_MAP[normKey]) mappedRow[HEADER_MAP[normKey]] = row[key];
      });

      const courseCode = mappedRow['MAMH'] ? String(mappedRow['MAMH']).trim() : "";
      const classCode = mappedRow['MALOP'] ? String(mappedRow['MALOP']).trim() : "";

      if (!courseCode || !classCode || courseCode.toUpperCase().includes("MÃ")) continue;
      
      normalizedRowCount++;

      let type = mappedRow['HTGD'] ? String(mappedRow['HTGD']).trim().toUpperCase() : "UNKNOWN";
      if (!["LT", "HT1", "HT2", "ĐA", "DA", "KLTN", "TTTN"].includes(type)) type = "UNKNOWN";
      if (type === "ĐA") type = "DA";

      const credits = mappedRow['SOTC'] ? parseFloat(mappedRow['SOTC']) || 0 : 0;
      
      // Xử lý Credits: Chỉ gán trực tiếp SOTC làm componentCredits
      if (!coursesMap[courseCode]) {
        coursesMap[courseCode] = { 
          code: courseCode, 
          name: mappedRow['TENMH'] ? String(mappedRow['TENMH']).trim() : "", 
          credits: 0, // Sẽ update sau dựa vào LT
          offerings: [],
          _tempLtCredits: 0 // Biến tạm lưu SOTC của LT
        };
      }
      
      // Nếu là LT, cập nhật tổng tín chỉ của môn học
      if (type === 'LT') {
        coursesMap[courseCode].credits = credits;
        coursesMap[courseCode]._tempLtCredits = credits;
      } else if (coursesMap[courseCode].credits === 0 && coursesMap[courseCode]._tempLtCredits === 0) {
         // Fallback nếu parse trúng lớp TH trước lớp LT
         coursesMap[courseCode].credits = credits; 
      }

      let offering = coursesMap[courseCode].offerings.find(o => o.type === type);
      if (!offering) {
        offering = { type, options: [] };
        coursesMap[courseCode].offerings.push(offering);
      }

      // Đọc trực tiếp, không suy luận parent
      const parentLtClassCode = mappedRow['MA_LOP_LT'] ? String(mappedRow['MA_LOP_LT']).trim() : null;

      const sessionsRaw = parseSessions(mappedRow['THU'], mappedRow['TIET'], mappedRow['PHONGHOC']);
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
        rawCodes: [classCode]
      };

      offering.options.push(record);
    }
    
    console.log(`=> NORMALIZED ROW COUNT TRONG SHEET ${sheetName}:`, normalizedRowCount);
  }

  // VALIDATION CUỐI CÙNG
  if (Object.keys(coursesMap).length === 0) {
    throw new Error("PARSER PRODUCED ZERO COURSES");
  }

  return { coursesMap, warnings };
};