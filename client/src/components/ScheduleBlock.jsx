import React from 'react';
import { PERIOD_TIMES } from '../constants/periods';
import { DAYS } from '../constants/days';
import { useSelection } from '../hooks/useSelection';

export default function ScheduleBlock({ block }) {
  const { handleRemove } = useSelection();

  const getRowStart = (period) => {
    if (period <= 5) return period;
    if (period >= 6 && period <= 10) return period + 1; 
    return 12; 
  };

  // SAFEGUARD: Ép tiết 0 thành tiết 10 để lưới vẽ đúng
  const sortedPeriods = [...block.periods].map(p => p === 0 ? 10 : p).sort((a, b) => a - b);
  const firstPeriod = sortedPeriods[0];
  const lastPeriod = sortedPeriods[sortedPeriods.length - 1];

  const rowStart = block.overrideRow || (sortedPeriods.length > 0 ? getRowStart(firstPeriod) : 12);
  const rowEnd = block.overrideRow ? rowStart + 1 : (sortedPeriods.length > 0 ? getRowStart(lastPeriod) + 1 : 13);
  
  const dayIndex = DAYS.findIndex(d => d.value === block.day);
  const colStart = block.overrideCol || (dayIndex !== -1 ? dayIndex + 2 : 2);

  const validDayObj = DAYS.find(d => d.value === parseInt(block.day, 10));
  const dayLabel = validDayObj ? validDayObj.label : (block.day ? `Ngoài giờ (${block.day})` : 'Không có');
  
  const startTime = firstPeriod ? PERIOD_TIMES[firstPeriod]?.start : '';
  const endTime = lastPeriod ? PERIOD_TIMES[lastPeriod]?.end : '';
  const timeString = startTime && endTime ? `${startTime} - ${endTime}` : 'Không xác định';

  const tooltipText = `Môn: ${block.courseName} (${block.courseCode})
Lớp: ${block.displayCode} | Loại: ${block.type}
Giáo viên: ${block.teacher || 'Chưa cập nhật'}
Phòng: ${block.room || 'Chưa cập nhật'}
Thứ: ${dayLabel} | Tiết: ${sortedPeriods.join(', ') || 'Không có'}
Giờ học: ${timeString}
Bắt đầu: ${block.startDate || 'Không rõ'} | Kết thúc: ${block.endDate || 'Không rõ'}
Tín chỉ: ${block.credits}`;

  return (
    <div
      title={tooltipText}
      className="relative group rounded-md p-2 shadow-sm text-left flex flex-col overflow-hidden border m-[2px] cursor-pointer hover:shadow-md transition-shadow"
      style={{
        gridColumnStart: colStart,
        gridRowStart: rowStart,
        gridRowEnd: rowEnd,
        backgroundColor: `${block.accentColor}15`,
        borderColor: `${block.accentColor}40`,
        borderLeftWidth: '3px',
        borderLeftColor: block.accentColor,
        zIndex: 10
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleRemove(block.id);
        }}
        className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-white/70 text-[#8C8A9E] opacity-0 group-hover:opacity-100 hover:!bg-[#FFE4E1] hover:!text-[#BA1A1A] transition-all z-20 shadow-sm backdrop-blur-sm"
        title="Xóa môn học này"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex-1 flex flex-col min-h-0 gap-0.5 pr-4">
        <div className="font-bold text-[11.5px] leading-tight text-[#1B1B24] line-clamp-2">
          {block.courseName}
        </div>
        <div className="text-[10.5px] font-bold mt-0.5" style={{ color: block.accentColor }}>
          {block.displayCode}
        </div>
        <div className="text-[10px] text-[#464555] truncate">
          {block.teacher ? `GV: ${block.teacher}` : 'GV: Chưa cập nhật'}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[9px] font-bold px-1.5 py-[2px] rounded-[4px] bg-white/70 text-[#464555] shadow-sm">
            {block.type}
          </span>
          <span className="text-[9.5px] text-[#464555] font-semibold">
            {block.credits} TC
          </span>
        </div>
      </div>

      {!block.isOutside && block.room && (
        <div className="text-[10px] font-bold text-[#464555] mt-auto pt-1 truncate pr-4">
          P.{block.room}
        </div>
      )}
      {block.isOutside && (
        <div className="text-[10px] italic font-medium text-[#8C8A9E] mt-auto pt-1 truncate pr-4">
          {block.hasSchedule === false || !block.periods || block.periods.length === 0
            ? 'Chưa có tiết cố định'
            : `Tiết ${block.periods.length > 1 ? `${block.periods[0]}-${block.periods[block.periods.length - 1]}` : block.periods[0]}`
          }
        </div>
      )}
    </div>
  );
}