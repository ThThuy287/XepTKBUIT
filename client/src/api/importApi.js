import axios from 'axios';

// Ưu tiên biến môi trường của Vercel, nếu không có thì trỏ thẳng lên Render
const API_URL = import.meta.env.VITE_API_URL || 'https://xeptkbuit.onrender.com/api';

// Ví dụ hàm gọi API lấy môn học của bạn sẽ sửa thành thế này:
export const fetchCourses = async (importId) => {
  const response = await axios.get(`${API_URL}/courses`, {
    params: { importId }
  });
  return response.data;
};