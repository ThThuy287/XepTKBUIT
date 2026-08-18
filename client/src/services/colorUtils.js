// Hash chuỗi Mã môn để xuất ra bộ màu Pastel deterministic (Không bị đổi ngẫu nhiên)
export const getCourseColor = (courseCode) => {
  let hash = 0;
  for (let i = 0; i < courseCode.length; i++) {
    hash = courseCode.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    bg: `hsl(${hue}, 85%, 94%)`,
    border: `hsl(${hue}, 70%, 85%)`,
    text: `hsl(${hue}, 85%, 25%)`
  };
};

// Hàm xé nhỏ session nếu bị đứt quãng hoặc vắt qua Nghỉ Trưa (5->6) / Ngoài giờ (10->11)
export const createChunks = (periods) => {
  if (!periods || periods.length === 0) return [];
  const sorted = [...periods].sort((a,b) => a - b);
  const chunks = [];
  let currentChunk = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const p = sorted[i];
    const prev = currentChunk[currentChunk.length - 1];
    // Ngắt chunk nếu: đứt quãng | nghỉ trưa (5->6) | vắt >10
    if (p !== prev + 1 || (prev === 5 && p === 6) || (prev === 10 && p === 11)) {
       chunks.push(currentChunk);
       currentChunk = [p];
    } else {
       currentChunk.push(p);
    }
  }
  chunks.push(currentChunk);
  return chunks;
};