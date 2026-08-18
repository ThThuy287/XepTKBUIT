import axios from './axios';

export const validateSchedule = async (newOption, currentOptions) => {
  const response = await axios.post('/api/schedules/validate', {
    newOption,
    currentOptions
  });
  return response.data;
};