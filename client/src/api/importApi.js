import axios from 'axios';

// Ưu tiên lấy từ biến môi trường Vercel, nếu không có sẽ tự trỏ về link Render sản phẩm
const API_URL = import.meta.env.VITE_API_URL || 'https://xeptkbuit.onrender.com/api';

export const uploadExcel = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await axios.post(`${API_URL}/import/xlsx`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};