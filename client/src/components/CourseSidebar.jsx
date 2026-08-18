import React, { useState, useCallback } from 'react';
import { useCourses } from '../hooks/useCourses';
import { useSelection } from '../hooks/useSelection';
import { DAYS } from '../constants/days';

export default function CourseSidebar() {
  const { courses, loading, error, setCourses } = useCourses();
  const { 
    selectedOptions, handleSelect, handleRemove, 
    replacePrompt, setReplacePrompt, confirmReplace, 
    conflictError, setConflictError, validatingId 
  } = useSelection();
  
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState(330);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const renderSessions = (cls) => {
    if (!cls.sessions || cls.sessions.length === 0) {
      return cls.type === 'HT2' ? "Chưa có tiết cố định" : "Chưa xếp lịch";
    }
    const sessionStrs = cls.sessions.map((s) => {
      if (!s.hasSchedule || !s.day) return cls.type === 'HT2' ? "Chưa có tiết cố định" : "Chưa xếp lịch";
      const roomStr = s.room ? ` (P.${s.room})` : '';
      
      let periodStr = '';
      if (s.periods && s.periods.length > 0) {
        const cleanPeriods = s.periods.map(p => p === 0 ? 10 : p).sort((a, b) => a - b);
        periodStr = `T${cleanPeriods[0]}-${cleanPeriods[cleanPeriods.length - 1]}`;
      }

      const rawDay = parseInt(s.day, 10);
      const validDayObj = DAYS.find(d => d.value === rawDay);
      const dayLabel = validDayObj ? validDayObj.label : `Ngày lỗi (${s.day})`;
      return `${dayLabel} • ${periodStr}${roomStr}`;
    });
    return [...new Set(sessionStrs)].join(', ');
  };

  const checkTimeConflict = (course, cls) => {
    if (!cls.sessions || cls.sessions.length === 0) return false; 
    
    for (const selOpt of selectedOptions) {
      if (selOpt.courseCode === course.code && selOpt.type === cls.type) continue; 
      if (!selOpt.sessions || selOpt.sessions.length === 0) continue;
      
      for (const s1 of cls.sessions) {
        if (!s1.day || !s1.periods || s1.periods.length === 0) continue;
        for (const s2 of selOpt.sessions) {
          if (!s2.day || !s2.periods || s2.periods.length === 0) continue;
          
          if (s1.day === s2.day) {
            const cleanP1 = s1.periods.map(p => p === 0 ? 10 : p);
            const cleanP2 = s2.periods.map(p => p === 0 ? 10 : p);
            const overlap = cleanP1.some(p => cleanP2.includes(p));
            
            if (overlap) return true; 
          }
        }
      }
    }
    return false;
  };

  const toggleExpand = (courseCode) => setCourses(courses.map(c => c.code === courseCode ? { ...c, isExpanded: !c.isExpanded } : c));
  
  const filteredCourses = courses.filter((course) => {
    if (searchTerm.trim() !== '') {
      const queries = searchTerm.toLowerCase().split(/[,;\t\n]+/).map(q => q.trim()).filter(Boolean);
      const isMatch = queries.some(query => {
        const words = query.split(/\s+/).filter(Boolean);
        const matchExact = course.code.toLowerCase().includes(query) || course.name.toLowerCase().includes(query);
        const matchAnd = words.every(word => course.code.toLowerCase().includes(word) || course.name.toLowerCase().includes(word));
        const matchAnyCode = words.some(word => word.length >= 2 && course.code.toLowerCase().includes(word));
        return matchExact || matchAnd || matchAnyCode;
      });
      if (!isMatch) return false;
    }
    
    const courseTypes = [...new Set(course.classes.map(c => c.type))];
    const selectedTypes = selectedOptions.filter(o => o.courseCode === course.code).map(o => o.type);
    
    const isFullySelected = courseTypes.length > 0 && courseTypes.every(t => selectedTypes.includes(t));
    const isPartiallySelected = selectedTypes.length > 0 && !isFullySelected;
    
    if (activeFilter === 'selected') {
      return isFullySelected; 
    } 
    
    if (activeFilter === 'unselected') {
      if (isFullySelected) return false; 
      if (isPartiallySelected) return true; 

      const hasValidPath = course.classes.some(cls => {
        const isLinkedTH = cls.relationshipStatus === 'LINKED_TO_LT';
        if (isLinkedTH) return false; 
        
        if (checkTimeConflict(course, cls)) return false; 
        
        const childClasses = course.classes.filter(c => c.parentLtClassCode === cls.displayCode);
        
        if (childClasses.length === 0) return true; 
        
        const hasValidChild = childClasses.some(child => !checkTimeConflict(course, child));
        return hasValidChild;
      });

      return hasValidPath;
    } 
    
    return true; 
  });

  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (moveEvent) => {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      if (newWidth < 130) setIsCollapsed(true);
      else { setIsCollapsed(false); setSidebarWidth(Math.max(260, Math.min(newWidth, 600))); }
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
  }, [sidebarWidth]);

  const selectedCodesText = selectedOptions.map(o => o.displayCode).join(', ');

  const handleCopy = () => {
    if (!selectedCodesText) return;
    navigator.clipboard.writeText(selectedCodesText).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); 
    });
  };

  return (
    <aside style={{ width: isCollapsed ? '0px' : `${sidebarWidth}px` }} className={`relative h-[calc(100vh-64px-60px)] shrink-0 select-none z-40 ${!isResizing ? 'transition-[width] duration-300 ease-in-out' : ''}`}>
      <div className={`absolute inset-0 bg-[#F5F2FF] flex flex-col overflow-hidden ${isCollapsed ? 'border-r-0' : 'border-r border-[#C7C4D8]'}`}>
        <div style={{ width: `${sidebarWidth}px` }} className="h-full flex flex-col relative">
          
          {replacePrompt && (
            <div className="absolute inset-0 bg-black/40 z-[200] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl p-5 w-full text-[#1B1B24]">
                <h3 className="font-bold text-base mb-2 text-[#3525CD]">Đổi lớp học phần?</h3>
                <p className="text-[13px] text-[#464555] mb-4">Bạn đang chọn lớp <b>{replacePrompt.newOption.displayCode}</b>. Thao tác này sẽ bỏ chọn lớp <b>{replacePrompt.oldOption.displayCode}</b> hiện tại.</p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setReplacePrompt(null)} className="px-4 py-2 text-[12px] font-medium text-[#464555] hover:bg-gray-100 rounded-lg">Hủy</button>
                  <button onClick={confirmReplace} className="px-4 py-2 text-[12px] font-medium text-white bg-[#3525CD] rounded-lg">Đồng ý đổi</button>
                </div>
              </div>
            </div>
          )}
          {conflictError && (
            <div className="absolute inset-0 bg-black/40 z-[200] flex items-center justify-center p-4">
              <div className="bg-white border-l-4 border-[#BA1A1A] rounded-xl shadow-xl p-5 w-full text-[#1B1B24]">
                <h3 className="font-bold text-base mb-2 text-[#BA1A1A]">Không thể chọn</h3>
                <p className="text-[13px] text-[#464555] mb-4 whitespace-pre-wrap">{conflictError}</p>
                <div className="flex justify-end">
                  <button onClick={() => setConflictError(null)} className="px-4 py-2 text-[12px] font-medium text-[#BA1A1A] bg-[#FFF5F4] rounded-lg">Đã hiểu</button>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 pr-6 pb-2 flex flex-col gap-4 shrink-0">
            <h2 className="text-[#3525CD] font-bold text-[18px] whitespace-nowrap">Danh sách học phần</h2>
            <div className="flex flex-col gap-2">
              <div className="bg-white border border-[#C7C4D8] rounded-lg p-2.5 shadow-sm flex items-center relative min-h-[46px]">
                <svg className="w-4 h-4 text-[#A09EB4] shrink-0 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tìm tên hoặc mã môn học..." className="text-[13px] bg-transparent outline-none text-[#1B1B24] placeholder-[#A09EB4] flex-1 min-w-[50px]"/>
              </div>
              <div className="flex justify-end">
                <button onClick={() => setSearchTerm('')} className="flex items-center gap-1 text-[#3525CD] text-[12px] font-medium hover:underline whitespace-nowrap">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  <span>Xóa tất cả</span>
                </button>
              </div>
            </div>

            <div className="bg-[#F0ECF9] p-1 rounded-lg flex items-center text-[13px]">
              <button onClick={() => setActiveFilter('all')} className={`flex-1 py-2 rounded-md font-medium transition-all ${activeFilter === 'all' ? 'bg-white text-[#3525CD] shadow-sm' : 'text-[#464555] hover:text-[#1B1B24]'}`}>Tất cả</button>
              <button onClick={() => setActiveFilter('selected')} className={`flex-1 py-2 rounded-md font-medium transition-all ${activeFilter === 'selected' ? 'bg-white text-[#3525CD] shadow-sm' : 'text-[#464555] hover:text-[#1B1B24]'}`}>Đã chọn</button>
              <button onClick={() => setActiveFilter('unselected')} className={`flex-1 py-2 rounded-md font-medium transition-all ${activeFilter === 'unselected' ? 'bg-white text-[#3525CD] shadow-sm' : 'text-[#464555] hover:text-[#1B1B24]'}`}>Chưa chọn</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-3 px-4 pb-2 mr-1 pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#D6D4E0] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#A09EB4] transition-colors">
            {loading && <div className="text-center text-[13px] text-[#A09EB4] py-10">Đang tải dữ liệu...</div>}
            {error && <div className="text-center text-[13px] text-[#BA1A1A] py-10">{error}</div>}
            
            {!loading && !error && courses.map((course) => (
              <div key={course.code} className={`bg-[#F5F2FF] rounded-xl overflow-hidden shrink-0 ${!filteredCourses.includes(course) ? 'hidden' : ''}`}>
                <div onClick={() => toggleExpand(course.code)} className={`p-3 flex items-center justify-between cursor-pointer border border-[#C7C4D8] transition-colors rounded-xl ${course.isExpanded ? 'bg-[#F5F2FF] rounded-b-none border-b-0' : 'bg-[#F5F2FF] hover:bg-[#EBE7FF]'}`}>
                  <div className="flex-1 pr-2 min-w-0">
                    <h3 className="font-bold text-[15px] text-[#1B1B24] leading-tight break-words">{course.code}: {course.name}</h3>
                    <p className="text-[#464555] text-[12px] font-medium mt-1 truncate">{course.credits} TC • {course.classCount} lớp</p>
                  </div>
                  <svg className={`w-4 h-4 text-[#3525CD] shrink-0 transition-transform ${course.isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                </div>

                {course.isExpanded && course.classes.length > 0 && (
                  <div className="flex flex-col border border-t-0 border-[#C7C4D8] rounded-b-xl overflow-hidden divide-y divide-[#C7C4D8]/50">
                    {course.classes.map((cls) => {
                      const isSelected = selectedOptions.some(o => o.id === cls.id);
                      const isLinkedTH = cls.relationshipStatus === 'LINKED_TO_LT';
                      const hasParentSelected = selectedOptions.some(o => o.displayCode === cls.parentLtClassCode);
                      
                      const disabledByHierarchy = isLinkedTH && !hasParentSelected;
                      const isTimeConflict = !isSelected && checkTimeConflict(course, cls);

                      return (
                        <div key={cls.id} className={`p-3 flex items-center justify-between gap-2 border-b border-[#C7C4D8]/30 ${isSelected ? 'bg-[#F0ECF9]' : 'bg-[#FCF8FF]'}`}>
                          <div className={`flex-1 min-w-0 ${isLinkedTH ? 'pl-5 relative' : ''}`}>
                            {isLinkedTH && <div className="absolute left-1.5 top-0 bottom-1/2 w-3 border-l-2 border-b-2 border-[#C7C4D8]/60 rounded-bl-md" />}
                            
                            <div className="text-[13px] font-bold truncate text-[#1B1B24]">
                              {cls.displayCode}
                              {isLinkedTH && !hasParentSelected && <span className="text-[10px] font-normal text-[#BA1A1A] ml-2 italic">(Cần chọn LT trước)</span>}
                            </div>
                            
                            <div className="text-[11px] text-[#464555] mt-0.5 truncate">
                              {cls.teacherName ? `GV: ${cls.teacherName}` : 'GV: Chưa cập nhật'}
                            </div>

                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 bg-[#E4E1EE] text-[#464555]">{cls.type}</span>
                              <span className="text-[11.5px] font-normal text-[#464555] truncate" title={cls.teacherName ? `GV: ${cls.teacherName}` : ''}>
                                {renderSessions(cls)}
                              </span>
                            </div>
                          </div>

                          {isSelected ? (
                            <button onClick={() => handleRemove(cls.id)} className="shrink-0 px-3 py-1.5 bg-white border border-[#C7C4D8] text-[#BA1A1A] rounded-md text-[12px] font-medium shadow-sm hover:bg-[#FFF5F4] transition-colors">Đã chọn</button>
                          ) : validatingId === cls.id ? (
                            <button disabled className="shrink-0 px-4 py-1.5 bg-gray-400 text-white rounded-md text-[12px] font-medium cursor-not-allowed shadow-sm transition-colors">Đang chọn</button>
                          ) : disabledByHierarchy ? (
                            <button disabled title="Vui lòng chọn lớp LT tương ứng trước." className="shrink-0 px-4 py-1.5 bg-[#E4E1EE] text-[#A09EB4] cursor-not-allowed rounded-md text-[12px] font-medium transition-colors">Chọn</button>
                          ) : isTimeConflict ? (
                            <button disabled title="Trùng lịch với lớp đã chọn trong TKB" className="shrink-0 px-3 py-1.5 bg-[#FFE4E1] text-[#BA1A1A] cursor-not-allowed rounded-md text-[12px] font-medium transition-colors">Trùng lịch</button>
                          ) : (
                            <button onClick={() => handleSelect(course, cls)} className="shrink-0 px-4 py-1.5 bg-[#3525CD] text-white hover:bg-[#2c1eb0] rounded-md text-[12px] font-medium transition-colors shadow-sm">Chọn</button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* KHU VỰC SAO CHÉP & FOOTER BẢN QUYỀN */}
          <div className="p-4 border-t border-[#C7C4D8] bg-[#F5F2FF] shrink-0 flex flex-col gap-2.5 z-10 mr-1">
             <div className="flex items-center justify-between">
               <span className="text-[#3525CD] font-bold text-[13px]">Mã môn học đã chọn:</span>
               <button 
                 onClick={handleCopy}
                 disabled={selectedOptions.length === 0}
                 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-bold transition-colors ${selectedOptions.length === 0 ? 'bg-[#E4E1EE] text-[#A09EB4] cursor-not-allowed' : 'bg-[#E4E1EE] text-[#3525CD] hover:bg-[#D6D4E0] shadow-sm'}`}
               >
                 {copySuccess ? (
                   <>
                     <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                     Đã chép
                   </>
                 ) : (
                   <>
                     <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                     Sao chép
                   </>
                 )}
               </button>
             </div>
             
             <input 
               type="text" 
               readOnly 
               value={selectedCodesText} 
               placeholder="Bạn chưa chọn lớp nào..."
               className="w-full bg-[#EBE7FF] border border-[#C7C4D8] text-[#1B1B24] text-[13px] rounded-lg px-3 py-2 outline-none cursor-default font-mono truncate focus:border-[#3525CD] transition-colors"
               title={selectedCodesText}
             />

             {/* FOOTER ĐÁNH DẤU BẢN QUYỀN */}
             <div className="mt-1.5 text-center text-[#A09EB4] text-[11px] font-medium select-none">
               @2026. Xếp TKB UIT. Được tạo bởi Thanh Thủy
             </div>
          </div>

        </div>
      </div>
      
      {!isCollapsed && (
        <div onMouseDown={startResizing} className="absolute top-0 -right-1.5 w-3 h-full cursor-col-resize flex items-center justify-center z-[100] group hover:bg-[#3525CD]/10 transition-colors">
          <div className="w-[3px] h-[40px] bg-[#8C8A9E] group-hover:bg-[#3525CD] rounded-full transition-colors shadow-sm" />
        </div>
      )}
      
      <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute top-1/2 -right-3.5 -translate-y-1/2 w-7 h-7 bg-white border border-[#C7C4D8] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] flex items-center justify-center z-[101] hover:bg-[#F5F2FF] hover:text-[#3525CD] transition-colors text-[#464555]">
        <svg className={`w-3.5 h-3.5 fill-current transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
      </button>
    </aside>
  );
}