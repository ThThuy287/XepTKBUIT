exports.checkConflict = (newOption, currentOptions) => {
  for (const current of currentOptions) {
    // Không check trùng với chính môn đó & cùng loại (vì frontend đã xử lý Replace)
    if (current.courseId === newOption.courseId && current.type === newOption.type) {
      continue;
    }

    for (const newSess of newOption.sessions) {
      for (const currSess of current.sessions) {
        // Nếu HT2 hoặc lớp nào đó không có lịch -> Không bao giờ conflict thời gian
        if (!newSess.day || !currSess.day || newSess.periods.length === 0 || currSess.periods.length === 0) {
          continue;
        }

        // Kiểm tra trùng Ngày và có Tiết giao nhau
        if (newSess.day === currSess.day) {
          const overlap = newSess.periods.filter(p => currSess.periods.includes(p));
          if (overlap.length > 0) {
            // (Tương lai có thể check thêm weekPhase ở đây)
            return {
              conflict: true,
              details: {
                day: newSess.day,
                overlappingPeriods: overlap,
                optionA: { code: current.courseCode, display: current.displayCode },
                optionB: { code: newOption.courseCode, display: newOption.displayCode }
              }
            };
          }
        }
      }
    }
  }
  return { conflict: false };
};