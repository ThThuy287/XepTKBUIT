import { useState, useEffect } from 'react';
import { uploadExcel } from '../api/importApi';
import { io } from 'socket.io-client';

export const useImport = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [importId, setImportId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    // SỬA TRỰC TIẾP THÀNH LINK RENDER THAY VÌ DÙNG import.meta.env
    const backendUrl = 'https://xeptkbuit.onrender.com';
    
    const socket = io(backendUrl);
    
    socket.on('import:progress', (data) => {
      if (data.progress !== undefined) setProgress(data.progress);
      if (data.message) setMessage(data.message);
    });
    return () => socket.disconnect();
  }, []);

  const handleUpload = async (selectedFile, onSuccessCallback = null) => {
    if (!selectedFile) return;
    
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      setError('Vui lòng chọn file Excel hợp lệ (.xlsx, .xls)');
      return;
    }
    // FIX: Valid size 10MB
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File quá lớn (>10MB). Hệ thống chỉ cho phép file tối đa 10MB.');
      return;
    }

    setFile(selectedFile);
    setUploading(true);
    setError(null);
    setProgress(0);
    setMessage('Đang chuẩn bị tải lên...');
    setSummary(null);
    setWarnings([]);

    try {
      const data = await uploadExcel(selectedFile);
      if (data.success) {
        setImportId(data.importId);
        setSummary(data.summary);
        setWarnings(data.warnings || []);
        setMessage('Hoàn tất!');
        setProgress(100);
        
        if (onSuccessCallback) {
          onSuccessCallback();
        }
        
        window.dispatchEvent(new CustomEvent('IMPORT_SUCCESS', { detail: data.importId }));
      } else {
        setError(data.message || 'Có lỗi xảy ra từ máy chủ');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Không thể kết nối đến máy chủ');
    } finally {
      setUploading(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setError(null);
    setSummary(null);
    setProgress(0);
    setMessage('');
  };

  return { file, uploading, progress, message, importId, summary, warnings, error, handleUpload, resetState };
};