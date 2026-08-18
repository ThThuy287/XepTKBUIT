import axios from 'axios';

// SỬA Ở ĐÂY: Đường link gốc chỉ dừng lại ở chữ /api
const API_URL = import.meta.env.VITE_API_URL || 'https://xeptkbuit.onrender.com/api';

// BẮT BUỘC phải có chữ "export" ở đây nhé:
export const uploadExcel = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  // Khi ghép với /import/xlsx sẽ ra link chuẩn xác 100%: .../api/import/xlsx
  const response = await axios.post(`${API_URL}/import/xlsx`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};