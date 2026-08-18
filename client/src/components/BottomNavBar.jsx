import React, { useState } from 'react';
import { useSelection } from '../hooks/useSelection';
import { DAYS } from '../constants/days';
import * as htmlToImage from 'html-to-image'; 

export default function BottomNavBar() {
  const { selectedOptions, clearAll, undo, history } = useSelection();
  const [isExporting, setIsExporting] = useState(false);

  let totalCredits = 0;
  const uniqueDays = new Set();
  const countedCourses = new Set();

  selectedOptions.forEach(o => {
    if (!countedCourses.has(o.courseCode)) {
      totalCredits += (o.courseCredits || o.credits || 0);
      countedCourses.add(o.courseCode);
    }
    if (o.sessions) {
      o.sessions.forEach(s => { 
        if (s.day) {
          const rawDay = parseInt(s.day, 10);
          const isValidDay = DAYS.some(d => d.value === rawDay);
          if (isValidDay) uniqueDays.add(rawDay);
        }
      });
    }
  });

  const handleExportImage = async () => {
    const exportContainer = document.getElementById('schedule-grid-export'); 
    const scrollBody = document.getElementById('schedule-grid-body'); 
    
    if (!exportContainer || !scrollBody) return alert("Không tìm thấy bảng TKB để xuất ảnh!");
    
    setIsExporting(true);

    // 1. TẠO LỚP CHE MÀN HÌNH (Chống giựt + Báo hiệu đang tải)
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(252, 248, 255, 0.95)';
    overlay.style.backdropFilter = 'blur(4px)';
    overlay.style.zIndex = '999999';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.transition = 'opacity 0.2s';
    
    overlay.innerHTML = `
      <div style="width: 45px; height: 45px; border: 4px solid #E5E4EC; border-top: 4px solid #3525CD; border-radius: 50%; animation: spinExport 1s linear infinite;"></div>
      <p style="margin-top: 20px; color: #3525CD; font-size: 15px; font-weight: bold; font-family: sans-serif;">Đang kết xuất ảnh sắc nét...</p>
      <style>@keyframes spinExport { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    `;
    document.body.appendChild(overlay);

    try {
      // Chờ màn che hiện lên hoàn tất
      await new Promise(resolve => setTimeout(resolve, 150));

      // 2. BUNG BẢNG TKB RA (Nằm an toàn sau lớp màn che nên không gây giựt mắt)
      const originalHeight = exportContainer.style.height;
      const originalOverflow = exportContainer.style.overflow;
      const originalBodyOverflow = scrollBody.style.overflow;

      exportContainer.style.height = 'auto';
      exportContainer.style.overflow = 'visible';
      scrollBody.style.overflow = 'visible';

      // Chờ giao diện bung hết ra
      await new Promise(resolve => setTimeout(resolve, 150));

      // 3. CHỤP ẢNH TRỰC TIẾP TỪ DOM GỐC (Bảo đảm không bao giờ bị ảnh trắng)
      const dataUrl = await htmlToImage.toPng(exportContainer, { 
        quality: 1.0,
        pixelRatio: 2.5, 
        backgroundColor: '#FFFFFF',
        style: {
          borderRadius: '0',
          margin: '0',
          border: 'none',
          boxShadow: 'none'
        }
      });
      
      // 4. THU GỌN LẠI NHƯ CŨ
      exportContainer.style.height = originalHeight;
      exportContainer.style.overflow = originalOverflow;
      scrollBody.style.overflow = originalBodyOverflow;

      await new Promise(resolve => setTimeout(resolve, 50));

      // 5. TẢI ẢNH XUỐNG VỚI TÊN FILE YÊU CẦU
      const link = document.createElement('a');
      link.download = 'XếpTKBUIT.png';
      link.href = dataUrl;
      link.click();
      
    } catch (error) {
      console.error("Lỗi xuất ảnh:", error);
      alert("Đã xảy ra lỗi khi xuất ảnh. Vui lòng thử lại!");
    } finally {
      // 6. GỠ LỚP CHE MÀN HÌNH
      overlay.style.opacity = '0';
      setTimeout(() => document.body.removeChild(overlay), 200);
      setIsExporting(false);
    }
  };

  return (
    <div className="h-[60px] shrink-0 bg-[#3525CD] text-white px-6 flex items-center justify-between select-none shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-50">
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-white/80">Môn đã chọn:</span>
          <span className="text-[15px] font-bold">{countedCourses.size}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-white/80">Tín chỉ:</span>
          <span className="text-[15px] font-bold">{totalCredits}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-white/80">Ngày học:</span>
          <span className="text-[15px] font-bold">{uniqueDays.size}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={undo}
          disabled={history.length === 0}
          className={`flex items-center gap-2 text-[13px] font-medium transition-colors ${history.length === 0 ? 'text-white/40 cursor-not-allowed' : 'text-white hover:text-gray-200'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
          Hoàn tác
        </button>
        
        <div className="w-[1px] h-4 bg-white/20"></div>
        
        <button 
          onClick={clearAll}
          disabled={selectedOptions.length === 0}
          className={`flex items-center gap-2 text-[13px] font-medium transition-colors ${selectedOptions.length === 0 ? 'text-white/40 cursor-not-allowed' : 'text-[#FFA1A1] hover:text-[#FFC4C4]'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          Xóa toàn bộ
        </button>
        
        <button 
          onClick={handleExportImage}
          disabled={isExporting}
          className={`ml-2 flex items-center gap-2 bg-white text-[#3525CD] px-4 py-2 rounded-lg text-[13px] font-bold transition-colors shadow-sm ${isExporting ? 'opacity-70 cursor-wait' : 'hover:bg-gray-100'}`}
        >
          {isExporting ? (
            <svg className="animate-spin w-4 h-4 text-[#3525CD]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          )}
          {isExporting ? 'Đang xuất...' : 'Xuất ảnh'}
        </button>

      </div>
    </div>
  );
}