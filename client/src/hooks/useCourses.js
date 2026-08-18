import { useState, useEffect } from 'react';
import { getCoursesByImportId } from '../api/courseApi';

export const useCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCourses = async (importId) => {
      console.log("=== DATA FLOW DEBUG ===");
      console.log("1. IMPORT ID:", importId);
      
      setLoading(true);
      setError(null);
      
      try {
        const res = await getCoursesByImportId(importId);
        console.log("2. COURSES API RESPONSE:", res);

        let coursesData = null;
        if (Array.isArray(res)) coursesData = res;
        else if (res && Array.isArray(res.data)) coursesData = res.data;
        else if (res && Array.isArray(res.courses)) coursesData = res.courses;

        if (coursesData) {
          const mappedCourses = coursesData.map(course => {
            const classes = [];
            if (course.offerings && Array.isArray(course.offerings)) {
              course.offerings.forEach(offering => {
                const options = offering.classOptions || offering.options || [];
                options.forEach(opt => {
                  let parsedSessions = [];
                  try {
                    parsedSessions = typeof opt.sessions === 'string' ? JSON.parse(opt.sessions) : (opt.sessions || []);
                  } catch (e) {
                    console.error(`Error parsing sessions for ${opt.displayCode}`);
                  }
                  // TRONG HOOK useCourses, TẠI ĐOẠN MAP DỮ LIỆU classes.push(...):
                  classes.push({
                    id: opt.id,
                    displayCode: opt.displayCode,
                    type: opt.type || offering.type,
                    teacherName: opt.teacherName,
                    sessions: parsedSessions,
                    status: 'available',
                    // ĐỌC THÊM CÁC TRƯỜNG RELATION
                    parentLtClassCode: opt.parentLtClassCode,
                    relationshipStatus: opt.relationshipStatus
                  });

// SAU KHI PUSH ĐỦ CLASSES CHO 1 COURSE, THÊM ĐOẠN SORT NÀY TRƯỚC KHI RETURN:
            classes.sort((a, b) => {
              // Lấy mã gốc để gom nhóm (Nếu là LT thì lấy chính nó, nếu là TH thì lấy mã Cha)
              const groupA = a.relationshipStatus === 'LINKED_TO_LT' ? a.parentLtClassCode : a.displayCode;
              const groupB = b.relationshipStatus === 'LINKED_TO_LT' ? b.parentLtClassCode : b.displayCode;
              
              if (groupA !== groupB) return groupA.localeCompare(groupB);
              
              // Cùng nhóm (Cha - Con): Ép LT lên đứng đầu
              if (a.type === 'LT' && b.type !== 'LT') return -1;
              if (a.type !== 'LT' && b.type === 'LT') return 1;
              
              // Cùng loại thì xếp theo tên
              return a.displayCode.localeCompare(b.displayCode);
            });
                });
              });
            }
            return {
              id: course.id,
              code: course.code,
              name: course.name,
              credits: course.credits,
              classCount: classes.length,
              isExpanded: false,
              classes: classes
            };
          });
          setCourses(mappedCourses);
        } else {
          console.error("3. DATA CONTRACT MISMATCH - Expected Array, got:", res);
        }
      } catch (err) {
        console.error("3. API ERROR:", err);
        setError(err.response?.data?.message || err.message || 'Lỗi tải danh sách môn học.');
      } finally {
        setLoading(false);
      }
    };

    const handleImportSuccess = (event) => {
      if (event.detail) loadCourses(event.detail);
    };

    window.addEventListener('IMPORT_SUCCESS', handleImportSuccess);
    return () => window.removeEventListener('IMPORT_SUCCESS', handleImportSuccess);
  }, []);

  return { courses, loading, error, setCourses };
};