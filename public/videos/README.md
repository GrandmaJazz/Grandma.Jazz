# Video Files

## Current Issue: Safari WebM Support

Safari บน iOS รองรับ WebM ตั้งแต่เวอร์ชัน 17.4+ แต่อาจมีปัญหาในบางกรณี

### แนะนำ: แปลงเป็น MP4

สำหรับความเข้ากันได้ที่ดีที่สุดบน iOS Safari ควรมีไฟล์ MP4 ด้วย

```bash
# ใช้ ffmpeg แปลงไฟล์
ffmpeg -i Safarionly.webm -c:v libx264 -preset slow -crf 22 -c:a aac -b:a 128k Safarionly.mp4
```

### หรือใช้ Online Converter
- CloudConvert: https://cloudconvert.com/webm-to-mp4
- FreeConvert: https://www.freeconvert.com/webm-to-mp4

หลังจากแปลงแล้ว ใส่ไฟล์ `Safarionly.mp4` ในโฟลเดอร์นี้
