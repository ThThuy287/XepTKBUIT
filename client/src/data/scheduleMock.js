// 1. Khung giờ các tiết
export const mockTimeSlots = [
  { period: 1, time: '07:30 - 08:15', isLunch: false, isOutside: false },
  { period: 2, time: '08:15 - 09:00', isLunch: false, isOutside: false },
  { period: 3, time: '09:00 - 09:45', isLunch: false, isOutside: false },
  { period: 4, time: '10:00 - 10:45', isLunch: false, isOutside: false },
  { period: 5, time: '10:45 - 11:30', isLunch: false, isOutside: false },
  { period: 'lunch', label: 'Nghỉ trưa', isLunch: true, isOutside: false },
  { period: 6, time: '13:00 - 13:45', isLunch: false, isOutside: false },
  { period: 7, time: '13:45 - 14:30', isLunch: false, isOutside: false },
  { period: 8, time: '14:30 - 15:15', isLunch: false, isOutside: false },
  { period: 9, time: '15:30 - 16:15', isLunch: false, isOutside: false },
  { period: 10, time: '16:15 - 17:00', isLunch: false, isOutside: false },
  { period: 'outside', label: 'Ngoài giờ', isLunch: false, isOutside: true }
];

// 2. Danh sách môn học hiển thị bên Sidebar (CourseSidebar)
export const mockCourses = [
  {
    code: 'AI002',
    name: 'Tư duy Trí tuệ nhân tạo',
    credits: 3,
    classCount: 5,
    isExpanded: true,
    classes: [
      {
        displayCode: 'AI002.R11',
        type: 'LT',
        day: 2,
        periods: [1, 2, 3],
        timeRange: '07:30 - 09:45',
        dateRange: '15/01 - 15/05',
        room: 'A1.204',
        teacher: 'Nguyễn Văn A',
        status: 'selected'
      },
      {
        displayCode: 'AI002.R21',
        type: 'TH',
        day: 5,
        periods: [6, 7, 8],
        timeRange: '13:00 - 15:15',
        dateRange: '15/01 - 15/05',
        room: 'B2.10',
        teacher: 'Trần Văn B',
        status: 'available'
      },
      {
        displayCode: 'AI002.R31',
        type: 'LT',
        day: 6,
        periods: [1, 2, 3],
        timeRange: '07:30 - 09:45',
        dateRange: '15/01 - 15/05',
        room: 'C316',
        teacher: 'Lê Văn C',
        status: 'conflict'
      }
    ]
  },
  {
    code: 'AI003',
    name: 'Cơ sở dữ liệu',
    credits: 3,
    classCount: 3,
    isExpanded: false,
    classes: []
  },
  {
    code: 'AI004',
    name: 'Học máy',
    credits: 3,
    classCount: 4,
    isExpanded: false,
    classes: [
      {
        displayCode: 'AI004.R02',
        type: 'LT',
        day: 6,
        periods: [1, 2, 3],
        timeRange: '07:30 - 09:45',
        dateRange: '15/01 - 15/05',
        room: 'B2.105',
        teacher: 'Nguyễn Văn E',
        status: 'selected',
        accentColor: '#4ADE80'
      }
    ]
  }
];

// 3. Danh sách môn đã chọn vẽ trên Lưới (ScheduleGrid)
export const mockSelectedBlocks = [
  {
    id: 'block-1',
    courseCode: 'AI002',
    courseName: 'Tư duy Trí tuệ nhân tạo',
    displayCode: 'AI002.R11',
    credits: 3,
    type: 'LT',
    day: 2,
    periods: [1, 2, 3],
    startDate: '15/01/2026',
    endDate: '15/05/2026',
    room: 'A1.204',
    teacher: 'Nguyễn Văn A',
    accentColor: '#3525CD',
    isSelected: false
  },
  {
    id: 'block-2',
    courseCode: 'AI004',
    courseName: 'Học máy',
    displayCode: 'AI004.R02',
    credits: 3,
    type: 'LT',
    day: 6,
    periods: [1, 2],
    startDate: '15/01/2026',
    endDate: '15/05/2026',
    room: 'B2.105',
    teacher: 'Nguyễn Văn E',
    accentColor: '#4ADE80',
    isSelected: true
  },
  {
    id: 'block-3',
    courseCode: 'SE104',
    courseName: 'Nhập môn CNPM',
    displayCode: 'SE104.R12',
    credits: 4,
    type: 'HT1',
    day: 4,
    periods: [11, 12, 13, 14, 15],
    startDate: '20/01/2026',
    endDate: '20/05/2026',
    room: 'B1.14',
    teacher: 'Phạm Thị D',
    accentColor: '#F97316',
    isSelected: false
  },
  {
    id: 'block-4',
    courseCode: 'IS201',
    courseName: 'Phân tích thiết kế HTTT',
    displayCode: 'IS201.R11.2',
    credits: 3,
    type: 'HT2',
    day: null,
    periods: [],
    startDate: '15/01/2026',
    endDate: '15/05/2026',
    room: '',
    teacher: 'Lê Văn C',
    accentColor: '#EAB308',
    isSelected: false
  }
];