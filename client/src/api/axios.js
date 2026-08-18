import axios from 'axios';

const instance = axios.create({
  baseURL: 'https://xeptkbuit.onrender.com/api', // Đảm bảo đúng port Backend của bạn
});

export default instance;