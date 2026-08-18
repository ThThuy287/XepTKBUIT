import React, { useRef } from 'react';
import { useImport } from '../hooks/useImport';
import { useSelection } from '../hooks/useSelection';

export default function TopNavBar() {
  const fileInputRef = useRef(null);
  const { file, uploading, progress, message, summary, error, handleUpload, resetState } = useImport();
  
  // Lấy hàm reset từ hook useSelection
  const { resetSelection } = useSelection();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // TRUYỀN HÀM RESET VÀO ĐỂ CHẠY SAU KHI UPLOAD THÀNH CÔNG
      handleUpload(selectedFile, () => {
        resetSelection();
      });
    }
    e.target.value = null;
  };

  return (
    <header className="w-full h-16 bg-[#FCF8FF] border-b border-[#C7C4D8] px-6 flex items-center justify-between z-10 relative">
      <h1 className="font-bold text-2xl tracking-tight text-[#3525CD]">
        Xếp TKB UIT
      </h1>
      
      <div className="flex items-center gap-4 relative">
        {(uploading || summary || error) && (
          <div className="flex items-center gap-3 bg-white border border-[#C7C4D8]/50 shadow-sm rounded-lg px-3 py-1.5 absolute right-[105%] top-1/2 -translate-y-1/2 whitespace-nowrap">
            
            {uploading && (
               <div className="flex items-center gap-2">
                 <svg className="animate-spin w-4 h-4 text-[#3525CD]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 <div className="flex flex-col min-w-[140px]">
                    <span className="text-[11px] text-[#464555] font-medium">{message || 'Đang xử lý...'}</span>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1 relative">
                       <div className="absolute left-0 top-0 h-full bg-[#3525CD] transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                 </div>
               </div>
            )}
            
            {!uploading && error && (
               <div className="flex items-center gap-2 text-[#BA1A1A]">
                 <span className="text-base">❌</span>
                 <span className="text-[12px] font-medium">Lỗi: {error}</span>
                 <button onClick={resetState} className="ml-2 hover:bg-[#FFF5F4] p-1 rounded-full text-[#BA1A1A]">
                   <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                 </button>
               </div>
            )}

            {!uploading && summary && !error && (
               <div className="flex items-center gap-3">
                 <span className="text-base">✅</span>
                 <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-[#1B1B24]">{file?.name}</span>
                    <span className="text-[11px] text-[#464555]">
  {summary.courses || 0} môn • {summary.options || 0} lớp (LT: {summary.lt || 0}, HT1: {summary.ht1 || 0}, HT2: {summary.ht2 || 0})
</span>
                 </div>
                 <button onClick={resetState} className="ml-2 hover:bg-gray-100 p-1 rounded-full text-[#A09EB4]">
                   <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                 </button>
               </div>
            )}
          </div>
        )}

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".xlsx,.xls" 
          className="hidden" 
        />
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow-sm transition-colors ${
            uploading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#3525CD] text-white hover:bg-[#2c1eb0]'
          }`}
        >
          {uploading ? (
            <svg className="animate-spin w-5 h-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          ) : (
            <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
          )}
          <span>{uploading ? 'Đang tải lên...' : 'Tải lên Excel'}</span>
        </button>
      </div>
    </header>
  );
}