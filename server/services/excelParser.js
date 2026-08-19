const xlsx = require('xlsx');
// 1. Hàm chuẩn hóa tên cột (san phẳng tiếng Việt, khoảng trắng, xuống dòng)
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
  'MALOPLT': 'MA_LOP_LT' // Đã bị hàm normalize xóa khoảng trắng
};

// 2. Hàm quét động tìm dòng Header và định dạng Format
// 2. Hàm quét động tìm dòng Header và định dạng Format (Bản Debug)
const detectFormatAndHeaderRow = (sheet) => {
  const range = XLSX.utils.decode_range(sheet['!ref']);
  
  console.log("=== BẮT ĐẦU QUÉT HEADER ===");
  // Tăng tầm quét lên 50 dòng phòng hờ Header nằm sâu bên dưới
  for (let R = range.s.r; R <= Math.min(range.e.r, 50); ++R) { 
    const rawRowValues = [];
    const rowHeaders = [];
    
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = sheet[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell && cell.v) {
        rawRowValues.push(cell.v); // Lưu lại giá trị thô để soi log
        const normalized = normalizeHeader(cell.v);
        if (HEADER_MAP[normalized]) {
          rowHeaders.push(HEADER_MAP[normalized]);
        }
      }
    }
    
    // Chỉ log những dòng có dữ liệu để tránh rác console
    if (rawRowValues.length > 0) {
      console.log(`[DÒNG ${R + 1}] Gốc:`, rawRowValues.slice(0, 5).join(" | "));
      console.log(`[DÒNG ${R + 1}] Bắt được Key:`, rowHeaders);
    }
    
    // Kiểm tra điều kiện chốt Header
    if (rowHeaders.includes('MAMH') && rowHeaders.includes('MALOP') && rowHeaders.includes('TENMH')) {
      console.log("=> THÀNH CÔNG! TÌM THẤY HEADER TẠI DÒNG:", R + 1);
      const isFormat1171 = rowHeaders.includes('MA_LOP_LT');
      return {
        headerRowIndex: R,
        format: isFormat1171 ? 'FORMAT_DANHSACHLOP_1171' : 'FORMAT_TKB_STANDARD'
      };
    }
  }
  
  console.log("=== QUÉT XONG NHƯNG KHÔNG TÌM THẤY BỘ 3 HEADER BẮT BUỘC ===");
  throw new Error("PARSER FORMAT DETECTION FAILED");
};

// 3. Hàm tách Thứ, Tiết, Phòng (Hỗ trợ môn học nhiều ngày & Không drop HT2)
const parseSessions = (thuRaw, tietRaw, phongRaw) => {
  if (!thuRaw && !tietRaw) return []; // Dành cho lớp HT2 (không có lịch)
  
  const days = thuRaw ? thuRaw.toString().split(',') : [];
  const periodsStr = tietRaw ? tietRaw.toString().split(',') : [];
  const rooms = phongRaw ? phongRaw.toString().split(',') : [];
  
  const sessions = [];
  const maxLen = Math.max(days.length, periodsStr.length);
  
  for (let i = 0; i < maxLen; i++) {
    const day = days[i] ? parseInt(days[i].trim()) : null;
    let periods = [];
    
    if (periodsStr[i]) {
      const pStr = periodsStr[i].trim();
      let j = 0;
      while (j < pStr.length) {
        if (pStr[j] === '1' && pStr[j+1] && ['0','1','2','3','4','5'].includes(pStr[j+1])) {
          periods.push(parseInt(pStr.substring(j, j+2)));
          j += 2;
        } else {
          periods.push(parseInt(pStr[j]));
          j++;
        }
      }
    }
    
    sessions.push({
      day: day,
      periods: periods,
      room: rooms[i] ? rooms[i].trim() : (rooms[0] ? rooms[0].trim() : '')
    });
  }
  return sessions;
};

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
  console.log("🚀🚀🚀 [BẮT ĐẦU TIẾP NHẬN FILE] 🚀🚀🚀");
  console.log("📂 Đường dẫn file:", filePath);
  const workbook = xlsx.readFile(filePath);
  const coursesMap = {};
  const warnings = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    
    // 1. NHẬN DIỆN FORMAT VÀ DÒNG HEADER ĐỘNG
    let formatInfo;
    try {
      formatInfo = detectFormatAndHeaderRow(sheet);
      console.log(`\n--- DỮ LIỆU SHEET: ${sheetName} ---`);
      console.log("FORMAT DETECTED:", formatInfo.format);
      console.log("HEADER ROW:", formatInfo.headerRowIndex + 1);
    } catch (error) {
      warnings.push(`Bỏ qua sheet "${sheetName}": Không nhận diện được định dạng TKB hợp lệ.`);
      continue; // Bỏ qua sheet rỗng hoặc rác
    }

    // 2. PARSE DATA TỪ DÒNG HEADER ĐÃ TÌM ĐƯỢC (Tự động map key theo header)
    const rawData = xlsx.utils.sheet_to_json(sheet, { 
      range: formatInfo.headerRowIndex, 
      defval: "" 
    });

    console.log("RAW ROW COUNT:", rawData.length);
    let normalizedRowCount = 0;

    // 3. XỬ LÝ TỪNG DÒNG (NORMALIZATION & MAPPING)
    for (const row of rawData) {
      // Ép tất cả các key của thư viện xlsx về Canonical Key của hệ thống
      const mappedRow = {};
      Object.keys(row).forEach(key => {
        const normKey = normalizeHeader(key);
        if (HEADER_MAP[normKey]) {
          mappedRow[HEADER_MAP[normKey]] = row[key];
        }
      });

      const courseCode = mappedRow['MAMH'] ? String(mappedRow['MAMH']).trim() : "";
      const classCode = mappedRow['MALOP'] ? String(mappedRow['MALOP']).trim() : "";

      // Dòng nào không có Mã MH và Mã Lớp thì bỏ qua (KHÔNG drop dòng có mã mà thiếu thứ/tiết)
      if (!courseCode || !classCode || courseCode.toUpperCase().includes("MÃ")) continue;
      
      normalizedRowCount++;

      const courseName = mappedRow['TENMH'] ? String(mappedRow['TENMH']).trim() : "";
      const teacherName = mappedRow['TENGV'] ? String(mappedRow['TENGV']).trim() : (mappedRow['MAGV'] ? String(mappedRow['MAGV']).trim() : "");
      
      // Giả định role (có thể mở rộng thêm logic kiểm tra Tên GV có chứa chữ Trợ giảng)
      let teacherRole = "LECTURER"; 

      const credits = mappedRow['SOTC'] ? parseFloat(mappedRow['SOTC']) || 0 : 0;
      
      let type = mappedRow['HTGD'] ? String(mappedRow['HTGD']).trim().toUpperCase() : "UNKNOWN";
      if (!["LT", "HT1", "HT2", "ĐA", "DA", "KLTN", "TTTN"].includes(type)) type = "UNKNOWN";
      if (type === "ĐA") type = "DA";

      // ĐỌC TRỰC TIẾP MA_LOP_LT ĐỂ LINK THỰC HÀNH VÀ LÝ THUYẾT (Format 1171)
      const parentLtClassCode = mappedRow['MA_LOP_LT'] ? String(mappedRow['MA_LOP_LT']).trim() : null;
      
      const rawDay = mappedRow['THU'] ? String(mappedRow['THU']).trim() : "";
      const rawPeriod = mappedRow['TIET'] ? String(mappedRow['TIET']).trim() : "";
      const room = mappedRow['PHONGHOC'] ? String(mappedRow['PHONGHOC']).trim() : "";
      const weekPattern = mappedRow['CACHTUAN'] ? String(mappedRow['CACHTUAN']).trim() : "";
      const startDate = mappedRow['NBD'] ? String(mappedRow['NBD']).trim() : "";
      const endDate = mappedRow['NKT'] ? String(mappedRow['NKT']).trim() : "";

      // 4. PARSE SESSIONS (Xử lý đa ngày và logic Tiết UIT)
      const daysArr = rawDay.split(",").map(d => d.trim()).filter(Boolean);
      const periodsArr = rawPeriod.split(",").map(p => p.trim()).filter(Boolean);
      const roomsArr = room.split(",").map(r => r.trim()).filter(Boolean);

      const sessions = [];
      const maxSessions = Math.max(daysArr.length, periodsArr.length);

      // KHÔNG DROP DÒNG HT2/KLTN: Nếu không có ngày/tiết vẫn tạo mảng rỗng
      if (maxSessions === 0) {
        sessions.push({ day: null, periods: [], room: roomsArr[0] || "", weekPattern, weekPhase: "UNKNOWN", rawWeekPattern: weekPattern, startDate, endDate, hasSchedule: false });
      } else {
        for (let i = 0; i < maxSessions; i++) {
          const dStr = daysArr[i] || daysArr[0] || null;
          const pStr = periodsArr[i] || periodsArr[0] || "";
          const rStr = roomsArr[i] || roomsArr[0] || ""; // Lấy phòng tương ứng
          
          const dInt = dStr ? parseInt(dStr, 10) : null;
          const parsedPeriods = extractPeriods(pStr); // Vẫn dùng hàm UIT gốc để bóc tách 0 = Tiết 10
          
          sessions.push({
            day: dInt,
            periods: parsedPeriods,
            room: rStr,
            weekPattern,
            weekPhase: "UNKNOWN",
            rawWeekPattern: weekPattern,
            startDate,
            endDate,
            hasSchedule: !!(dInt && parsedPeriods.length > 0)
          });
        }
      }

      // 5. MAP VÀO DATABASE TẠM (coursesMap)
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
        parentLtClassCode, // <-- Biến sống còn của Format 1171
        sessions,
        rawCodes: [classCode]
      });
    }
    
    console.log("NORMALIZED ROW COUNT:", normalizedRowCount);
    if (normalizedRowCount === 0) {
       warnings.push(`Sheet "${sheetName}" có format TKB nhưng không extract được dữ liệu chuẩn nào.`);
    }
  }

  return { coursesMap, warnings };
};