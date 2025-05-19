// src/utils/fileHelper.ts
/**
 * แปลง URL ไฟล์ให้เข้ากับรูปแบบใหม่ของ GridFS
 * @param {string} filePath - path ที่บันทึกไว้ในฐานข้อมูล
 * @param {string} fileType - ประเภทไฟล์ (cards หรือ music)
 * @returns {string} - URL ที่ถูกต้องสำหรับเข้าถึงไฟล์
 */
export const getFileUrl = (filePath: string, fileType: string = '') => {
  if (!filePath) return '';
  
  // ถ้าเป็น URL ใหม่ที่ชี้ไปที่ GridFS แล้ว (/api/files/...)
  if (filePath.startsWith('/api/files/')) {
    return `${process.env.NEXT_PUBLIC_API_URL}${filePath}`;
  }
  
  // ถ้าเป็น URL เก่าที่ชี้ไปที่ /uploads/...
  if (filePath.startsWith('/uploads/')) {
    // แยกเอาชื่อไฟล์ออกมา
    const filename = filePath.split('/').pop();
    // สร้าง URL ใหม่ที่ชี้ไปที่ GridFS
    if (filePath.includes('/cards/')) {
      return `${process.env.NEXT_PUBLIC_API_URL}/api/files/cards/${filename}`;
    } else if (filePath.includes('/music/')) {
      return `${process.env.NEXT_PUBLIC_API_URL}/api/files/music/${filename}`;
    } else if (fileType) {
      // ถ้าระบุประเภทไฟล์มาด้วย
      return `${process.env.NEXT_PUBLIC_API_URL}/api/files/${fileType}/${filename}`;
    }
  }
  
  // ถ้าเป็น URL เต็มแล้ว (http://, https://)
  if (filePath.startsWith('http')) {
    return filePath;
  }
  
  // กรณีอื่นๆ ส่งคืน URL เดิม
  return `${process.env.NEXT_PUBLIC_API_URL}${filePath}`;
};