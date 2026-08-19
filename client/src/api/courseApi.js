import axios from './axios';

export const getCoursesByImportId = async (importId) => {
  const response = await axios.get(`/courses?importId=${importId}`);
  return response.data;
};