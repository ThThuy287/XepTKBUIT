import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:5000', // Đảm bảo đúng port Backend của bạn
});

export default instance;