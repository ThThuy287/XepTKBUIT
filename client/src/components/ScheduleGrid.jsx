import React from 'react';
import ScheduleBlock from './ScheduleBlock';
import { useSelection } from '../hooks/useSelection';
import { mapSelectedOptionsToBlocks } from '../services/scheduleMapper';
import { mockTimeSlots } from '../data/scheduleMock';
import { DAYS } from '../constants/days'; 

export default function ScheduleGrid() {
  const { selectedOptions } = useSelection();
  const activeBlocks = mapSelectedOptionsToBlocks(selectedOptions);

  const BORDER = "border-[#E5E4EC]";

  const mainBlocks = activeBlocks.filter(b => !b.isOutside);
  const outsideBlocks = activeBlocks.filter(b => b.isOutside);

  return (
    <div className="flex-1 h-[calc(100vh-64px-60px)] p-4 lg:p-6 bg-[#FCF8FF] overflow-hidden flex flex-col items-center select-none">
      
      {/* VỎ NGOÀI CÙNG CỦA BẢNG TKB */}
      <div id="schedule-grid-export" className={`bg-white border ${BORDER} rounded-2xl shadow-sm overflow-hidden flex flex-col w-full h-full max-w-[1400px]`}>
        
        {/* HEADER */}
        <div className={`grid grid-cols-[130px_repeat(6,_1fr)] bg-[#F5F2FF] border-b ${BORDER} h-[40px] lg:h-[49px] shrink-0 text-center`}>
          <div className={`flex items-center justify-center border-r ${BORDER} text-[#464555]`}>
            <svg className="w-4 h-4 lg:w-5 lg:h-5 text-[#464555]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          {DAYS.map((day, idx) => (
            <div key={day.value} className={`flex items-center justify-center font-bold text-[13px] lg:text-[14px] text-[#1B1B24] ${idx < DAYS.length - 1 ? `border-r ${BORDER}` : ''}`}>
              {day.label}
            </div>
          ))}
        </div>

        {/* PHẦN RUỘT BẢNG TKB: THÊM ID ĐỂ ĐIỀU KHIỂN ẨN THANH CUỘN KHI XUẤT ẢNH */}
        <div
          id="schedule-grid-body" 
          className="flex-1 grid grid-cols-[130px_repeat(6,_1fr)] relative bg-white overflow-y-auto"
          style={{ gridTemplateRows: 'repeat(11, minmax(0, 1fr)) minmax(0, 2.5fr)' }}
        >
          {mockTimeSlots.map((slot, rowIndex) => {
            const isLastRow = rowIndex === mockTimeSlots.length - 1;
            const borderB = isLastRow ? '' : `border-b ${BORDER}`;
            const borderR = `border-r ${BORDER}`;
            const cssRow = rowIndex + 1;

            if (slot.isLunch || slot.isOutside) {
              return (
                <React.Fragment key={`row-${rowIndex}`}>
                  <div className={`bg-[#FAFAFF] ${borderR} ${borderB} flex flex-col items-center justify-center text-[11px] lg:text-[12px] font-semibold text-[#464555] p-1`} style={{ gridColumn: 1, gridRow: cssRow }}>
                    {slot.label}
                  </div>
                  
                  <div 
                    className={`${slot.isLunch ? 'bg-[#FAFAFF] text-[#8C8A9E] italic flex items-center justify-center text-[12px]' : 'bg-white p-2 flex flex-wrap content-start gap-2 overflow-y-auto'} ${borderB}`} 
                    style={{ gridColumn: '2 / -1', gridRow: cssRow }}
                  >
                    {slot.isLunch ? 'Nghỉ trưa' : ''}
                    
                    {slot.isOutside && outsideBlocks.map((block, idx) => (
                      <div key={`${block.id}-out-${idx}`} className="w-[220px] shrink-0">
                        <ScheduleBlock block={block} />
                      </div>
                    ))}
                  </div>
                </React.Fragment>
              );
            }

            return (
              <React.Fragment key={`slot-${slot.period}`}>
                <div className={`bg-[#FAFAFF] ${borderR} ${borderB} p-1 flex flex-col justify-center items-center text-center`} style={{ gridColumn: 1, gridRow: cssRow }}>
                  <span className="text-[12px] lg:text-[13px] font-bold text-[#1B1B24]">Tiết {slot.period}</span>
                  <span className="text-[10px] lg:text-[11px] text-[#6B7280]">{slot.time}</span>
                </div>

                {DAYS.map((day, idx) => {
                  const isLastCol = idx === DAYS.length - 1;
                  return (
                    <div
                      key={`${day.value}-${slot.period}`}
                      className={`relative ${borderB} ${isLastCol ? '' : borderR} bg-white`}
                      style={{ gridColumn: idx + 2, gridRow: cssRow }}
                    />
                  );
                })}
              </React.Fragment>
            );
          })}

          {mainBlocks.map((block, idx) => (
            <ScheduleBlock key={`${block.id}-main-${idx}`} block={block} />
          ))}
        </div>
      </div>
    </div>
  );
}