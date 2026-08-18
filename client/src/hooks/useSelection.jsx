import React, { createContext, useContext, useState } from 'react';

const SelectionContext = createContext();

export const SelectionProvider = ({ children }) => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [replacePrompt, setReplacePrompt] = useState(null); 
  const [validatingId, setValidatingId] = useState(null);
  const [conflictError, setConflictError] = useState(null); 
  const [globalStatus, setGlobalStatus] = useState('VALID');
  const [history, setHistory] = useState([]); 

  const handleSelect = async (course, option) => {
    const newOpt = { ...option, courseId: course.id, courseCode: course.code, courseName: course.name, courseCredits: course.credits };
    const existingSameType = selectedOptions.find(o => o.courseCode === course.code && o.type === option.type);
    if (existingSameType) {
      setReplacePrompt({ oldOption: existingSameType, newOption: newOpt });
      return;
    }
    await validateAndCommit(newOpt, selectedOptions);
  };

  const confirmReplace = async () => {
    if (!replacePrompt) return;
    const oldOption = replacePrompt.oldOption;
    let listWithoutOld = selectedOptions.filter(o => o.id !== oldOption.id);
    if (oldOption.type === 'LT') {
      listWithoutOld = listWithoutOld.filter(o => o.parentLtClassCode !== oldOption.displayCode);
    }
    await validateAndCommit(replacePrompt.newOption, listWithoutOld);
    setReplacePrompt(null);
  };

  const validateAndCommit = async (newOption, currentList) => {
    setValidatingId(newOption.id);
    setTimeout(() => {
        setHistory(prev => [...prev, selectedOptions]); 
        setSelectedOptions([...currentList, newOption]);
        setGlobalStatus('VALID');
        setValidatingId(null);
    }, 100); 
  };

  const handleRemove = (optionId) => {
    setHistory(prev => [...prev, selectedOptions]);
    const optionToRemove = selectedOptions.find(o => o.id === optionId);
    let newList = selectedOptions.filter(o => o.id !== optionId);
    if (optionToRemove && optionToRemove.type === 'LT') {
      newList = newList.filter(o => o.parentLtClassCode !== optionToRemove.displayCode);
    }
    setSelectedOptions(newList);
    setGlobalStatus('VALID');
  };

  const clearAll = () => {
    if (selectedOptions.length === 0) return;
    setHistory(prev => [...prev, selectedOptions]); 
    setSelectedOptions([]);
    setGlobalStatus('VALID');
  };

  const undo = () => {
    if (history.length === 0) return;
    const prevState = history[history.length - 1];
    setSelectedOptions(prevState);
    setHistory(prev => prev.slice(0, -1)); 
    setGlobalStatus('VALID');
  };

  // ===============================================
  // HÀM MỚI: HARD RESET KHI UPLOAD FILE EXCEL MỚI
  // ===============================================
  const resetSelection = () => {
    setSelectedOptions([]); // Xóa sạch bảng TKB
    setHistory([]); // Phải xóa cả lịch sử hoàn tác để chống bug gọi hồn môn cũ
    setConflictError(null);
    setReplacePrompt(null);
    setGlobalStatus('VALID');
  };

  return (
    <SelectionContext.Provider value={{
      selectedOptions, handleSelect, handleRemove, clearAll, undo, history,
      replacePrompt, setReplacePrompt, confirmReplace,
      conflictError, setConflictError, validatingId, globalStatus,
      resetSelection // Xuất hàm ra ngoài để tái sử dụng
    }}>
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = () => useContext(SelectionContext);