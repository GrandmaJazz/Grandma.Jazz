// src/utils/fileHelper.ts
/**
 * แปลง URL ไฟล์ให้เข้ากับรูปแบบใหม่ของ AWS S3
 * @param {string} filePath - path ที่บันทึกไว้ในฐานข้อมูล
 * @param {string} fileType - ประเภทไฟล์ (cards หรือ music) - ไม่จำเป็นสำหรับ S3
 * @returns {string} - URL ที่ถูกต้องสำหรับเข้าถึงไฟล์
 */
export const getFileUrl = (filePath: string, fileType = '') => {
  if (!filePath) return '';
  
  // ถ้าเป็น S3 URL แล้ว (https://bucket.s3.region.amazonaws.com/...)
  if (filePath.startsWith('https://') && filePath.includes('.s3.') && filePath.includes('.amazonaws.com')) {
    return filePath;
  }
  
  // ถ้าเป็น HTTP/HTTPS URL เต็มแล้ว
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  
  // ถ้าเป็น URL ใหม่ที่ชี้ไปที่ GridFS (/api/files/...)
  if (filePath.startsWith('/api/files/')) {
    return `${process.env.NEXT_PUBLIC_API_URL}${filePath}`;
  }
  
  // ถ้าเป็น URL เก่าที่ชี้ไปที่ /uploads/...
  if (filePath.startsWith('/uploads/')) {
    // แยกเอาชื่อไฟล์ออกมา
    const filename = filePath.split('/').pop();
    // สร้าง URL ใหม่ที่ชี้ไปที่ GridFS (สำหรับไฟล์เก่า)
    if (filePath.includes('/cards/')) {
      return `${process.env.NEXT_PUBLIC_API_URL}/api/files/cards/${filename}`;
    } else if (filePath.includes('/music/')) {
      return `${process.env.NEXT_PUBLIC_API_URL}/api/files/music/${filename}`;
    } else if (fileType) {
      // ถ้าระบุประเภทไฟล์มาด้วย
      return `${process.env.NEXT_PUBLIC_API_URL}/api/files/${fileType}/${filename}`;
    }
  }
  
  // กรณีอื่นๆ ส่งคืน URL เดิม (สำหรับ path ที่ขึ้นต้นด้วย /)
  return `${process.env.NEXT_PUBLIC_API_URL}${filePath}`;
};

/**
 * PERF: route a remote image through Next.js's image optimizer so it is served
 * as AVIF/WebP from the Vercel edge instead of the raw file straight out of S3
 * (ap-southeast-2).
 *
 * IMPORTANT — this does NOT downscale. Next only ever resizes DOWN, never up,
 * so asking for a width larger than the source (default 1920) returns the image
 * at its original pixel dimensions, just in a modern codec. Measured on a real
 * album cover: 1254x1254 PNG = 583 KB  ->  1254x1254 AVIF q90 = 18 KB.
 *
 * Only hosts listed in next.config.js `images.remotePatterns` can be optimized;
 * anything else is returned untouched.
 */
const OPTIMIZABLE_HOSTS = [
  'grandma-jazz-uploads.s3.ap-southeast-2.amazonaws.com',
  'images.unsplash.com',
  'source.unsplash.com',
  'ext.same-assets.com',
  'ugc.same-assets.com',
];

export const getOptimizedImageUrl = (
  filePath: string,
  { width = 1920, quality = 90 }: { width?: number; quality?: number } = {}
) => {
  const url = getFileUrl(filePath);
  if (!url) return '';

  // Only absolute URLs on optimizable hosts go through /_next/image.
  const isOptimizable =
    url.startsWith('https://') && OPTIMIZABLE_HOSTS.some(h => url.includes(h));
  if (!isOptimizable) return url;

  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`;
};
