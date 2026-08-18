import { DAYS } from '../constants/days';

const COLORS = ['#3525CD', '#4ADE80', '#F97316', '#EAB308', '#EC4899', '#8B5CF6', '#14B8A6'];
const getDeterministicColor = (code) => {
  if (!code) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
};

export const mapSelectedOptionsToBlocks = (selectedOptions) => {
  const blocks = [];
  
  selectedOptions.forEach(option => {
    const baseInfo = {
      id: option.id || option._id,
      courseId: option.courseId,
      courseCode: option.courseCode,
      courseName: option.courseName,
      displayCode: option.displayCode,
      teacher: option.teacherName,
      credits: option.courseCredits || option.credits,
      type: option.type,
      accentColor: getDeterministicColor(option.courseCode),
      isSelected: true
    };

    if (!option.sessions || option.sessions.length === 0) {
      blocks.push({ ...baseInfo, isOutside: true, day: null, periods: [] });
      return;
    }

    option.sessions.forEach((session, sIdx) => {
      const rawDay = parseInt(session.day, 10);
      const dayIndex = DAYS.findIndex(d => d.value === rawDay);

      if (dayIndex === -1 || !session.hasSchedule) {
        blocks.push({ ...baseInfo, blockId: `${baseInfo.id}-${sIdx}-out`, day: rawDay, periods: session.periods || [], room: session.room, startDate: session.startDate, endDate: session.endDate, isOutside: true });
        return;
      }

      if (!session.periods || session.periods.length === 0) return;
      
      const mainPeriods = [];
      const outsidePeriods = [];
      session.periods.forEach(p => {
        let pNum = parseInt(p, 10);
        if (pNum === 0) pNum = 10; // SAFEGUARD: Ép tiết 0 thành tiết 10
        if (pNum >= 1 && pNum <= 10) mainPeriods.push(pNum);
        else outsidePeriods.push(pNum);
      });

      if (mainPeriods.length > 0) {
        blocks.push({ ...baseInfo, blockId: `${baseInfo.id}-${sIdx}-main`, day: rawDay, periods: mainPeriods.sort((a,b)=>a-b), room: session.room, startDate: session.startDate, endDate: session.endDate, isOutside: false });
      }
      if (outsidePeriods.length > 0) {
        blocks.push({ ...baseInfo, blockId: `${baseInfo.id}-${sIdx}-out`, day: rawDay, periods: outsidePeriods.sort((a,b)=>a-b), room: session.room, startDate: session.startDate, endDate: session.endDate, isOutside: true });
      }
    });
  });

  return blocks;
};