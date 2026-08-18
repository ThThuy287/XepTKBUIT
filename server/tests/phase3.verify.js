const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

const API_BASE = "'https://xeptkbuit.onrender.com/api";
const serverDir = path.join(__dirname, "..");
const excelFile = fs.readdirSync(serverDir).find(f => f.endsWith(".xlsx"));
const FILE_NAME = excelFile || "KHONG_TIM_THAY_FILE.xlsx";
const FILE_PATH = path.join(serverDir, FILE_NAME);

let results = { env: {}, excel: {}, ht2: {}, periods: {}, conflict: {}, sameCourse: {}, week: {} };
let globalImportId = null;
let allCourses = [];
let hasFatalError = false;

const logStep = (section, name, condition, actualStr = "", errorStr = "") => {
  if (condition) results[section][name] = `[PASS] ${name}`;
  else { results[section][name] = `[FAIL] ${name} | Expected: True | Actual: ${actualStr} | Error: ${errorStr}`; hasFatalError = true; }
};
const warnStep = (section, name, msg) => { results[section][name] = `[WARN] ${name} - ${msg}`; };

async function runVerify() {
  console.log("====================================\nX?P TKB UIT - PHASE 3 VERIFY\n====================================\n");
  console.log("-> Checking Environment...");
  
  if (!excelFile) { results.env["File"] = `[BLOCKED] Missing Excel File`; printFinalReport(); return; }
  results.env["File"] = `[PASS] Found Excel File: ${FILE_NAME}`;

  try {
    const healthRes = await axios.get(`${API_BASE}/health`);
    if (healthRes.data.success) results.env["Server"] = "[PASS] Server is running (Health Check OK)";
    else throw new Error("Health check returned false");
  } catch (err) {
    const status = err.response ? err.response.status : "N/A";
    const url = err.config ? err.config.url : `${API_BASE}/health`;
    const method = err.config ? err.config.method.toUpperCase() : "GET";
    results.env["Server"] = `[BLOCKED] Cannot connect to Server/DB.\n   HTTP method: ${method}\n   URL: ${url}\n   Status: ${status}\n   Root cause: Endpoint not found or Server down.`;
    printFinalReport(); return;
  }

  console.log("-> Testing Excel Import...");
  try {
    const form = new FormData();
    form.append("file", fs.createReadStream(FILE_PATH));
    const importRes = await axios.post(`${API_BASE}/import/xlsx`, form, { headers: form.getHeaders(), maxContentLength: Infinity, maxBodyLength: Infinity });
    const data = importRes.data;
    logStep("excel", "Upload", importRes.status === 200, importRes.status);
    logStep("excel", "Import ID", data.success === true && !!data.importId, JSON.stringify(data));
    if (data.importId) {
      globalImportId = data.importId;
      logStep("excel", "Courses", data.summary.courses > 0, data.summary.courses);
      logStep("excel", "ClassOptions", data.summary.options > 0, data.summary.options);
    } else throw new Error("No importId returned");
  } catch (err) {
    const status = err.response ? err.response.status : "N/A";
    const url = err.config ? err.config.url : `${API_BASE}/import/xlsx`;
    logStep("excel", "Upload", false, "", `Request failed with status code ${status} at ${url}`);
    printFinalReport(); return;
  }

  console.log("-> Testing Database Fetch...");
  try {
    const fetchRes = await axios.get(`${API_BASE}/courses?importId=${globalImportId}`);
    allCourses = fetchRes.data;
    logStep("excel", "Offerings DB", allCourses.length > 0 && allCourses[0].offerings.length > 0, allCourses.length);
  } catch (err) { logStep("excel", "Database Fetch", false, "", err.message); }

  console.log("-> Verifying HT2 and Periods > 10...");
  let ht2Total = 0, ht2NoSchedule = 0, periodGt10Count = 0;
  allCourses.forEach(c => {
    c.offerings.forEach(off => {
      off.options.forEach(opt => {
        if (opt.type === "HT2") { ht2Total++; if (!opt.sessions || opt.sessions.length === 0) ht2NoSchedule++; }
        (opt.sessions || []).forEach(sess => { if ((sess.periods || []).some(p => p > 10)) periodGt10Count++; });
      });
    });
  });
  logStep("ht2", "HT2 retained", ht2Total > 0, ht2Total);
  if (ht2NoSchedule > 0) logStep("ht2", "HT2 without schedule", true, ht2NoSchedule); else warnStep("ht2", "HT2 without schedule", "Found 0");
  logStep("periods", "Period > 10 retained", periodGt10Count > 0, periodGt10Count);

  console.log("-> Testing Conflict Engine...");
  try {
    const validate = async (newOpt, curOpts) => (await axios.post(`${API_BASE}/schedules/validate`, { newOption: newOpt, currentOptions: curOpts })).data;
    const optA = { courseCode: "MOCK01", type: "LT", displayCode: "M1", sessions: [{ day: 2, periods: [1,2,3], weekPhase: "UNKNOWN" }] };
    const optB = { courseCode: "MOCK02", type: "LT", displayCode: "M2", sessions: [{ day: 2, periods: [3,4,5], weekPhase: "UNKNOWN" }] };
    const t1 = await validate(optB, [optA]);
    logStep("conflict", "Overlap", t1.conflict === true && t1.details?.reason === "TIME_OVERLAP", t1.details?.reason);

    const optC = { courseCode: "MOCK03", type: "LT", displayCode: "M3", sessions: [{ day: 2, periods: [4,5], weekPhase: "UNKNOWN" }] };
    const t2 = await validate(optC, [optA]);
    logStep("conflict", "No overlap", t2.conflict === false, t2.conflict);

    const optD = { courseCode: "MOCK04", type: "LT", displayCode: "M4", sessions: [{ day: 3, periods: [1,2,3], weekPhase: "UNKNOWN" }] };
    const t3 = await validate(optD, [optA]);
    logStep("conflict", "Different day", t3.conflict === false, t3.conflict);

    const optHT2 = { courseCode: "MOCK05", type: "HT2", displayCode: "M5", sessions: [] };
    const t4 = await validate(optHT2, [optA]);
    logStep("conflict", "HT2 no schedule", t4.conflict === false, t4.conflict);

    const optSameLT = { courseCode: "MOCK01", type: "LT", displayCode: "M1_NEW", sessions: [{ day: 5, periods: [1,2], weekPhase: "UNKNOWN" }] };
    const tSame1 = await validate(optSameLT, [optA]);
    logStep("sameCourse", "Same course + same type blocked", tSame1.conflict === true && tSame1.details?.reason === "SAME_COURSE_TYPE", tSame1.details?.reason);

    const optDiffType = { courseCode: "MOCK01", type: "HT1", displayCode: "M1_HT1", sessions: [{ day: 5, periods: [1,2], weekPhase: "UNKNOWN" }] };
    const tSame2 = await validate(optDiffType, [optA]);
    logStep("sameCourse", "Same course + different type allowed", tSame2.conflict === false, tSame2.conflict);

    const optWA = { courseCode: "W01", type: "LT", displayCode: "WA", sessions: [{ day: 4, periods: [1,2], weekPhase: "A" }] };
    const optWB = { courseCode: "W02", type: "LT", displayCode: "WB", sessions: [{ day: 4, periods: [1,2], weekPhase: "B" }] };
    const tWA_B = await validate(optWB, [optWA]);
    logStep("week", "Week A vs B (No conflict)", tWA_B.conflict === false, tWA_B.conflict);

    const optWA2 = { courseCode: "W03", type: "LT", displayCode: "WA2", sessions: [{ day: 4, periods: [1,2], weekPhase: "A" }] };
    const tWA_A = await validate(optWA2, [optWA]);
    logStep("week", "Week A vs A (Conflict)", tWA_A.conflict === true, tWA_A.conflict);
  } catch (err) { logStep("conflict", "API Crash", false, "", err.message); }

  printFinalReport();
}

function printFinalReport() {
  console.log("\n====================================\nFINAL REPORT\n====================================");
  for (const section of Object.keys(results)) {
    console.log(`\n--- ${section.toUpperCase()} ---`);
    for (const key of Object.keys(results[section])) console.log(results[section][key]);
  }
  console.log("\n====================================\nFINAL RESULT:");
  if (results.env["Server"]?.includes("BLOCKED")) console.log("BLOCKED (Check Server/PostgreSQL)");
  else if (hasFatalError) console.log("FAIL (See details above)");
  else console.log("PASS");
  console.log("====================================\n");
}
runVerify();
