# Changelog

## [1.0.0] - 2026-08-19
### Added
- Excel import engine với Deterministic DFS Scoring Parser hỗ trợ Compact Notation của UIT.
- Hỗ trợ đầy đủ phân loại học phần: LT, HT1, HT2, ĐA, KLTN, TTTN.
- Tự động map quan hệ Lý thuyết ↔ Thực hành (LT ↔ TH) qua MA_LOP_LT.
- Conflict Engine phát hiện trùng lịch (Thời gian, Ngày, Tuần học).
- Schedule Rendering tách biệt Main Grid (Tiết 1-10) và Outside Hours (Tiết 11-15).
- Tính năng Undo / Clear All / Save / Load / Export PNG.
- Production deployment scripts cho Vercel (Frontend) và Render (Backend + DB).
- Đóng băng API v1.0.0 với kiến trúc Database độc lập theo `importId`.