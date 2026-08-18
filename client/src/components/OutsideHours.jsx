import React from 'react';
import ScheduleBlock from './ScheduleBlock';
import { createChunks } from '../services/colorUtils';

export default function OutsideHours({ options }) {
  const outsideItems = [];

  options.forEach(opt => {
    // 1. Lọc HT2 không có lịch
    if (opt.type === 'HT2' && (!opt.sessions || opt.sessions.length === 0)) {
      outsideItems.push({ option: opt, chunk: null, day: null, room: null });
      return;
    }
    // 2. Lọc Tiết > 10 (Hoặc bị split mảng)
    (opt.sessions || []).forEach(sess => {
      const chunks = createChunks(sess.periods);
      chunks.forEach(chunk => {
        if (chunk[0] > 10) outsideItems.push({ option: opt, chunk, day: sess.day, room: sess.room });
      });
    });
  });

  if (outsideItems.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 mt-6 overflow-hidden flex flex-col">
      <div className="bg-slate-700 text-white font-bold px-4 py-3 text-sm flex items-center gap-2 shadow-sm">
        <span>🌙</span> NGOÀI GIỜ / LỊCH LINH ĐỘNG (HT2, Tiết 11-15)
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 bg-slate-50 border-t">
        {outsideItems.map((item, idx) => (
          <ScheduleBlock key={idx} option={item.option} chunk={item.chunk} day={item.day} room={item.room} isOutside={true} />
        ))}
      </div>
    </div>
  );
}