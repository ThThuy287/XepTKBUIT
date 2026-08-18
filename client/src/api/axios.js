import axios from 'axios';

const instance = axios.create({
  // Sử dụng biến môi trường, nếu không có thì mặc định dùng URL của Render
  baseURL: process.env.REACT_APP_API_URL || 'https://xeptkbuit.onrender.com/api',
  timeout: 30000, // Cài đặt thời gian chờ 30 giây để phòng hờ backend Render khởi động chậm
});

export default instance;