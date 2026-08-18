import axios from './axios';

export const getCoursesByImportId = async (importId) => {
  const response = await axios.get(`/api/courses?importId=${importId}`);
  return response.data;
};